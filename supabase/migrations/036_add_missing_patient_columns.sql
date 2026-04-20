-- Add missing patient columns for clinical metadata and enhanced service tracking
ALTER TABLE patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS comorbidities TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_condition TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS special_equipment TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mobility_status TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS service_category TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS acuity_level INTEGER;