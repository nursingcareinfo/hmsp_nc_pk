-- Create THEO (Manager) and ATIF ALVI (CEO) users
-- Passwords will be set later by admin

-- THEO - Manager
INSERT INTO public.users (id, email, display_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'theo@hmsp.local',
  'THEO',
  'manager',
  true
) ON CONFLICT (email) DO NOTHING;

-- ATIF ALVI - CEO
INSERT INTO public.users (id, email, display_name, role, is_active)
VALUES (
  gen_random_uuid(),
  'atif@hmsp.local',
  'ATIF ALVI',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

-- Create Supabase auth users (password set to placeholder, admin will reset)
-- Note: Supabase auth users are created via the auth schema
-- We'll create them with a temporary password that needs to be changed

DO $$
DECLARE
  theo_id uuid;
  atif_id uuid;
BEGIN
  -- Get the IDs we just inserted
  SELECT id INTO theo_id FROM public.users WHERE email = 'theo@hmsp.local';
  SELECT id INTO atif_id FROM public.users WHERE email = 'atif@hmsp.local';

  -- Create Supabase auth entries with temporary passwords
  -- Password: "changeme123" - admin must reset these
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new,
    recovery_token
  ) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    theo_id,
    'authenticated',
    'authenticated',
    'theo@hmsp.local',
    crypt('changeme123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"THEO","role":"manager"}',
    false, '', '', '', ''
  ) ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, email_change, email_change_token_new,
    recovery_token
  ) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    atif_id,
    'authenticated',
    'authenticated',
    'atif@hmsp.local',
    crypt('changeme123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"ATIF ALVI","role":"admin"}',
    false, '', '', '', ''
  ) ON CONFLICT (email) DO NOTHING;

  RAISE NOTICE '✅ Users created: THEO (Manager) and ATIF ALVI (CEO)';
  RAISE NOTICE '   Temporary password for both: changeme123';
  RAISE NOTICE '   Admin must reset passwords after first login.';
END $$;
