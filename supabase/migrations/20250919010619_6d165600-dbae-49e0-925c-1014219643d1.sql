-- First, add user_id columns to link data to specific users
ALTER TABLE public.clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing clients and jobs to have a user_id (for existing data)
-- In a real scenario, you'd need to properly assign these
UPDATE public.clients SET user_id = auth.uid() WHERE user_id IS NULL;
UPDATE public.jobs SET user_id = auth.uid() WHERE user_id IS NULL;

-- Make user_id NOT NULL after populating existing data
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN user_id SET NOT NULL;

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on clients for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations on jobs for authenticated users" ON public.jobs;
DROP POLICY IF EXISTS "Allow all operations on job applications for authenticated user" ON public.job_applications;

-- Create secure RLS policies for clients
CREATE POLICY "Users can view their own clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for jobs
CREATE POLICY "Users can view their own jobs" 
ON public.jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
ON public.jobs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create secure RLS policies for job applications (most critical fix)
-- Users can only see job applications for jobs they own
CREATE POLICY "Users can view job applications for their jobs" 
ON public.job_applications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create job applications for their jobs" 
ON public.job_applications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update job applications for their jobs" 
ON public.job_applications 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
    AND jobs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete job applications for their jobs" 
ON public.job_applications 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_applications.job_id 
    AND jobs.user_id = auth.uid()
  )
);

-- Add indexes for better performance on the new user_id columns
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_job_applications_job_id ON public.job_applications(job_id);