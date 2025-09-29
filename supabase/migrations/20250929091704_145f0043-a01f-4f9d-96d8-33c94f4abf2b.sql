-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('candidate', 'client', 'follow_up', 'interview', 'rejection', 'offer')),
  language TEXT NOT NULL DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
  variables TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales leads table
CREATE TABLE public.sales_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'presentation', 'negotiation', 'contract', 'closed_won', 'closed_lost')),
  value DECIMAL DEFAULT 0,
  notes TEXT,
  last_contact TIMESTAMP WITH TIME ZONE,
  next_action TEXT,
  next_action_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create CV job matches table
CREATE TABLE public.cv_job_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  overall_score INTEGER NOT NULL DEFAULT 0,
  skill_match_score INTEGER NOT NULL DEFAULT 0,
  experience_match_score INTEGER NOT NULL DEFAULT 0,
  culture_fit_score INTEGER NOT NULL DEFAULT 0,
  salary_match_score INTEGER NOT NULL DEFAULT 0,
  detailed_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_job_matches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (development mode - allow all)
CREATE POLICY "Allow all operations on email templates (development)" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on sales leads (development)" ON public.sales_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cv job matches (development)" ON public.cv_job_matches FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cv_job_matches_updated_at
  BEFORE UPDATE ON public.cv_job_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();