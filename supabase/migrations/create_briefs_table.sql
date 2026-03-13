-- Create briefs table for client briefs
CREATE TABLE IF NOT EXISTS briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  brand_name text,
  industry text,
  tone_of_voice text,
  target_audience text,
  competitors text,
  campaign_goal text,
  budget text,
  platforms text[] DEFAULT '{}',
  extra_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
