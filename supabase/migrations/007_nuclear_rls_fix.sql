-- ============================================================
-- NUCLEAR OPTION: Explicitly revoke anon access, grant to authenticated
-- ============================================================

-- ============================================
-- 1. REVOKE ALL FROM PUBLIC/ANON
-- ============================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- ============================================
-- 2. DROP ALL EXISTING POLICIES
-- ============================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ============================================
-- 3. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE STRICT POLICIES
-- ============================================

-- Staff
CREATE POLICY "staff_access" ON public.staff
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Patients
CREATE POLICY "patients_access" ON public.patients
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Users
CREATE POLICY "users_access" ON public.users
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Notifications
CREATE POLICY "notifications_access" ON public.notifications
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Payroll
CREATE POLICY "payroll_access" ON public.payroll
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 5. VERIFY RLS STATUS
-- ============================================
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('staff', 'patients', 'users', 'notifications', 'payroll')
    LOOP
        IF NOT tbl.rowsecurity THEN
            RAISE NOTICE 'WARNING: RLS not enabled on %', tbl.tablename;
        ELSE
            RAISE NOTICE 'OK: RLS enabled on %', tbl.tablename;
        END IF;
    END LOOP;
END $$;
