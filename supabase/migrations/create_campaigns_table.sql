-- Campaigns table for client ad campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  budget numeric(12, 2),
  status text DEFAULT 'Planned',
  created_at timestamptz DEFAULT now()
);
