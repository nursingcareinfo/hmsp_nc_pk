-- ============================================================
-- MARKET RESEARCH ENHANCEMENT: Clinical Acuity + Service Categories
-- Purpose: Capture patient care complexity for market intelligence
-- ============================================================

-- ============================================
-- 1. PATIENT CLINICAL METADATA
-- ============================================

ALTER TABLE public.patients 
  ADD COLUMN IF NOT EXISTS service_category TEXT 
    CHECK (service_category IN (
      'elderly_care',
      'post_operative', 
      'baby_care',
      'chronic_illness',
      'disability_support',
      'palliative_care',
      'wound_care',
      'rehabilitation',
      'mental_health',
      'maternal_care',
      'pediatric',
      'other'
    )),
  
  ADD COLUMN IF NOT EXISTS acuity_level INTEGER 
    CHECK (acuity_level BETWEEN 1 AND 5)
    DEFAULT 1,
  
  ADD COLUMN IF NOT EXISTS primary_condition TEXT,
  ADD COLUMN IF NOT EXISTS comorbidities TEXT[],
  ADD COLUMN IF NOT EXISTS special_equipment TEXT[],
  ADD COLUMN IF NOT EXISTS mobility_status TEXT
    CHECK (mobility_status IN ('independent', 'assisted', 'bed_bound', 'wheelchair'));

COMMENT ON COLUMN patients.service_category IS 'Type of nursing care service required';
COMMENT ON COLUMN patients.acuity_level IS 'Care complexity: 1=Basic ADL, 3=Medication+Monitoring, 5=Critical/Ventilator';
COMMENT ON COLUMN patients.primary_condition IS 'Main diagnosis or condition (free text)';
COMMENT ON COLUMN patients.comorbidities IS 'Additional conditions affecting care';
COMMENT ON COLUMN patients.special_equipment IS 'Equipment needed: ventilator, O2, catheter, etc.';
COMMENT ON COLUMN patients.mobility_status IS 'Patient mobility level affecting staffing needs';

-- ============================================
-- 2. STAFF COMPETENCIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.staff_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  competency_code TEXT NOT NULL,
  competency_name TEXT NOT NULL,
  certification_required BOOLEAN DEFAULT false,
  certification_expiry DATE,
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(staff_id, competency_code)
);

COMMENT ON TABLE staff_competencies IS 'Tracks which nursing skills/certifications each staff member has';
COMMENT ON COLUMN staff_competencies.competency_code IS 'Standardized competency identifier (e.g., WOUND_VAC, TRACHEOSTOMY)';

-- ============================================
-- 3. COMPETENCY REFERENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.competency_reference (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Seed common nursing competencies
INSERT INTO public.competency_reference (code, name, category, description) VALUES
  ('WOUND_VAC', 'Wound VAC Management', 'Wound Care', 'Vacuum-assisted closure device management'),
  ('TRACHEOSTOMY', 'Tracheostomy Care', 'Respiratory', 'Tracheostomy tube maintenance and suctioning'),
  ('TPN', 'Total Parenteral Nutrition', 'IV Therapy', 'TPN administration and line care'),
  ('PICC_LINE', 'PICC Line Management', 'IV Therapy', 'Peripherally inserted central catheter care'),
  ('NGT', 'Nasogastric Tube', 'GI Care', 'NG tube insertion and management'),
  ('CATHETER', 'Urinary Catheter', 'Urology', 'Indwelling catheter care and changes'),
  ('VENTILATOR', 'Ventilator Management', 'Respiratory', 'Mechanical ventilation support'),
  ('NEO_RESUS', 'Neonatal Resuscitation', 'Pediatric', 'NRP-certified newborn resuscitation'),
  ('IV_PUSH', 'IV Push Medications', 'IV Therapy', 'Intravenous medication administration'),
  ('IM_INJECTION', 'IM Injections', 'Medication', 'Intramuscular injection administration'),
  ('PHLEBOTOMY', 'Phlebotomy', 'Diagnostic', 'Blood draw procedures'),
  ('EKG', 'ECG Interpretation', 'Diagnostic', 'Electrocardiogram reading'),
  ('STOMA', 'Stoma Care', 'Wound Care', 'Colostomy/ileostomy care'),
  ('DIALYSIS', 'Dialysis Support', 'Renal', 'Hemodialysis patient monitoring'),
  ('PSYCH', 'Psychiatric Nursing', 'Mental Health', 'Mental health crisis intervention'),
  ('ONCOLOGY', 'Oncology Care', 'Chronic', 'Chemotherapy patient support'),
  ('GERIATRIC', 'Geriatric Assessment', 'Elderly Care', 'Comprehensive elderly care planning'),
  ('PALLIATIVE', 'Palliative Care', 'End of Life', 'Hospice and comfort care'),
  ('PEDIATRIC', 'Pediatric Nursing', 'Pediatric', 'Child and infant care'),
  ('DIABETES', 'Diabetes Management', 'Chronic', 'Insulin therapy and glucose monitoring')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 4. INDEXES FOR ANALYTICS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_patients_service_category ON public.patients(service_category);
CREATE INDEX IF NOT EXISTS idx_patients_acuity ON public.patients(acuity_level);
CREATE INDEX IF NOT EXISTS idx_patients_district ON public.patients(assigned_district);
CREATE INDEX IF NOT EXISTS idx_competencies_staff ON public.staff_competencies(staff_id);
CREATE INDEX IF NOT EXISTS idx_competencies_code ON public.staff_competencies(competency_code);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.staff_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff competencies: authenticated read"
  ON public.staff_competencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff competencies: authenticated write"
  ON public.staff_competencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.competency_reference ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competency reference: authenticated read"
  ON public.competency_reference FOR SELECT TO authenticated USING (true);

-- ============================================
-- 6. VERIFY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Market Research Enhancement: Clinical Acuity + Service Categories';
  RAISE NOTICE '   - patients: service_category, acuity_level, primary_condition, etc.';
  RAISE NOTICE '   - staff_competencies: track nurse certifications';
  RAISE NOTICE '   - competency_reference: 20 seeded nursing competencies';
  RAISE NOTICE '   - Indexes added for analytics queries';
END $$;
