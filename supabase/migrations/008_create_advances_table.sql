-- ============================================================
-- ADVANCE PAYMENTS TABLE
-- Track advances given to staff before salary deduction
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_assigned_id TEXT NOT NULL,
  staff_designation TEXT NOT NULL,
  staff_district TEXT NOT NULL,
  staff_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Deducted', 'Cancelled')),
  deducted_from_salary NUMERIC(10, 2) DEFAULT 0,
  deducted_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_advances_staff ON public.staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_advances_status ON public.staff_advances(status);
CREATE INDEX IF NOT EXISTS idx_advances_date ON public.staff_advances(advance_date DESC);
CREATE INDEX IF NOT EXISTS idx_advances_created ON public.staff_advances(created_at DESC);

-- Enable RLS
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Advances: authenticated read"
  ON public.staff_advances
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Advances: authenticated write"
  ON public.staff_advances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
