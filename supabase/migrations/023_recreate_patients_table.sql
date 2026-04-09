-- ============================================================
-- MIGRATION 023: RECREATE PATIENTS TABLE FROM SCRATCH
-- ============================================================
-- Safe to run whether table exists or not.
-- Creates fresh patients table with correct schema.

-- ============================================
-- 1. CLEANUP (safe if table doesn't exist)
-- ============================================

-- Drop the table CASCADE - this removes all dependent triggers, indexes, etc.
DROP TABLE IF EXISTS public.patients CASCADE;

-- Drop sequence if it exists from old migration
DROP SEQUENCE IF EXISTS public.patient_assigned_id_seq;

-- Drop old trigger function
DROP FUNCTION IF EXISTS public.trg_generate_patient_id_assigned();

-- ============================================
-- 2. CREATE PATIENTS TABLE
-- ============================================

CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- Basic Info
  full_name TEXT,
  cnic TEXT,
  contact TEXT,
  alt_contact TEXT,
  email TEXT,
  whatsapp TEXT,
  address TEXT,
  area TEXT,
  city TEXT,
  district TEXT,
  status TEXT,
  admission_date DATE,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  marital_status TEXT,
  
  -- Guardian Info
  guardian_name TEXT,
  guardian_contact TEXT,
  guardian_cnic TEXT,
  guardian_relationship TEXT,
  
  -- Medical Info
  medical_condition TEXT,
  primary_diagnosis TEXT,
  current_condition TEXT,
  current_medications TEXT,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_phone TEXT,
  
  -- Doctor Info
  doctor_name TEXT,
  doctor_specialty TEXT,
  doctor_hospital TEXT,
  doctor_phone TEXT,
  doctor_notes TEXT,
  
  -- Service Info
  special_requirements TEXT,
  service_type TEXT,
  frequency TEXT,
  duration TEXT,
  
  -- Billing
  billing_package TEXT,
  billing_rate NUMERIC(12, 2),
  payment_method TEXT,
  advance_payment_received NUMERIC(12, 2),
  advance_payment_date DATE,
  
  -- Relations
  assigned_staff_id UUID,
  
  -- Array Columns
  medical_requirements TEXT[],
  equipment_requirements TEXT[],
  cnic_image_urls TEXT[],
  form_image_urls TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Shift Preferences
  needs_day_shift BOOLEAN NOT NULL DEFAULT true,
  needs_night_shift BOOLEAN NOT NULL DEFAULT true,
  day_shift_start TIME NOT NULL DEFAULT '07:00:00',
  day_shift_end TIME NOT NULL DEFAULT '19:00:00',
  night_shift_start TIME NOT NULL DEFAULT '19:00:00',
  night_shift_end TIME NOT NULL DEFAULT '07:00:00',
  shift_instructions TEXT,
  
  -- Service End Tracking
  end_reason TEXT,
  end_date DATE,
  end_notes TEXT,
  
  -- Auto-assigned patient ID
  patient_id_assigned TEXT,
  
  -- Constraints
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  
  CONSTRAINT fk_patients_assigned_staff 
    FOREIGN KEY (assigned_staff_id) REFERENCES public.staff (id) ON DELETE SET NULL,
  
  CONSTRAINT patients_end_reason_check CHECK (
    end_reason IS NULL OR end_reason = ANY (ARRAY['recovered', 'deceased', 'contract_cancelled', 'dissatisfied'])
  ),
  
  CONSTRAINT patients_status_check CHECK (
    status = ANY (ARRAY['Active', 'Pending', 'Discharged', 'Deceased', 'Cancelled', 'Dissatisfied'])
  )
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX idx_patients_status ON public.patients USING btree (status);
CREATE INDEX idx_patients_district ON public.patients USING btree (district);
CREATE INDEX idx_patients_assigned_staff ON public.patients USING btree (assigned_staff_id);
CREATE INDEX idx_patients_created_at ON public.patients USING btree (created_at DESC);
CREATE INDEX idx_patients_end_reason ON public.patients USING btree (end_reason) WHERE (end_reason IS NOT NULL);
CREATE UNIQUE INDEX uk_patient_id_assigned ON public.patients USING btree (patient_id_assigned) WHERE (patient_id_assigned IS NOT NULL);

-- ============================================
-- 4. AUTO PATIENT ID TRIGGER
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.patient_assigned_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.trg_generate_patient_id_assigned()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  IF NEW.patient_id_assigned IS NULL OR NEW.patient_id_assigned = '' THEN
    next_id := nextval('public.patient_assigned_id_seq');
    NEW.patient_id_assigned := 'NC-PAT-' || LPAD(next_id::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_patient_id_assigned
  BEFORE INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_generate_patient_id_assigned();

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients: authenticated read" ON public.patients 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Patients: authenticated write" ON public.patients 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 7. VERIFY
-- ============================================

DO $$
DECLARE
  col_count INTEGER;
  idx_count INTEGER;
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'patients';
  
  SELECT COUNT(*) INTO idx_count 
  FROM pg_indexes 
  WHERE schemaname = 'public' AND tablename = 'patients';
  
  SELECT COUNT(*) INTO trigger_count 
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'patients' AND NOT t.tgisinternal;
  
  RAISE NOTICE 'Migration 023: Patients table recreated from scratch';
  RAISE NOTICE '   Columns: %', col_count;
  RAISE NOTICE '   Indexes: %', idx_count;
  RAISE NOTICE '   Triggers: %', trigger_count;
  RAISE NOTICE '   RLS: enabled';
  RAISE NOTICE '   Auto patient_id: NC-PAT-0001, NC-PAT-0002, ...';
END $$;
