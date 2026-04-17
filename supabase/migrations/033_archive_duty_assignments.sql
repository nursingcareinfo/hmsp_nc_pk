DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'duty_assignments_archive') THEN
    CREATE TABLE public.duty_assignments_archive AS SELECT * FROM public.duty_assignments WITH NO DATA;
    ALTER TABLE public.duty_assignments_archive ADD COLUMN archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE public.duty_assignments_archive ADD COLUMN original_user_id UUID;
    INSERT INTO public.duty_assignments_archive SELECT *, NOW(), NULL FROM public.duty_assignments;
  END IF;
END $$;

ALTER TABLE public.duty_assignments ALTER COLUMN staff_id DROP NOT NULL;
ALTER TABLE public.duty_assignments ALTER COLUMN patient_id DROP NOT NULL;

UPDATE public.duty_assignments SET staff_id = NULL;
UPDATE public.duty_assignments SET patient_id = NULL;

DELETE FROM public.staff;
DELETE FROM public.patients;
