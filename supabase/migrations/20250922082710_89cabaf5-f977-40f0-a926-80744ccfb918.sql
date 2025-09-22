-- Create interviews table
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_phone TEXT NOT NULL,
  recruiter_id UUID NOT NULL,
  role TEXT,
  language TEXT NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'calling', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  score_summary JSONB,
  consent BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transcripts table
CREATE TABLE public.transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id),
  audio_segment_id TEXT,
  text TEXT NOT NULL,
  wpm NUMERIC,
  filler_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_sessions table for tracking Twilio calls
CREATE TABLE public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id),
  call_sid TEXT NOT NULL,
  twilio_from TEXT,
  twilio_to TEXT,
  direction TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for interviews
CREATE POLICY "Users can view their own interviews" 
ON public.interviews 
FOR SELECT 
USING (auth.uid()::text = recruiter_id::text);

CREATE POLICY "Users can create their own interviews" 
ON public.interviews 
FOR INSERT 
WITH CHECK (auth.uid()::text = recruiter_id::text);

CREATE POLICY "Users can update their own interviews" 
ON public.interviews 
FOR UPDATE 
USING (auth.uid()::text = recruiter_id::text);

-- Create policies for transcripts
CREATE POLICY "Users can view transcripts of their interviews" 
ON public.transcripts 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = transcripts.interview_id 
  AND auth.uid()::text = interviews.recruiter_id::text
));

CREATE POLICY "Allow insert transcripts for interviews" 
ON public.transcripts 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = transcripts.interview_id 
  AND auth.uid()::text = interviews.recruiter_id::text
));

-- Create policies for call_sessions
CREATE POLICY "Users can view call sessions of their interviews" 
ON public.call_sessions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = call_sessions.interview_id 
  AND auth.uid()::text = interviews.recruiter_id::text
));

CREATE POLICY "Allow insert call sessions for interviews" 
ON public.call_sessions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = call_sessions.interview_id 
  AND auth.uid()::text = interviews.recruiter_id::text
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_sessions_updated_at
BEFORE UPDATE ON public.call_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_interviews_recruiter_id ON public.interviews(recruiter_id);
CREATE INDEX idx_interviews_status ON public.interviews(status);
CREATE INDEX idx_transcripts_interview_id ON public.transcripts(interview_id);
CREATE INDEX idx_call_sessions_interview_id ON public.call_sessions(interview_id);
CREATE INDEX idx_call_sessions_call_sid ON public.call_sessions(call_sid);