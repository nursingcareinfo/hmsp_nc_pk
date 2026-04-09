-- ============================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================
-- Tracks daily staff attendance (present/absent/late)
-- Linked to duty assignments for automatic marking via shift completion
-- Manual override available for non-duty-day attendance

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  
  -- Attendance status
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  
  -- Shift details (if applicable)
  shift_type TEXT CHECK (shift_type IN ('day', 'night')),
  duty_assignment_id UUID REFERENCES public.duty_assignments(id) ON DELETE SET NULL,
  
  -- Timing
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_hours NUMERIC(4, 1),
  
  -- Notes
  notes TEXT,
  marked_by TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique: one attendance record per staff per day
  UNIQUE(staff_id, attendance_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_staff ON public.attendance_records(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendance: authenticated read"
  ON public.attendance_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Attendance: authenticated write"
  ON public.attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- AUTO-MARK ATTENDANCE ON SHIFT COMPLETION
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_attendance_on_shift_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Insert or update attendance record for the duty date
    INSERT INTO public.attendance_records (
      staff_id, 
      attendance_date, 
      status, 
      shift_type, 
      duty_assignment_id,
      check_in_time,
      check_out_time,
      marked_by
    ) VALUES (
      NEW.staff_id,
      NEW.duty_date,
      'present',
      NEW.shift_type,
      NEW.id,
      NEW.clock_in_time,
      NEW.clock_out_time,
      NEW.assigned_by
    )
    ON CONFLICT (staff_id, attendance_date) DO UPDATE SET
      status = 'present',
      shift_type = NEW.shift_type,
      duty_assignment_id = NEW.id,
      check_in_time = COALESCE(EXCLUDED.check_in_time, attendance_records.check_in_time),
      check_out_time = COALESCE(EXCLUDED.check_out_time, attendance_records.check_out_time),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shift_complete_attendance ON public.duty_assignments;
CREATE TRIGGER trg_shift_complete_attendance
  AFTER UPDATE ON public.duty_assignments
  FOR EACH ROW EXECUTE FUNCTION public.mark_attendance_on_shift_complete();

DO $$
BEGIN
  RAISE NOTICE '✅ Attendance records schema created successfully';
  RAISE NOTICE '   - attendance_records table with daily tracking';
  RAISE NOTICE '   - Auto-marks attendance when duty shift completed';
  RAISE NOTICE '   - Unique constraint: 1 record per staff per day';
END $$;
