-- ============================================================
-- FIX TRIGGER: 4-digit assigned_id padding
-- ============================================================
-- After renumbering to NC-KHI-0001 format, the trigger must
-- also generate 4-digit IDs for new staff registrations

CREATE OR REPLACE FUNCTION public.generate_assigned_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  next_id := nextval('public.staff_assigned_id_seq');
  NEW.assigned_id := 'NC-KHI-' || LPAD(next_id::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reattach trigger (idempotent — safe if already exists)
DROP TRIGGER IF EXISTS trg_generate_assigned_id ON public.staff;
CREATE TRIGGER trg_generate_assigned_id
  BEFORE INSERT ON public.staff
  FOR EACH ROW
  WHEN (NEW.assigned_id IS NULL OR NEW.assigned_id = '')
  EXECUTE FUNCTION public.generate_assigned_id();

DO $$
BEGIN
  RAISE NOTICE '✅ Trigger updated: 4-digit padding (NC-KHI-0001)';
  RAISE NOTICE '   Sequence value: 1321 → next new staff will be NC-KHI-1322';
END $$;
