-- Drop existing check constraints
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_priority_check;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add updated check constraints with all values used in the frontend
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_priority_check 
CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]));

ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_status_check 
CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'on-hold'::text, 'filled'::text]));