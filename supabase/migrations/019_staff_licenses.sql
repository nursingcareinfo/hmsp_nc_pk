-- ============================================================
-- MIGRATION 019: STAFF LICENSES (PNC License Expiry Monitoring)
-- ============================================================
-- Tracks professional licenses for nursing staff:
--   - PNC (Pakistan Nursing Council) registration
--   - SLC (State Licensed Caregiver)
--   - BLS (Basic Life Support)
--   - ACLS (Advanced Cardiac Life Support)
-- Alerts on approaching/expired licenses (within 30/60/90 days)

CREATE TABLE IF NOT EXISTS public.staff_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,

  -- License details
  license_type TEXT NOT NULL CHECK (license_type IN ('PNC', 'SLC', 'BLS', 'ACLS', 'CNA', 'RN', 'OTHER')),
  license_number TEXT NOT NULL,
  issuing_body TEXT NOT NULL DEFAULT 'Pakistan Nursing Council',
  issue_date DATE,
  expiry_date DATE NOT NULL,

  -- Status: active -> expiring_soon (<=30 days) -> expired -> renewed
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'renewed', 'revoked')),

  -- Document tracking
  document_url TEXT,
  notes TEXT,

  -- Renewal tracking
  renewal_date DATE,
  renewal_cost NUMERIC(10, 2),
  renewed_by TEXT,
  renewed_at TIMESTAMPTZ,

  -- Audit
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: same license number can only exist once
CREATE UNIQUE INDEX IF NOT EXISTS uk_license_number ON public.staff_licenses(license_number);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_licenses_staff ON public.staff_licenses(staff_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON public.staff_licenses(expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON public.staff_licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_type ON public.staff_licenses(license_type);

-- Enable RLS
ALTER TABLE public.staff_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff licenses: authenticated read"
  ON public.staff_licenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff licenses: authenticated write"
  ON public.staff_licenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_staff_licenses_updated_at ON public.staff_licenses;
CREATE TRIGGER trg_staff_licenses_updated_at
  BEFORE UPDATE ON public.staff_licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- AUTO-UPDATE STATUS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_license_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    IF NEW.expiry_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.status := 'expiring_soon';
    ELSE
      NEW.status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_license_status ON public.staff_licenses;
CREATE TRIGGER trg_auto_license_status
  BEFORE INSERT OR UPDATE ON public.staff_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_license_status();

-- ============================================
-- HELPER FUNCTION: Get staff with expiring licenses
-- ============================================

CREATE OR REPLACE FUNCTION public.get_expiring_licenses(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  designation TEXT,
  license_type TEXT,
  license_number TEXT,
  expiry_date DATE,
  days_until_expiry INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.designation,
    sl.license_type,
    sl.license_number,
    sl.expiry_date,
    (sl.expiry_date - CURRENT_DATE)::INTEGER AS days_until_expiry,
    sl.status
  FROM public.staff_licenses sl
  JOIN public.staff s ON s.id = sl.staff_id
  WHERE sl.status IN ('active', 'expiring_soon')
    AND sl.expiry_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    AND sl.expiry_date >= CURRENT_DATE
  ORDER BY sl.expiry_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get all expired licenses
-- ============================================

CREATE OR REPLACE FUNCTION public.get_expired_licenses()
RETURNS TABLE (
  staff_id UUID,
  staff_name TEXT,
  designation TEXT,
  license_type TEXT,
  license_number TEXT,
  expiry_date DATE,
  days_expired INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.designation,
    sl.license_type,
    sl.license_number,
    sl.expiry_date,
    (CURRENT_DATE - sl.expiry_date)::INTEGER AS days_expired
  FROM public.staff_licenses sl
  JOIN public.staff s ON s.id = sl.staff_id
  WHERE sl.status = 'expired'
  ORDER BY sl.expiry_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ staff_licenses table created successfully';
  RAISE NOTICE '   - Tracks PNC, SLC, BLS, ACLS, CNA, RN licenses';
  RAISE NOTICE '   - Auto-updates status: active → expiring_soon → expired';
  RAISE NOTICE '   - Helper functions: get_expiring_licenses(), get_expired_licenses()';
  RAISE NOTICE '   - Unique constraint on license_number';
END $$;
