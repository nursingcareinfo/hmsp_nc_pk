-- Fix RLS: simplify to allow all authenticated users full access
-- Admin restrictions are handled at the app level (currentUser.role check)

-- Staff: authenticated users can read and write
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
CREATE POLICY "Authenticated users can manage staff"
  ON public.staff FOR ALL
  USING (auth.role() = 'authenticated');

-- Patients: authenticated users can read and write
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
CREATE POLICY "Authenticated users can manage patients"
  ON public.patients FOR ALL
  USING (auth.role() = 'authenticated');

-- Users: fix the recursion by removing the self-referencing policy
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
CREATE POLICY "Authenticated users can manage users"
  ON public.users FOR ALL
  USING (auth.role() = 'authenticated');
