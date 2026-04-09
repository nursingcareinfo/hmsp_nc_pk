-- ============================================================
-- FIX ASSIGNED ID — Remove column DEFAULT, ensure trigger works
-- ============================================================
-- Root cause: The column 'assigned_id' has a DEFAULT expression
-- that generates NC-KHI-XXX using an old sequence value (167).
-- The BEFORE INSERT trigger never fires because the DEFAULT 
-- provides a value before the trigger can.
--
-- Fix: Remove the DEFAULT, let the trigger handle everything.

-- 1. Remove any column DEFAULT on assigned_id
ALTER TABLE public.staff ALTER COLUMN assigned_id DROP DEFAULT;

-- 2. Make sure the column allows NULL (trigger will fill it)
ALTER TABLE public.staff ALTER COLUMN assigned_id DROP NOT NULL;

-- 3. Drop ALL existing unique constraints on assigned_id
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_assigned_id_key;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS uk_staff_assigned_id;

-- 4. Reset the sequence to max existing + 1
DO $$
DECLARE
  max_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(assigned_id, 'NC-KHI-', '') AS INTEGER)), 0)
  INTO max_id
  FROM public.staff
  WHERE assigned_id ~ '^NC-KHI-\d+$';

  PERFORM setval('public.staff_assigned_id_seq', max_id + 1, false);
  RAISE NOTICE 'Sequence reset to %', max_id + 1;
END $$;

-- 5. Recreate trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.generate_assigned_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_id IS NULL OR NEW.assigned_id = '' THEN
    NEW.assigned_id := 'NC-KHI-' || nextval('public.staff_assigned_id_seq');
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recreate trigger
DROP TRIGGER IF EXISTS trg_generate_assigned_id ON public.staff;
CREATE TRIGGER trg_generate_assigned_id
  BEFORE INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_assigned_id();

-- 7. Add back UNIQUE constraint
ALTER TABLE public.staff ADD CONSTRAINT uk_staff_assigned_id UNIQUE (assigned_id);

-- 8. Verify
DO $$
DECLARE
  col_default TEXT;
  col_nullable TEXT;
  seq_val BIGINT;
BEGIN
  SELECT column_default, is_nullable INTO col_default, col_nullable
  FROM information_schema.columns 
  WHERE table_name = 'staff' AND column_name = 'assigned_id';
  
  SELECT last_value INTO seq_val FROM public.staff_assigned_id_seq;
  
  RAISE NOTICE '=== FINAL STATE ===';
  RAISE NOTICE 'Column DEFAULT: % (should be NULL)', col_default;
  RAISE NOTICE 'Column nullable: % (should be YES)', col_nullable;
  RAISE NOTICE 'Sequence value: %', seq_val;
  RAISE NOTICE 'Trigger trg_generate_assigned_id: active';
  RAISE NOTICE 'Constraint uk_staff_assigned_id: active';
END $$;
