-- Recreate staff table with clean schema and proper RLS
-- This fixes any schema/permission issues

-- Step 1: Backup existing data (if any)
CREATE TABLE IF NOT EXISTS public.staff_backup AS SELECT * FROM public.staff;

-- Step 2: Drop old table and RLS policies
DROP TABLE IF EXISTS public.staff CASCADE;

-- Step 3: Create fresh staff table
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id_assigned TEXT UNIQUE,
  full_name TEXT NOT NULL,
  father_husband_name TEXT,
  cnic TEXT UNIQUE,
  date_of_birth DATE,
  contact_1 TEXT NOT NULL,
  alt_number TEXT,
  email TEXT,
  whatsapp TEXT,
  gender TEXT,
  religion TEXT,
  marital_status TEXT,
  category TEXT DEFAULT 'Attendants',
  designation TEXT,
  area_town TEXT,
  city TEXT DEFAULT 'Karachi',
  official_district TEXT DEFAULT 'Karachi South',
  residential_area TEXT,
  address TEXT,
  total_experience INTEGER DEFAULT 0,
  relevant_experience INTEGER DEFAULT 0,
  shift_preference TEXT,
  expected_salary NUMERIC(10,2),
  availability TEXT DEFAULT 'Immediate',
  preferred_payment TEXT DEFAULT 'Cash',
  bank_name TEXT,
  account_title TEXT,
  account_number TEXT,
  iban TEXT,
  education JSONB,
  employment_history JSONB,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_alt_phone TEXT,
  status TEXT DEFAULT 'Active',
  user_id UUID REFERENCES auth.users(id),
  assigned_patient_id UUID REFERENCES public.patients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- Step 5: Create permissive policies for authenticated users
CREATE POLICY "staff_all_authenticated" ON public.staff 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Step 6: Allow anon for read-only
CREATE POLICY "staff_anon_read" ON public.staff 
  FOR SELECT TO anon USING (true);

-- Step 7: Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_updated_at_trigger ON public.staff;
CREATE TRIGGER staff_updated_at_trigger
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_staff_updated_at();

-- Step 8: Grant permissions
GRANT ALL ON public.staff TO authenticated;
GRANT SELECT ON public.staff TO anon;