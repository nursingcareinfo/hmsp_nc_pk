-- Migration 027: Enforce max 2 staff per patient per shift
-- Business rule: Each patient can have at most 2 staff assigned per shift (day/night) per date
-- Created: 2026-04-08

-- Add a partial unique index that enforces max 2 staff per patient per shift per date
-- PostgreSQL doesn't support MAX() in unique constraints directly, so we use a trigger

-- Drop existing unique constraint if it exists (it's on staff_id, not patient_id)
DROP INDEX IF EXISTS uk_duty_staff_date_shift;

-- Recreate the original constraint: prevent same staff from having duplicate shifts
CREATE UNIQUE INDEX uk_duty_staff_date_shift ON duty_assignments(staff_id, duty_date, shift_type)
WHERE status IN ('assigned', 'confirmed', 'completed');

-- Create a trigger function to enforce max 2 staff per patient per shift
CREATE OR REPLACE FUNCTION check_max_staff_per_shift()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Only check for active assignments
  IF NEW.status IN ('assigned', 'confirmed', 'completed') THEN
    SELECT COUNT(*) INTO current_count
    FROM duty_assignments
    WHERE patient_id = NEW.patient_id
      AND duty_date = NEW.duty_date
      AND shift_type = NEW.shift_type
      AND status IN ('assigned', 'confirmed', 'completed')
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF current_count >= 2 THEN
      RAISE EXCEPTION 'Maximum 2 staff allowed per patient per shift (patient: %, shift: %, date: %, current: %)',
        NEW.patient_id, NEW.shift_type, NEW.duty_date, current_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_check_max_staff_per_shift ON duty_assignments;
CREATE TRIGGER trg_check_max_staff_per_shift
  BEFORE INSERT OR UPDATE ON duty_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_max_staff_per_shift();

-- Verify the constraint exists
SELECT tgname, tgrelid::regclass, tgfoid::regproc
FROM pg_trigger
WHERE tgname = 'trg_check_max_staff_per_shift';
