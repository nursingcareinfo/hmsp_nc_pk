-- ============================================================
-- RENUMBER ALL STAFF ASSIGNED IDs SEQUENTIALLY
-- ============================================================
-- Assigns NC-KHI-0001 through NC-KHI-NNNN based on created_at order
-- Fixes the PostgreSQL sequence for auto-generation of future IDs

BEGIN;

-- Step 1: Renumber all records using ROW_NUMBER()
-- This runs atomically — PostgreSQL checks UNIQUE at end of statement
WITH ordered_staff AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM staff
)
UPDATE staff
SET assigned_id = 'NC-KHI-' || LPAD(ordered_staff.rn::text, 4, '0')
FROM ordered_staff
WHERE staff.id = ordered_staff.id;

-- Step 2: Reset the sequence to the new max value
SELECT setval('staff_assigned_id_seq', (SELECT COUNT(*) FROM staff), true);

COMMIT;

-- Verify
DO $$
DECLARE
  total INT;
  max_id TEXT;
  min_id TEXT;
  seq_val BIGINT;
BEGIN
  SELECT COUNT(*) INTO total FROM staff;
  SELECT MIN(assigned_id) INTO min_id FROM staff;
  SELECT MAX(assigned_id) INTO max_id FROM staff;
  SELECT last_value INTO seq_val FROM staff_assigned_id_seq;

  RAISE NOTICE '✅ Staff IDs renumbered successfully';
  RAISE NOTICE '   Total records: %', total;
  RAISE NOTICE '   ID range: % to %', min_id, max_id;
  RAISE NOTICE '   Sequence value: % (next ID will be NC-KHI-%)', seq_val, LPAD((seq_val + 1)::text, 4, '0');
END $$;
