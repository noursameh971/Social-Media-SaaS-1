ALTER TABLE clients ADD COLUMN IF NOT EXISTS custom_rules text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS full_strategy jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_model text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS art_direction text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS target_market text;
