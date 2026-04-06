-- ============================================================
-- MIGRATION 020: AUTO PATIENT ID NC-PAT-XXXX
-- ============================================================
-- Adds patient_id_assigned column with auto-incrementing
-- sequential IDs: NC-PAT-0001, NC-PAT-0002, etc.
-- Same pattern as staff assigned_id (NC-KHI-XXXX)

-- ============================================
-- 1. ADD patient_id_assigned COLUMN
-- ============================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS patient_id_assigned TEXT;

-- ============================================
-- 2. CREATE SEQUENCE
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.patient_assigned_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ============================================
-- 3. BACKFILL EXISTING PATIENTS
-- ============================================

-- Find the highest existing numeric suffix (in case any were manually set)
DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(patient_id_assigned, 'NC-PAT-', '') AS INTEGER)
  ), 0) INTO max_id
  FROM public.patients
  WHERE patient_id_assigned ~ '^NC-PAT-\d+$';

  IF max_id > 0 THEN
    PERFORM setval('public.patient_assigned_id_seq', max_id, true);
    RAISE NOTICE 'Sequence set to % (highest existing: NC-PAT-%)', max_id, max_id;
  ELSE
    RAISE NOTICE 'No existing NC-PAT- IDs found, starting from 1';
  END IF;
END $$;

-- Assign sequential IDs to all patients that don't have one yet,
-- ordered by created_at (oldest first gets lowest number)
WITH ordered_patients AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.patients
  WHERE patient_id_assigned IS NULL
)
UPDATE public.patients p
SET patient_id_assigned = 'NC-PAT-' || LPAD(op.rn::TEXT, 4, '0')
FROM ordered_patients op
WHERE p.id = op.id;

-- Verify no NULLs remain after backfill
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.patients
  WHERE patient_id_assigned IS NULL;

  IF null_count > 0 THEN
    RAISE WARNING '% patients still have NULL patient_id_assigned after backfill', null_count;
  ELSE
    RAISE NOTICE '✅ All patients backfilled with NC-PAT-XXXX IDs';
  END IF;
END $$;

-- ============================================
-- 4. CREATE AUTO-GENERATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS trg_generate_patient_id_assigned ON public.patients;
DROP FUNCTION IF EXISTS public.trg_generate_patient_id_assigned();
CREATE OR REPLACE FUNCTION public.trg_generate_patient_id_assigned()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  IF NEW.patient_id_assigned IS NULL OR NEW.patient_id_assigned = '' THEN
    next_id := nextval('public.patient_assigned_id_seq');
    NEW.patient_id_assigned := 'NC-PAT-' || LPAD(next_id::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_patient_id_assigned
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_generate_patient_id_assigned();

-- ============================================
-- 5. ADD UNIQUE INDEX
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uk_patient_id_assigned
  ON public.patients(patient_id_assigned)
  WHERE patient_id_assigned IS NOT NULL;

-- ============================================
-- 6. VERIFY
-- ============================================

DO $$
DECLARE
  total_count INTEGER;
  null_count INTEGER;
  dup_count INTEGER;
  max_id TEXT;
  next_val INTEGER;
  next_id_text TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.patients;
  SELECT COUNT(*) INTO null_count FROM public.patients WHERE patient_id_assigned IS NULL;
  SELECT COUNT(*) - COUNT(DISTINCT patient_id_assigned) INTO dup_count
    FROM public.patients WHERE patient_id_assigned IS NOT NULL;
  SELECT MAX(patient_id_assigned) INTO max_id FROM public.patients;
  SELECT last_value INTO next_val FROM public.patient_assigned_id_seq;
  next_id_text := 'NC-PAT-' || LPAD((next_val + 1)::TEXT, 4, '0');

  RAISE NOTICE 'Migration 020 complete';
  RAISE NOTICE '   Total patients: %', total_count;
  RAISE NOTICE '   NULL IDs: %', null_count;
  RAISE NOTICE '   Duplicates: %', dup_count;
  RAISE NOTICE '   Highest ID: %', max_id;
  RAISE NOTICE '   Next new patient will be: %', next_id_text;
END $$;
