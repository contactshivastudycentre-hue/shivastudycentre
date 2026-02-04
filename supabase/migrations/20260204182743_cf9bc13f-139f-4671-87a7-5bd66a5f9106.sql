-- Create storage bucket for notes PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated admins to upload PDFs
CREATE POLICY "Admins can upload notes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'notes' AND public.is_admin());

-- Allow authenticated admins to update PDFs
CREATE POLICY "Admins can update notes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'notes' AND public.is_admin());

-- Allow authenticated admins to delete PDFs
CREATE POLICY "Admins can delete notes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'notes' AND public.is_admin());

-- Allow everyone to read public notes (PDFs will be viewable by approved students)
CREATE POLICY "Anyone can read notes" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'notes');