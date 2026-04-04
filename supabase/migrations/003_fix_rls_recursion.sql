-- Fix RLS policies to avoid infinite recursion
-- Use JWT claims instead of querying the users table

-- ============================================
-- STAFF TABLE POLICIES
-- ============================================

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;

-- Any authenticated user can read staff
CREATE POLICY "Authenticated users can view staff"
  ON public.staff
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins (role stored in JWT custom claim) can manage staff
CREATE POLICY "Admins can manage staff"
  ON public.staff
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================
-- PATIENTS TABLE POLICIES
-- ============================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;

-- Any authenticated user can read patients
CREATE POLICY "Authenticated users can view patients"
  ON public.patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage patients
CREATE POLICY "Admins can manage patients"
  ON public.patients
  FOR ALL
  USING (
    (auth.jwt() ->> 'role') = 'admin'
  );
