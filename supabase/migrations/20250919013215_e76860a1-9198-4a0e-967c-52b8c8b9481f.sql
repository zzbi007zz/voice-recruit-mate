-- Create candidates table
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  position TEXT,
  experience TEXT,
  skills TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID
);

-- Enable RLS for candidates
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create policy for candidates (development mode)
CREATE POLICY "Allow all operations on candidates (development)" 
ON public.candidates 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update job_applications table to reference candidates table
ALTER TABLE public.job_applications 
ADD COLUMN candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE;

-- Add salary and status fields to job_applications for better tracking
ALTER TABLE public.job_applications 
ADD COLUMN salary_offered TEXT,
ADD COLUMN interview_feedback TEXT,
ADD COLUMN final_status TEXT DEFAULT 'pending';

-- Create trigger for candidates updated_at
CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_candidates_email ON public.candidates(email);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_job_applications_candidate_id ON public.job_applications(candidate_id);