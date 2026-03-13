-- Brand strategies table for client strategy & brief
CREATE TABLE IF NOT EXISTS brand_strategies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  brand_core text,
  primary_color text,
  secondary_color text,
  heading_font text,
  body_font text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
