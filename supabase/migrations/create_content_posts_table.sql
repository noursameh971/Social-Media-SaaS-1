CREATE TABLE IF NOT EXISTS content_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  platform text NOT NULL,
  format text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
