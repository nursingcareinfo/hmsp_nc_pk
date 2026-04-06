-- ============================================================
-- PATIENT ADVANCES TABLE
-- ============================================================
-- Tracks advance payments received FROM patients/clients
-- Auto-generates professional PDF invoices on creation

CREATE TABLE IF NOT EXISTS public.patient_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,

  -- Payment details
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Other')),
  reason TEXT,
  notes TEXT,

  -- Status: received -> adjusted -> refunded
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'adjusted', 'refunded')),

  -- Invoice tracking
  invoice_number TEXT NOT NULL DEFAULT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(FLOOR(RANDOM() * 10000) AS TEXT), 4, '0'),
  invoice_generated BOOLEAN NOT NULL DEFAULT false,

  -- Audit
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_advances_patient ON public.patient_advances(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_advances_date ON public.patient_advances(advance_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_advances_status ON public.patient_advances(status);
CREATE INDEX IF NOT EXISTS idx_patient_advances_invoice ON public.patient_advances(invoice_number);

-- Enable RLS
ALTER TABLE public.patient_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient advances: authenticated read"
  ON public.patient_advances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Patient advances: authenticated write"
  ON public.patient_advances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_patient_advances_updated_at ON public.patient_advances;
CREATE TRIGGER trg_patient_advances_updated_at
  BEFORE UPDATE ON public.patient_advances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- VERIFY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ patient_advances table created successfully';
  RAISE NOTICE '   - Tracks advance payments received FROM patients/clients';
  RAISE NOTICE '   - Auto-generates invoice numbers (INV-YYYYMMDD-XXXX)';
  RAISE NOTICE '   - Status: received -> adjusted -> refunded';
END $$;
