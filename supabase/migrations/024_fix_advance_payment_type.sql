-- ============================================================
-- MIGRATION 024: FIX advance_payment_received TYPE
-- ============================================================
-- Column was NUMERIC(12, 2) but form sends boolean (checkbox).
-- Changing to BOOLEAN to match frontend behavior.

ALTER TABLE public.patients
  ALTER COLUMN advance_payment_received TYPE BOOLEAN
  USING CASE WHEN advance_payment_received IS NOT NULL AND advance_payment_received > 0 THEN true ELSE false END;

ALTER TABLE public.patients
  ALTER COLUMN advance_payment_received SET DEFAULT false;

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'patients'
    AND column_name = 'advance_payment_received';
  
  RAISE NOTICE 'Migration 024: advance_payment_received type is now: %', col_type;
END $$;
