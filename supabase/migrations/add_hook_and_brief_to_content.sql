-- Add strategic fields to content table for marketing workflow
-- Run this in Supabase SQL Editor if columns don't exist

ALTER TABLE content ADD COLUMN IF NOT EXISTS hook text;
ALTER TABLE content ADD COLUMN IF NOT EXISTS brief text;
