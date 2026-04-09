-- Migration 016: Add patient service end tracking fields
-- Date: 2026-04-05
-- Purpose: Track why and when patient services ended

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS end_reason TEXT,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS end_notes TEXT;

-- Add check constraint for valid end reasons
ALTER TABLE patients
  ADD CONSTRAINT patients_end_reason_check
  CHECK (end_reason IS NULL OR end_reason IN ('recovered', 'deceased', 'contract_cancelled', 'dissatisfied'));

-- Add check constraint for valid status values (expanded)
-- Note: We don't drop the old constraint if it exists, just add the new one
DO $$
BEGIN
  -- Drop existing status check if it exists (old constraint was more restrictive)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'patients_status_check'
    AND conrelid = 'patients'::regclass
  ) THEN
    ALTER TABLE patients DROP CONSTRAINT patients_status_check;
  END IF;
END $$;

ALTER TABLE patients
  ADD CONSTRAINT patients_status_check
  CHECK (status IN ('Active', 'Pending', 'Discharged', 'Deceased', 'Cancelled', 'Dissatisfied'));

-- Add index for filtering by end status
CREATE INDEX IF NOT EXISTS idx_patients_end_reason ON patients(end_reason) WHERE end_reason IS NOT NULL;

COMMENT ON COLUMN patients.end_reason IS 'Why services ended: recovered, deceased, contract_cancelled, dissatisfied';
COMMENT ON COLUMN patients.end_date IS 'Date when services were terminated';
COMMENT ON COLUMN patients.end_notes IS 'Additional notes about service termination';
