-- Add brand asset columns to briefs table
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS secondary_color text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS heading_font text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS body_font text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS logo_url text;
