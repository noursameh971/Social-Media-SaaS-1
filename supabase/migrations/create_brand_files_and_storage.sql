-- Brand files table for DAM
CREATE TABLE IF NOT EXISTS brand_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Create brand-assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first if re-running)
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
CREATE POLICY "Public read brand-assets"
ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Allow upload brand-assets" ON storage.objects;
CREATE POLICY "Allow upload brand-assets"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Allow delete brand-assets" ON storage.objects;
CREATE POLICY "Allow delete brand-assets"
ON storage.objects FOR DELETE USING (bucket_id = 'brand-assets');
