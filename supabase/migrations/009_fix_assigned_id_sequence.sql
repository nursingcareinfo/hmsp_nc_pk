-- ============================================================
-- FIX ASSIGNED ID SEQUENCE — Robust, Auto-Generating, Unique
-- ============================================================
-- Problem: 
--   - assigned_id has no UNIQUE constraint (duplicates possible)
--   - Client-side generation risks race conditions
--   - Gaps exist from deleted duplicates (NC-KHI-012, 028, 060, etc.)
--   - No auto-increment for new staff
--
-- Solution:
--   1. Find the highest existing assigned_id number
--   2. Create a PostgreSQL sequence starting from max+1
--   3. Add UNIQUE constraint on assigned_id
--   4. Create trigger to auto-generate next ID on INSERT
--   5. Backfill any NULL/empty assigned_ids with next sequence values

-- ============================================
-- 1. FIND THE HIGHEST EXISTING ID NUMBER
-- ============================================

-- Get the max assigned_id number from existing records
DO $$
DECLARE
  max_id_num INTEGER;
  seq_start INTEGER;
BEGIN
  -- Extract numeric part from assigned_id (NC-KHI-XXX)
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(assigned_id, 'NC-KHI-', '') AS INTEGER)), 0)
  INTO max_id_num
  FROM public.staff
  WHERE assigned_id ~ '^NC-KHI-\d+$';

  -- Start sequence from next number
  seq_start := max_id_num + 1;

  RAISE NOTICE 'Highest existing assigned_id: NC-KHI-%', max_id_num;
  RAISE NOTICE 'Starting new sequence at: %', seq_start;

  -- ============================================
  -- 2. CREATE SEQUENCE
  -- ============================================
  DROP SEQUENCE IF EXISTS public.staff_assigned_id_seq;
  EXECUTE 'CREATE SEQUENCE public.staff_assigned_id_seq START WITH ' || seq_start || ' INCREMENT BY 1';

  RAISE NOTICE 'Sequence staff_assigned_id_seq created, starts at %', seq_start;
END $$;

-- ============================================
-- 3. BACKFILL NULL/EMPTY ASSIGNED IDs
-- ============================================

-- Assign new IDs to any records missing assigned_id
DO $$
DECLARE
  rec RECORD;
  next_id INTEGER;
BEGIN
  FOR rec IN 
    SELECT id 
    FROM public.staff 
    WHERE assigned_id IS NULL OR assigned_id = ''
    ORDER BY created_at ASC
  LOOP
    next_id := nextval('public.staff_assigned_id_seq');
    UPDATE public.staff 
    SET assigned_id = 'NC-KHI-' || LPAD(next_id::TEXT, 3, '0')
    WHERE id = rec.id;
    
    RAISE NOTICE 'Backfilled staff % → NC-KHI-%', rec.id, LPAD(next_id::TEXT, 3, '0');
  END LOOP;
END $$;

-- ============================================
-- 4. ADD UNIQUE CONSTRAINT
-- ============================================

-- Drop any existing unique constraint first (ignore errors)
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS uk_staff_assigned_id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.staff ADD CONSTRAINT uk_staff_assigned_id UNIQUE (assigned_id);

-- ============================================
-- 5. CREATE AUTO-GENERATION TRIGGER
-- ============================================

-- Function to auto-generate assigned_id
CREATE OR REPLACE FUNCTION public.generate_assigned_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if assigned_id is NULL or empty
  IF NEW.assigned_id IS NULL OR NEW.assigned_id = '' THEN
    NEW.assigned_id := 'NC-KHI-' || LPAD(nextval('public.staff_assigned_id_seq')::TEXT, 3, '0');
  END IF;
  
  -- Ensure timestamp fields are set
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_generate_assigned_id ON public.staff;

-- Create trigger (fires BEFORE INSERT)
CREATE TRIGGER trg_generate_assigned_id
  BEFORE INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_assigned_id();

-- ============================================
-- 6. ADD UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.staff;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 7. VERIFY
-- ============================================

DO $$
DECLARE
  total_count INTEGER;
  null_count INTEGER;
  dup_count INTEGER;
  max_id_num INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.staff;
  SELECT COUNT(*) INTO null_count FROM public.staff WHERE assigned_id IS NULL OR assigned_id = '';
  
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT assigned_id, COUNT(*)
    FROM public.staff
    WHERE assigned_id IS NOT NULL AND assigned_id != ''
    GROUP BY assigned_id
    HAVING COUNT(*) > 1
  ) dups;

  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(assigned_id, 'NC-KHI-', '') AS INTEGER)), 0)
  INTO max_id_num
  FROM public.staff
  WHERE assigned_id ~ '^NC-KHI-\d+$';

  IF null_count = 0 AND dup_count = 0 THEN
    RAISE NOTICE '✅ VERIFIED: % staff, 0 NULLs, 0 duplicates, max ID: NC-KHI-%', total_count, max_id_num;
  ELSE
    RAISE WARNING '⚠️ ISSUES: % staff, % NULLs, % duplicate groups, max ID: NC-KHI-%', 
      total_count, null_count, dup_count, max_id_num;
  END IF;
END $$;
