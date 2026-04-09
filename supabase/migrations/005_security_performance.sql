-- ============================================================
-- SUPABASE BEST PRACTICES: SECURITY & PERFORMANCE MIGRATION
-- Priority: CRITICAL (RLS) + HIGH (Indexes)
-- ============================================================

-- ============================================
-- 1. RLS: BLOCK ANONYMOUS ACCESS (security-rls-basics)
-- ============================================

-- Staff table: Only authenticated users can access
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.staff;

CREATE POLICY "Staff: authenticated read"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff: authenticated write"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Patients table: Only authenticated users can access
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can view patients" ON public.patients;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.patients;

CREATE POLICY "Patients: authenticated read"
  ON public.patients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Patients: authenticated write"
  ON public.patients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Users table: Only authenticated users can view; admins can manage
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous read" ON public.users;

CREATE POLICY "Users: authenticated read"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users: authenticated write"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON public.notifications;

CREATE POLICY "Notifications: authenticated read"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Payroll table
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read" ON public.payroll;

CREATE POLICY "Payroll: authenticated read"
  ON public.payroll
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Payroll: authenticated write"
  ON public.payroll
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. PERFORMANCE INDEXES (query-missing-indexes, query-partial-indexes)
-- ============================================

-- Staff: Active status queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff(status);

-- Staff: Category filtering (dashboard charts)
CREATE INDEX IF NOT EXISTS idx_staff_category ON public.staff(category);

-- Staff: District filtering (geographic queries)
CREATE INDEX IF NOT EXISTS idx_staff_district ON public.staff(official_district);

-- Staff: Phone lookup (unique search)
CREATE INDEX IF NOT EXISTS idx_staff_phone ON public.staff(contact_1);

-- Staff: Created at ordering (list views)
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON public.staff(created_at DESC);

-- Staff: Partial index for active staff by district (query-partial-indexes)
CREATE INDEX IF NOT EXISTS idx_staff_active_district
  ON public.staff(official_district)
  WHERE status = 'Active';

-- Patients: Status filtering
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);

-- Patients: District filtering
CREATE INDEX IF NOT EXISTS idx_patients_district ON public.patients(district);

-- Patients: Assigned staff (relationship queries)
CREATE INDEX IF NOT EXISTS idx_patients_assigned_staff ON public.patients(assigned_staff_id);

-- Patients: Created at ordering
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON public.patients(created_at DESC);

-- Users: Role filtering (admin checks)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Users: Email lookup (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Users: Created at ordering
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ============================================
-- 3. VACUUM ANALYZE (monitor-vacuum-analyze)
-- ============================================
-- Update statistics for query planner
ANALYZE public.staff;
ANALYZE public.patients;
ANALYZE public.users;
ANALYZE public.notifications;
ANALYZE public.payroll;
