-- Temporarily allow unauthenticated access for development
-- We'll implement proper authentication later

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;

DROP POLICY IF EXISTS "Users can view job applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can create job applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update job applications for their jobs" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete job applications for their jobs" ON public.job_applications;

-- Create temporary permissive policies for development
-- TODO: Replace with proper user-based policies when authentication is implemented
CREATE POLICY "Allow all operations on clients (development)" 
ON public.clients 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on jobs (development)" 
ON public.jobs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on job applications (development)" 
ON public.job_applications 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Make user_id nullable temporarily for development
ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.jobs ALTER COLUMN user_id DROP NOT NULL;