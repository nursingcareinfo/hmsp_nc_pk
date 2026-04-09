-- ============================================================
-- REPAIR ASSIGNED ID — Fix Sequence and Constraint
-- ============================================================

-- 1. Check what constraints exist
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname, contype, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.staff'::regclass
  LOOP
    RAISE NOTICE 'Constraint: % | Type: % | Definition: %', con.conname, con.contype, con.def;
  END LOOP;
END $$;

-- 2. Find any duplicate assigned_ids
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT assigned_id, COUNT(*)
    FROM public.staff
    WHERE assigned_id IS NOT NULL AND assigned_id != ''
    GROUP BY assigned_id
    HAVING COUNT(*) > 1
  ) d;
  
  IF dup_count > 0 THEN
    RAISE WARNING 'Found % groups of duplicate assigned_ids', dup_count;
  ELSE
    RAISE NOTICE 'No duplicate assigned_ids found';
  END IF;
END $$;

-- 3. Get the current sequence value
DO $$
DECLARE
  seq_val BIGINT;
  max_id INTEGER;
BEGIN
  SELECT last_value INTO seq_val FROM public.staff_assigned_id_seq;
  RAISE NOTICE 'Sequence current value: %', seq_val;
  
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(assigned_id, 'NC-KHI-', '') AS INTEGER)), 0)
  INTO max_id
  FROM public.staff;
  RAISE NOTICE 'Max assigned_id in table: %', max_id;
  
  IF seq_val <= max_id THEN
    RAISE NOTICE 'Sequence is behind max ID! Resetting to %', max_id + 1;
    PERFORM setval('public.staff_assigned_id_seq', max_id + 1, false);
  ELSE
    RAISE NOTICE 'Sequence is correctly positioned';
  END IF;
END $$;
