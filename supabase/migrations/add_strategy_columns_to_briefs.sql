-- Add agency-grade brand strategy columns to briefs
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS mission text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS usp text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS pain_points text;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS content_pillars text;
