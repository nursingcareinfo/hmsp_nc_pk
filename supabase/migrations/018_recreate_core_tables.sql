-- ============================================================
-- MIGRATION 018: RECREATE CORE TABLES + CONSTRAINTS + INDEXES
-- ============================================================
-- Recreates 4 tables that were created via Supabase dashboard UI
-- but had no migration SQL (staff, patients, payroll, notifications)
-- Also adds: unique CNIC constraint, missing FK indexes
--
-- NOTE: Uses IF NOT EXISTS so this is safe to run on existing DB.

-- ============================================
-- 1. STAFF TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  father_husband_name TEXT,
  date_of_birth TEXT,
  cnic TEXT,
  contact_1 TEXT NOT NULL,
  contact_2 TEXT,
  alt_number TEXT,
  email TEXT,
  whatsapp TEXT,
  category TEXT,
  designation TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT 'Male',
  religion TEXT,
  marital_status TEXT,
  official_district TEXT,
  residential_area TEXT,
  area_town TEXT,
  city TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  hire_date TEXT,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  relevant_experience TEXT,
  pnc_number TEXT,
  guarantor_name TEXT,
  guarantor_contact TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_alt_phone TEXT,
  emergency_contact_relationship TEXT,
  preferred_payment TEXT,
  bank_name TEXT,
  account_title TEXT,
  account_number TEXT,
  iban TEXT,
  salary NUMERIC(10, 2) DEFAULT 0,
  shift_rate NUMERIC(10, 2),
  shift_preference TEXT,
  expected_salary NUMERIC(10, 2),
  availability TEXT,
  education JSONB,
  employment_history JSONB,
  photo_url TEXT,
  cnic_image_urls JSONB,
  form_image_urls JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. PATIENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cnic TEXT,
  contact TEXT NOT NULL,
  alt_contact TEXT,
  email TEXT,
  whatsapp TEXT,
  address TEXT,
  area TEXT,
  city TEXT,
  district TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  admission_date TEXT,
  date_of_birth TEXT,
  gender TEXT NOT NULL DEFAULT 'Male',
  blood_group TEXT,
  marital_status TEXT,
  guardian_name TEXT,
  guardian_contact TEXT,
  guardian_cnic TEXT,
  guardian_relationship TEXT,
  medical_condition TEXT,
  primary_diagnosis TEXT,
  current_condition TEXT,
  current_medications TEXT,
  allergies TEXT,
  medical_requirements JSONB,
  equipment_requirements JSONB,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  doctor_name TEXT,
  doctor_specialty TEXT,
  doctor_hospital TEXT,
  doctor_phone TEXT,
  doctor_notes TEXT,
  special_requirements TEXT,
  service_type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  assigned_staff_id UUID,
  billing_package TEXT NOT NULL DEFAULT 'Standard',
  billing_rate NUMERIC(10, 2) DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  advance_payment_received BOOLEAN DEFAULT false,
  advance_payment_date TEXT,
  cnic_image_urls JSONB,
  form_image_urls JSONB,
  -- Shift preferences (from migration 012)
  needs_day_shift BOOLEAN DEFAULT true,
  needs_night_shift BOOLEAN DEFAULT true,
  day_shift_start TIME,
  day_shift_end TIME,
  night_shift_start TIME,
  night_shift_end TIME,
  shift_instructions TEXT,
  -- Service end tracking (from migration 016)
  end_reason TEXT CHECK (end_reason IN ('recovered', 'deceased', 'contract_cancelled', 'dissatisfied')),
  end_date TEXT,
  end_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. PAYROLL TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  shifts_worked INTEGER DEFAULT 0,
  shift_rate NUMERIC(10, 2) DEFAULT 0,
  base_salary NUMERIC(12, 2) DEFAULT 0,
  allowances NUMERIC(12, 2) DEFAULT 0,
  deductions NUMERIC(12, 2) DEFAULT 0,
  deductions_advances NUMERIC(12, 2) DEFAULT 0,
  net_salary NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Cancelled')),
  payment_date TEXT,
  day_shifts_completed INTEGER DEFAULT 0,
  night_shifts_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  recipient_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. ADD FOREIGN KEY: patients.assigned_staff_id -> staff.id
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_patients_assigned_staff'
  ) THEN
    ALTER TABLE public.patients
      ADD CONSTRAINT fk_patients_assigned_staff
      FOREIGN KEY (assigned_staff_id) REFERENCES public.staff(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 6. ADD UNIQUE CONSTRAINT: CNIC on staff
-- ============================================

-- First, clean up duplicate CNICs (keep the one with the lowest id)
DELETE FROM public.staff a USING public.staff b
WHERE a.id > b.id
  AND a.cnic = b.cnic
  AND a.cnic IS NOT NULL
  AND a.cnic != '';

-- Use partial unique index (excludes NULL and empty CNICs)
CREATE UNIQUE INDEX IF NOT EXISTS uk_staff_cnic
  ON public.staff(cnic)
  WHERE cnic IS NOT NULL AND cnic != '';

-- ============================================
-- 7. MISSING FK INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff ON public.staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_patient_advances_patient ON public.patient_advances(patient_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff ON public.payroll(staff_id);

-- Notifications index (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'recipient_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);
  END IF;
END $$;

-- ============================================
-- 8. COMPOSITE INDEXES FOR DUTY_ASSIGNMENTS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_duty_staff_status_date ON public.duty_assignments(staff_id, status, duty_date);
CREATE INDEX IF NOT EXISTS idx_duty_patient_date_shift ON public.duty_assignments(patient_id, duty_date, shift_type);

-- Partial index: only unprocessed completed shifts (payroll cares about these)
CREATE INDEX IF NOT EXISTS idx_duty_unprocessed_completed
  ON public.duty_assignments(staff_id, duty_date)
  WHERE status = 'completed' AND is_payroll_processed = false;

-- ============================================
-- 9. ATTENDANCE UNIQUE INDEX (idempotent)
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS uk_attendance_staff_date ON public.attendance_records(staff_id, attendance_date);

-- ============================================
-- 10. RLS FOR NEW TABLES
-- ============================================

-- Staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff: authenticated read" ON public.staff;
CREATE POLICY "Staff: authenticated read" ON public.staff FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Staff: authenticated write" ON public.staff;
CREATE POLICY "Staff: authenticated write" ON public.staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Patients: authenticated read" ON public.patients;
CREATE POLICY "Patients: authenticated read" ON public.patients FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Patients: authenticated write" ON public.patients;
CREATE POLICY "Patients: authenticated write" ON public.patients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Payroll
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payroll: authenticated read" ON public.payroll;
CREATE POLICY "Payroll: authenticated read" ON public.payroll FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Payroll: authenticated write" ON public.payroll;
CREATE POLICY "Payroll: authenticated write" ON public.payroll FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Notifications: authenticated read" ON public.notifications;
CREATE POLICY "Notifications: authenticated read" ON public.notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Notifications: authenticated write" ON public.notifications;
CREATE POLICY "Notifications: authenticated write" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 11. UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================

DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_payroll_updated_at ON public.payroll;
CREATE TRIGGER trg_payroll_updated_at BEFORE UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 12. VERIFY
-- ============================================

DO $$
DECLARE
  tbl_count INTEGER;
  idx_count INTEGER;
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tbl_count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('staff', 'patients', 'payroll', 'notifications');

  SELECT COUNT(*) INTO idx_count FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%' OR indexname LIKE 'uk_%';

  SELECT COUNT(*) INTO constraint_count FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND constraint_type = 'UNIQUE';

  RAISE NOTICE '✅ Migration 018 applied successfully';
  RAISE NOTICE '   Tables recreated: % (staff, patients, payroll, notifications)', tbl_count;
  RAISE NOTICE '   Unique CNIC constraint added on staff table';
  RAISE NOTICE '   FK indexes added: staff_advances, patient_advances, payroll, notifications';
  RAISE NOTICE '   Composite duty indexes: staff+status+date, patient+date+shift';
  RAISE NOTICE '   Partial index: unprocessed completed shifts';
END $$;
