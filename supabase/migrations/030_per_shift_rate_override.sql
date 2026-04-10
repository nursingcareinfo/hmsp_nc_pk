-- ============================================================
-- Migration 030: Per-Shift Rate Override
-- ============================================================
-- Purpose: Allow admins to set a custom rate_per_shift for each
-- staff-patient assignment, independent of the staff's base shift_rate.
-- Supports the hybrid salary model:
--   - Staff has a base shift_rate (global)
--   - Each duty assignment can override it with rate_per_shift
--   - Payroll uses COALESCE(rate_per_shift, staff.shift_rate)
-- ============================================================

-- 1. Add per-shift rate override column
ALTER TABLE public.duty_assignments
  ADD COLUMN IF NOT EXISTS rate_per_shift NUMERIC(10, 2);

-- 2. Add optional notes explaining why rate differs from base
ALTER TABLE public.duty_assignments
  ADD COLUMN IF NOT EXISTS rate_notes TEXT;

-- 3. Add index for payroll queries filtering by rate
CREATE INDEX IF NOT EXISTS idx_duty_rate
  ON public.duty_assignments(rate_per_shift)
  WHERE rate_per_shift IS NOT NULL;

-- 4. Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Per-shift rate override columns added';
  RAISE NOTICE '   - rate_per_ship NUMERIC(10,2): override rate for this assignment';
  RAISE NOTICE '   - rate_notes TEXT: why rate differs from staff base rate';
  RAISE NOTICE '   - Backward compatible: NULL falls back to staff.shift_rate via COALESCE';
END $$;
