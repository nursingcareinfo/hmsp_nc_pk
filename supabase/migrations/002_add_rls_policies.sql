-- Add RLS policies for staff and patients tables
-- This allows authenticated users to read data, and admins to manage it

-- ============================================
-- STAFF TABLE POLICIES
-- ============================================

-- Enable RLS on staff table (if not already enabled)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to re-run)
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;

-- Allow authenticated users to read all staff records
CREATE POLICY "Authenticated users can view staff"
  ON public.staff
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins to insert/update/delete staff
CREATE POLICY "Admins can manage staff"
  ON public.staff
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );

-- ============================================
-- PATIENTS TABLE POLICIES
-- ============================================

-- Enable RLS on patients table (if not already enabled)
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;

-- Allow authenticated users to read all patient records
CREATE POLICY "Authenticated users can view patients"
  ON public.patients
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow admins to manage patients
CREATE POLICY "Admins can manage patients"
  ON public.patients
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
  );
