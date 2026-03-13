-- Client assets table for DAM
CREATE TABLE IF NOT EXISTS client_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Create client_assets bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('client_assets', 'client_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public read client_assets" ON storage.objects;
CREATE POLICY "Public read client_assets"
ON storage.objects FOR SELECT USING (bucket_id = 'client_assets');

DROP POLICY IF EXISTS "Allow upload client_assets" ON storage.objects;
CREATE POLICY "Allow upload client_assets"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client_assets');

DROP POLICY IF EXISTS "Allow delete client_assets" ON storage.objects;
CREATE POLICY "Allow delete client_assets"
ON storage.objects FOR DELETE USING (bucket_id = 'client_assets');
