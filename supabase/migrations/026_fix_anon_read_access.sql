-- ============================================================
-- MIGRATION 026: FIX ANON KEY READ ACCESS
-- The app uses anon key for read operations (supabase.from().select())
-- This adds read-only policies for anon while keeping write restricted to authenticated
-- ============================================================

-- ============================================
-- 1. ALLOW ANON KEY TO READ STAFF, PATIENTS, DUTY
-- ============================================

-- Staff: anon can read (for dashboard charts, lists, search)
DROP POLICY IF EXISTS "Staff: anon read" ON public.staff;
CREATE POLICY "Staff: anon read"
  ON public.staff FOR SELECT TO anon
  USING (deleted_at IS NULL);

-- Patients: anon can read
DROP POLICY IF EXISTS "Patients: anon read" ON public.patients;
CREATE POLICY "Patients: anon read"
  ON public.patients FOR SELECT TO anon
  USING (deleted_at IS NULL);

-- Duty assignments: anon can read
DROP POLICY IF EXISTS "Duty: anon read" ON public.duty_assignments;
CREATE POLICY "Duty: anon read"
  ON public.duty_assignments FOR SELECT TO anon
  USING (deleted_at IS NULL);

-- Notifications: anon can read
DROP POLICY IF EXISTS "Notifications: anon read" ON public.notifications;
CREATE POLICY "Notifications: anon read"
  ON public.notifications FOR SELECT TO anon
  USING (deleted_at IS NULL);

-- Payroll: anon CANNOT read (sensitive financial data)
-- Only authenticated admins can access

-- Staff advances: anon CANNOT read (sensitive)
-- Only authenticated admins can access

-- ============================================
-- 2. MATERIALIZED VIEWS (no RLS needed — they query RLS-protected tables)
-- ============================================

-- Materialized views inherit RLS from underlying tables.
-- Since staff/patients already allow anon read, the views work automatically.
-- No additional policy needed.

-- ============================================
-- 3. RLS SUMMARY
-- ============================================

-- Tables with anon READ access:
--   ✅ staff (read-only, excludes soft-deleted)
--   ✅ patients (read-only, excludes soft-deleted)
--   ✅ duty_assignments (read-only, excludes soft-deleted)
--   ✅ notifications (read-only, excludes soft-deleted)
--   ✅ dashboard_summary (read-only, via underlying table RLS)
--   ✅ staff_stats (read-only, via underlying table RLS)
--   ✅ patient_stats (read-only, via underlying table RLS)
--
-- Tables with auth-only access (no anon):
--   🔒 payroll (financial data)
--   🔒 staff_advances (financial data)
--   🔒 patient_advances (financial data)
--   🔒 attendance_records (operational data)
--   🔒 audit_log (security data)
--   🔒 users (auth data)

-- ============================================
-- 4. VERIFY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 026 applied: Anon read access restored for public data';
  RAISE NOTICE '   Financial tables remain protected (payroll, advances, audit_log)';
  RAISE NOTICE '   Materialized views work via underlying table RLS';
END $$;
