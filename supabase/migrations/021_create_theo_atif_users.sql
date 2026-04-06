-- ============================================================
-- CREATE THEO (Manager) and ATIF ALVI (CEO) Users
-- ============================================================
-- After running this, go to Supabase Dashboard → Authentication → Users
-- and set passwords for theo@hmsp.local and atif@hmsp.local

-- 1. Create public.users entries
INSERT INTO public.users (id, email, display_name, role, created_at, updated_at, last_login)
VALUES 
  (gen_random_uuid(), 'theo@hmsp.local', 'THEO', 'staff', now(), now(), now()),
  (gen_random_uuid(), 'atif@hmsp.local', 'ATIF ALVI', 'admin', now(), now(), now())
ON CONFLICT (email) DO NOTHING;

-- 2. Verify
SELECT display_name, email, role, created_at FROM public.users WHERE email IN ('theo@hmsp.local', 'atif@hmsp.local');
