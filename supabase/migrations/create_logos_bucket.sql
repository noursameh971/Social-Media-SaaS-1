-- Create logos bucket for agency branding
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos"
ON storage.objects FOR SELECT USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Allow upload logos" ON storage.objects;
CREATE POLICY "Allow upload logos"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Allow delete logos" ON storage.objects;
CREATE POLICY "Allow delete logos"
ON storage.objects FOR DELETE USING (bucket_id = 'logos');
