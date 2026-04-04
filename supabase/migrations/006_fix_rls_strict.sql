-- ============================================================
-- FIX RLS: Properly block anonymous access
-- ============================================================

-- ============================================
-- 1. DROP ALL EXISTING POLICIES
-- ============================================

-- Staff
DROP POLICY IF EXISTS "Staff: authenticated read" ON public.staff;
DROP POLICY IF EXISTS "Staff: authenticated write" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.staff;

-- Patients
DROP POLICY IF EXISTS "Patients: authenticated read" ON public.patients;
DROP POLICY IF EXISTS "Patients: authenticated write" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.patients;

-- Users
DROP POLICY IF EXISTS "Users: authenticated read" ON public.users;
DROP POLICY IF EXISTS "Users: authenticated write" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can manage users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.users;

-- Notifications
DROP POLICY IF EXISTS "Notifications: authenticated read" ON public.notifications;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.notifications;

-- Payroll
DROP POLICY IF EXISTS "Payroll: authenticated read" ON public.payroll;
DROP POLICY IF EXISTS "Payroll: authenticated write" ON public.payroll;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.payroll;

-- ============================================
-- 2. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE STRICT RLS POLICIES
-- ============================================

-- Staff: Only authenticated users can access
CREATE POLICY "Enable read access for authenticated users only"
  ON public.staff
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users only"
  ON public.staff
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Patients: Only authenticated users can access
CREATE POLICY "Enable read access for authenticated users only"
  ON public.patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users only"
  ON public.patients
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Users: Only authenticated users can access
CREATE POLICY "Enable read access for authenticated users only"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users only"
  ON public.users
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Notifications: Only authenticated users can access
CREATE POLICY "Enable read access for authenticated users only"
  ON public.notifications
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Payroll: Only authenticated users can access
CREATE POLICY "Enable read access for authenticated users only"
  ON public.payroll
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users only"
  ON public.payroll
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
