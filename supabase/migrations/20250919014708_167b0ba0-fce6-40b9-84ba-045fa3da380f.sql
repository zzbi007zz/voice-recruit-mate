-- Create storage bucket for CV files
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

-- Create storage policies for CV bucket
CREATE POLICY "Staff can upload CVs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "Staff can view CVs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cvs');

CREATE POLICY "Staff can delete CVs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cvs');