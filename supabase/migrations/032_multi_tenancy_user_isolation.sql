DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_archive') THEN
    CREATE TABLE public.staff_archive AS SELECT * FROM public.staff WITH NO DATA;
    ALTER TABLE public.staff_archive ADD COLUMN archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE public.staff_archive ADD COLUMN original_user_id UUID;
    ALTER TABLE public.staff_archive ADD COLUMN archive_reason TEXT DEFAULT 'multi-tenancy-migration';
    INSERT INTO public.staff_archive SELECT *, NOW(), NULL, 'multi-tenancy-migration' FROM public.staff;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients_archive') THEN
    CREATE TABLE public.patients_archive AS SELECT * FROM public.patients WITH NO DATA;
    ALTER TABLE public.patients_archive ADD COLUMN archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE public.patients_archive ADD COLUMN original_user_id UUID;
    ALTER TABLE public.patients_archive ADD COLUMN archive_reason TEXT DEFAULT 'multi-tenancy-migration';
    INSERT INTO public.patients_archive SELECT *, NOW(), NULL, 'multi-tenancy-migration' FROM public.patients;
  END IF;
END $$;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Staff: authenticated read" ON public.staff;
DROP POLICY IF EXISTS "Staff: authenticated write" ON public.staff;
DROP POLICY IF EXISTS "Staff competencies: authenticated read" ON public.staff;
DROP POLICY IF EXISTS "Patients: authenticated read" ON public.patients;
DROP POLICY IF EXISTS "Patients: authenticated write" ON public.patients;
DROP POLICY IF EXISTS "Patients competencies: authenticated read" ON public.patients;

DROP POLICY IF EXISTS "staff_own_data_read" ON public.staff;
DROP POLICY IF EXISTS "staff_own_data_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_own_data_update" ON public.staff;
DROP POLICY IF EXISTS "staff_own_data_delete" ON public.staff;
DROP POLICY IF EXISTS "patients_own_data_read" ON public.patients;
DROP POLICY IF EXISTS "patients_own_data_insert" ON public.patients;
DROP POLICY IF EXISTS "patients_own_data_update" ON public.patients;
DROP POLICY IF EXISTS "patients_own_data_delete" ON public.patients;

CREATE POLICY "staff_own_data_read" ON public.staff FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "staff_own_data_insert" ON public.staff FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff_own_data_update" ON public.staff FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "staff_own_data_delete" ON public.staff FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "patients_own_data_read" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "patients_own_data_insert" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patients_own_data_update" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "patients_own_data_delete" ON public.patients FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_archive_read" ON public.staff_archive;
CREATE POLICY "staff_archive_read" ON public.staff_archive FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "patients_archive_read" ON public.patients_archive;
CREATE POLICY "patients_archive_read" ON public.patients_archive FOR SELECT USING (auth.role() = 'authenticated');
