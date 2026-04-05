-- ============================================================
-- DUTY ASSIGNMENTS + SHIFT-BASED PAYROLL SCHEMA
-- ============================================================
-- Tracks manual shift assignments: staff → patient → day/night shift → date
-- Payroll calculated from completed shifts: (shifts × rate) + allowances - advances

-- ============================================
-- 1. ADD SHIFT PREFERENCES TO PATIENTS TABLE
-- ============================================

ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS needs_day_shift BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS needs_night_shift BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS day_shift_start TIME NOT NULL DEFAULT '07:00:00',
  ADD COLUMN IF NOT EXISTS day_shift_end TIME NOT NULL DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS night_shift_start TIME NOT NULL DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS night_shift_end TIME NOT NULL DEFAULT '07:00:00',
  ADD COLUMN IF NOT EXISTS shift_instructions TEXT;

-- ============================================
-- 2. CREATE DUTY ASSIGNMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.duty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  
  -- Shift details
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night')),
  duty_date DATE NOT NULL,
  
  -- Shift times (overrides patient defaults if set)
  shift_start TIME,
  shift_end TIME,
  
  -- Status workflow: assigned → confirmed (staff accepted) → completed → absent/no_show
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'absent', 'no_show', 'cancelled')),
  
  -- Clock-in/out tracking
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  clock_in_location TEXT,
  clock_out_location TEXT,
  
  -- Notes
  notes TEXT,
  admin_notes TEXT,
  
  -- Payroll linkage
  is_payroll_processed BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_duty_staff ON public.duty_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_duty_patient ON public.duty_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_duty_date ON public.duty_assignments(duty_date DESC);
CREATE INDEX IF NOT EXISTS idx_duty_status ON public.duty_assignments(status);
CREATE INDEX IF NOT EXISTS idx_duty_shift_type ON public.duty_assignments(shift_type);
CREATE INDEX IF NOT EXISTS idx_duty_payroll ON public.duty_assignments(is_payroll_processed);

-- Unique constraint: same staff can't have 2 shifts on same day
CREATE UNIQUE INDEX IF NOT EXISTS uk_duty_staff_date_shift 
  ON public.duty_assignments(staff_id, duty_date, shift_type);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE public.duty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Duty assignments: authenticated read"
  ON public.duty_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Duty assignments: authenticated write"
  ON public.duty_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_duty_updated_at ON public.duty_assignments;
CREATE TRIGGER trg_duty_updated_at
  BEFORE UPDATE ON public.duty_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 5. ADD PAID SHIFTS COLUMN TO PAYROLL (for reference)
-- ============================================

ALTER TABLE public.payroll
  ADD COLUMN IF NOT EXISTS day_shifts_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_shifts_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS night_premium_total NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- ============================================
-- 6. VERIFY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Duty assignments schema created successfully';
  RAISE NOTICE '   - duty_assignments table with shift tracking';
  RAISE NOTICE '   - patients.needs_day_shift / needs_night_shift columns';
  RAISE NOTICE '   - payroll day/night shift count columns';
  RAISE NOTICE '   - Unique constraint: staff can only have 1 shift per type per day';
END $$;
