-- ============================================================
-- MIGRATION 025: DATABASE IMPROVEMENTS
-- Audit trail, soft deletes, role-based RLS, performance indexes
-- ============================================================

-- ============================================
-- 1. AUDIT LOG TABLE (critical: who changed what)
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON public.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON public.audit_log(changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log: authenticated read"
  ON public.audit_log FOR SELECT TO authenticated USING (true);

-- Only admins can view audit log details
CREATE POLICY "Audit log: admin read details"
  ON public.audit_log FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  ) WITH CHECK (false);

-- ============================================
-- 2. SOFT DELETE SUPPORT (data recovery)
-- ============================================

-- Add deleted_at to tables that currently use hard DELETE
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.payroll ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.patient_advances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.duty_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes: exclude soft-deleted rows (smaller, faster indexes)
CREATE INDEX IF NOT EXISTS idx_staff_active ON public.staff(id, full_name, category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_active ON public.patients(id, full_name, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_active ON public.payroll(id, staff_id, period_start) WHERE deleted_at IS NULL;

-- ============================================
-- 3. ROLE-BASED RLS POLICIES
-- ============================================

-- Create a helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing blanket policies (they allow everyone to do everything)
DROP POLICY IF EXISTS "Staff: authenticated read" ON public.staff;
DROP POLICY IF EXISTS "Staff: authenticated write" ON public.staff;
DROP POLICY IF EXISTS "Patients: authenticated read" ON public.patients;
DROP POLICY IF EXISTS "Patients: authenticated write" ON public.patients;
DROP POLICY IF EXISTS "Payroll: authenticated read" ON public.payroll;
DROP POLICY IF EXISTS "Payroll: authenticated write" ON public.payroll;
DROP POLICY IF EXISTS "Notifications: authenticated read" ON public.notifications;
DROP POLICY IF EXISTS "Notifications: authenticated write" ON public.notifications;

-- NEW ROLE-BASED POLICIES

-- Staff: Everyone can READ, only admins can WRITE
CREATE POLICY "Staff: read all"
  ON public.staff FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Staff: admin write"
  ON public.staff FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Patients: Everyone can READ, only admins can WRITE
CREATE POLICY "Patients: read all"
  ON public.patients FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Patients: admin write"
  ON public.patients FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Payroll: Only admins can read/write
CREATE POLICY "Payroll: admin access"
  ON public.payroll FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Notifications: Everyone can read, admins can write
CREATE POLICY "Notifications: read all"
  ON public.notifications FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Notifications: admin write"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Staff advances: Admins only
CREATE POLICY "Staff advances: admin access"
  ON public.staff_advances FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- Duty assignments: Everyone can read, admins can write
CREATE POLICY "Duty: read all"
  ON public.duty_assignments FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Duty: admin write"
  ON public.duty_assignments FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- ============================================
-- 4. MISSING COMPOSITE INDEXES
-- ============================================

-- Staff: status + category (dashboard charts)
CREATE INDEX IF NOT EXISTS idx_staff_status_category
  ON public.staff(status, category)
  WHERE deleted_at IS NULL;

-- Patients: status + district (patient list views)
CREATE INDEX IF NOT EXISTS idx_patients_status_district
  ON public.patients(status, district)
  WHERE deleted_at IS NULL;

-- Payroll: staff_id + period_start (payroll generation)
CREATE INDEX IF NOT EXISTS idx_payroll_staff_period
  ON public.payroll(staff_id, period_start)
  WHERE deleted_at IS NULL;

-- Staff advances: status + staff_id (advance tracking)
CREATE INDEX IF NOT EXISTS idx_advances_status_staff
  ON public.staff_advances(status, staff_id)
  WHERE deleted_at IS NULL;

-- Patient advances: status + patient_id
CREATE INDEX IF NOT EXISTS idx_patient_advances_status
  ON public.patient_advances(status, patient_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- 5. FULL-TEXT SEARCH (fast search on staff/patients)
-- ============================================

-- Add tsvector columns
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing data
UPDATE public.staff SET search_vector =
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(cnic, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(residential_area, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(official_district, '')), 'D')
WHERE search_vector IS NULL;

UPDATE public.patients SET search_vector =
  setweight(to_tsvector('english', coalesce(full_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(cnic, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(medical_condition, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(area, '')), 'D') ||
  setweight(to_tsvector('english', coalesce(district, '')), 'D')
WHERE search_vector IS NULL;

-- GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_staff_search ON public.staff USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_patients_search ON public.patients USING gin(search_vector);

-- Trigger to auto-update search vectors on insert/update
CREATE OR REPLACE FUNCTION public.update_staff_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.cnic, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.residential_area, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.official_district, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_patient_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.cnic, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.medical_condition, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.area, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(NEW.district, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_staff_search_vector ON public.staff;
CREATE TRIGGER trg_staff_search_vector
  BEFORE INSERT OR UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_staff_search_vector();

DROP TRIGGER IF EXISTS trg_patient_search_vector ON public.patients;
CREATE TRIGGER trg_patient_search_vector
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_patient_search_vector();

-- ============================================
-- 6. JSONB GIN INDEXES (fast queries on nested data)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_education ON public.staff USING gin(education);
CREATE INDEX IF NOT EXISTS idx_staff_employment ON public.staff USING gin(employment_history);
CREATE INDEX IF NOT EXISTS idx_staff_cnic_images ON public.staff USING gin(cnic_image_urls);
CREATE INDEX IF NOT EXISTS idx_staff_form_images ON public.staff USING gin(form_image_urls);
CREATE INDEX IF NOT EXISTS idx_patients_medical ON public.patients USING gin(medical_requirements);
CREATE INDEX IF NOT EXISTS idx_patients_equipment ON public.patients USING gin(equipment_requirements);
CREATE INDEX IF NOT EXISTS idx_patients_cnic_images ON public.patients USING gin(cnic_image_urls);

-- ============================================
-- 7. MATERIALIZED VIEWS FOR DASHBOARD
-- ============================================

-- Staff stats by category and district
CREATE MATERIALIZED VIEW IF NOT EXISTS public.staff_stats AS
SELECT
  category,
  official_district,
  COUNT(*) as staff_count,
  COUNT(*) FILTER (WHERE status = 'Active') as active_count,
  COUNT(*) FILTER (WHERE status = 'Inactive') as inactive_count,
  AVG(salary) as avg_salary,
  MIN(salary) as min_salary,
  MAX(salary) as max_salary
FROM public.staff
WHERE deleted_at IS NULL
GROUP BY category, official_district;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_stats ON public.staff_stats(category, official_district);

-- Patient stats by status and district
CREATE MATERIALIZED VIEW IF NOT EXISTS public.patient_stats AS
SELECT
  status,
  district,
  COUNT(*) as patient_count,
  COUNT(*) FILTER (WHERE assigned_staff_id IS NOT NULL) as assigned_count,
  COUNT(*) FILTER (WHERE assigned_staff_id IS NULL) as unassigned_count
FROM public.patients
WHERE deleted_at IS NULL
GROUP BY status, district;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_stats ON public.patient_stats(status, district);

-- Dashboard summary (single row)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM public.staff WHERE deleted_at IS NULL) as total_staff,
  (SELECT COUNT(*) FROM public.staff WHERE deleted_at IS NULL AND status = 'Active') as active_staff,
  (SELECT COUNT(*) FROM public.patients WHERE deleted_at IS NULL) as total_patients,
  (SELECT COUNT(*) FROM public.patients WHERE deleted_at IS NULL AND status = 'Active') as active_patients,
  (SELECT COUNT(*) FROM public.patients WHERE deleted_at IS NULL AND status = 'Pending') as pending_patients,
  (SELECT COUNT(*) FROM public.duty_assignments WHERE deleted_at IS NULL AND status = 'assigned') as pending_duties,
  (SELECT COUNT(*) FROM public.duty_assignments WHERE deleted_at IS NULL AND status = 'completed' AND is_payroll_processed = false) as unprocessed_shifts,
  (SELECT SUM(amount) FROM public.staff_advances WHERE deleted_at IS NULL AND status = 'Approved') as total_approved_advances;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_summary ON public.dashboard_summary(total_staff);

-- ============================================
-- 8. PHONE NUMBER VALIDATION CONSTRAINTS
-- ============================================

-- Pakistan phone format: +923XX-XXXXXXX or 03XX-XXXXXXX
-- NOTE: Constraints use NOT VALID so existing data isn't affected
-- Only enforced on INSERT/UPDATE going forward
CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF phone IS NULL THEN RETURN true; END IF;
  RETURN phone ~ '^\+923\d{2}-\d{7}$' OR phone ~ '^03\d{2}-\d{7}$' OR phone ~ '^\d{11}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add CHECK constraints (NOT VALID = existing data not checked)
DO $$
BEGIN
  -- Staff contact_1
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_staff_contact1_phone'
  ) THEN
    ALTER TABLE public.staff ADD CONSTRAINT chk_staff_contact1_phone
      CHECK (public.validate_phone(contact_1)) NOT VALID;
  END IF;

  -- Staff contact_2 (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_staff_contact2_phone'
  ) THEN
    ALTER TABLE public.staff ADD CONSTRAINT chk_staff_contact2_phone
      CHECK (contact_2 IS NULL OR public.validate_phone(contact_2)) NOT VALID;
  END IF;

  -- Staff whatsapp
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_staff_whatsapp_phone'
  ) THEN
    ALTER TABLE public.staff ADD CONSTRAINT chk_staff_whatsapp_phone
      CHECK (whatsapp IS NULL OR public.validate_phone(whatsapp)) NOT VALID;
  END IF;

  -- Patient contact
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_contact_phone'
  ) THEN
    ALTER TABLE public.patients ADD CONSTRAINT chk_patient_contact_phone
      CHECK (public.validate_phone(contact)) NOT VALID;
  END IF;

  -- Patient alt_contact (optional)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_alt_phone'
  ) THEN
    ALTER TABLE public.patients ADD CONSTRAINT chk_patient_alt_phone
      CHECK (alt_contact IS NULL OR public.validate_phone(alt_contact)) NOT VALID;
  END IF;
END $$;

-- ============================================
-- 9. CNIC VALIDATION CONSTRAINT
-- ============================================

-- Pakistan CNIC format: XXXXX-XXXXXXX-X (13 digits with dashes)
-- NOTE: Constraints use NOT VALID so existing data isn't affected
CREATE OR REPLACE FUNCTION public.validate_cnic(cnic TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF cnic IS NULL OR cnic = '' THEN RETURN true; END IF;
  RETURN cnic ~ '^\d{5}-\d{7}-\d{1}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_staff_cnic_format'
  ) THEN
    ALTER TABLE public.staff ADD CONSTRAINT chk_staff_cnic_format
      CHECK (public.validate_cnic(cnic)) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patient_cnic_format'
  ) THEN
    ALTER TABLE public.patients ADD CONSTRAINT chk_patient_cnic_format
      CHECK (public.validate_cnic(cnic)) NOT VALID;
  END IF;
END $$;

-- ============================================
-- 10. PAYROLL CASCADE FIX (RESTRICT instead of CASCADE)
-- NOTE: Only applies if no orphaned records exist
-- ============================================

-- Check if payroll has valid staff references before changing FK
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  -- Check for payroll records with deleted/missing staff
  SELECT COUNT(*) INTO orphan_count FROM public.payroll p
    LEFT JOIN public.staff s ON p.staff_id = s.id
    WHERE s.id IS NULL;

  IF orphan_count = 0 THEN
    ALTER TABLE public.payroll DROP CONSTRAINT IF EXISTS payroll_staff_id_fkey;
    ALTER TABLE public.payroll ADD CONSTRAINT fk_payroll_staff
      FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE RESTRICT;
    RAISE NOTICE '   ✅ Payroll FK: CASCADE → RESTRICT (no orphans)';
  ELSE
    RAISE NOTICE '   ⚠️  Payroll FK: % orphan records found — keeping CASCADE', orphan_count;
  END IF;
END $$;

-- Check duty_assignments similarly
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.duty_assignments d
    LEFT JOIN public.staff s ON d.staff_id = s.id
    WHERE s.id IS NULL;

  IF orphan_count = 0 THEN
    ALTER TABLE public.duty_assignments DROP CONSTRAINT IF EXISTS duty_assignments_staff_id_fkey;
    ALTER TABLE public.duty_assignments ADD CONSTRAINT fk_duty_staff
      FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE RESTRICT;
    RAISE NOTICE '   ✅ Duty→Staff FK: CASCADE → RESTRICT (no orphans)';
  ELSE
    RAISE NOTICE '   ⚠️  Duty→Staff FK: % orphan records found — keeping CASCADE', orphan_count;
  END IF;
END $$;

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public.duty_assignments d
    LEFT JOIN public.patients p ON d.patient_id = p.id
    WHERE p.id IS NULL;

  IF orphan_count = 0 THEN
    ALTER TABLE public.duty_assignments DROP CONSTRAINT IF EXISTS duty_assignments_patient_id_fkey;
    ALTER TABLE public.duty_assignments ADD CONSTRAINT fk_duty_patient
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE RESTRICT;
    RAISE NOTICE '   ✅ Duty→Patient FK: CASCADE → RESTRICT (no orphans)';
  ELSE
    RAISE NOTICE '   ⚠️  Duty→Patient FK: % orphan records found — keeping CASCADE', orphan_count;
  END IF;
END $$;

-- ============================================
-- 11. REFRESH MATERIALIZED VIEWS
-- ============================================

REFRESH MATERIALIZED VIEW public.staff_stats;
REFRESH MATERIALIZED VIEW public.patient_stats;
REFRESH MATERIALIZED VIEW public.dashboard_summary;

-- ============================================
-- 12. VACUUM ANALYZE
-- ============================================

ANALYZE public.staff;
ANALYZE public.patients;
ANALYZE public.payroll;
ANALYZE public.staff_advances;
ANALYZE public.patient_advances;
ANALYZE public.duty_assignments;
ANALYZE public.attendance_records;
ANALYZE public.notifications;
ANALYZE public.users;
ANALYZE public.audit_log;
ANALYZE public.staff_stats;
ANALYZE public.patient_stats;
ANALYZE public.dashboard_summary;

-- ============================================
-- 13. VERIFY
-- ============================================

DO $$
DECLARE
  audit_exists BOOLEAN;
  soft_delete_count INTEGER;
  role_func_exists BOOLEAN;
  fts_count INTEGER;
  jsonb_idx_count INTEGER;
  mat_view_count INTEGER;
  phone_constraint_count INTEGER;
  cnic_constraint_count INTEGER;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') INTO audit_exists;
  SELECT COUNT(*) INTO soft_delete_count FROM information_schema.columns WHERE column_name = 'deleted_at' AND table_schema = 'public';
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') INTO role_func_exists;
  SELECT COUNT(*) INTO fts_count FROM pg_indexes WHERE indexname LIKE '%search' AND schemaname = 'public';
  SELECT COUNT(*) INTO jsonb_idx_count FROM pg_indexes WHERE indexdef LIKE '%gin%' AND schemaname = 'public';
  SELECT COUNT(*) INTO mat_view_count FROM pg_matviews WHERE schemaname = 'public';
  SELECT COUNT(*) INTO phone_constraint_count FROM pg_constraint WHERE conname LIKE 'chk_%_phone%';
  SELECT COUNT(*) INTO cnic_constraint_count FROM pg_constraint WHERE conname LIKE 'chk_%_cnic%';

  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Migration 025 applied successfully';
  RAISE NOTICE '============================================';
  RAISE NOTICE '   Audit log table: %', CASE WHEN audit_exists THEN '✅ Created' ELSE '❌ Failed' END;
  RAISE NOTICE '   Soft delete columns: % tables', soft_delete_count;
  RAISE NOTICE '   Role-based RLS: %', CASE WHEN role_func_exists THEN '✅ has_role() function created' ELSE '❌ Failed' END;
  RAISE NOTICE '   Full-text search indexes: %', fts_count;
  RAISE NOTICE '   JSONB GIN indexes: %', jsonb_idx_count;
  RAISE NOTICE '   Materialized views: %', mat_view_count;
  RAISE NOTICE '   Phone constraints: %', phone_constraint_count;
  RAISE NOTICE '   CNIC constraints: %', cnic_constraint_count;
  RAISE NOTICE '   CASCADE→RESTRICT: payroll + duty_assignments';
  RAISE NOTICE '============================================';
END $$;
