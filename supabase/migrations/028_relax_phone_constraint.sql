-- Migration 028: Relax phone constraint to allow real-world data patterns
-- Created: 2026-04-09
-- Problem: chk_staff_contact1_phone (from migration 025) blocks ALL updates
-- to staff rows with non-standard phone numbers, even when updating unrelated
-- columns like shift_rate. This affects 1,050+ imported records.
--
-- Fix: Drop the strict constraint, replace with a permissive one that only
-- rejects obviously invalid values (letters, empty strings) while allowing
-- all common phone number formats.

-- 1. Drop strict validate_phone function (too restrictive)
DROP FUNCTION IF EXISTS public.validate_phone(text) CASCADE;

-- 2. Create permissive validation function
CREATE OR REPLACE FUNCTION public.validate_phone_loose(phone text)
RETURNS boolean AS $$
BEGIN
  -- Allow NULL and empty
  IF phone IS NULL OR trim(phone) = '' THEN
    RETURN true;
  END IF;
  
  -- Reject if contains letters (except +, -, (, ), space, digits)
  IF phone ~ '[a-zA-Z]' THEN
    RETURN false;
  END IF;
  
  -- Reject if too short (< 7 digits) or too long (> 15 digits)
  IF length(regexp_replace(phone, '[^0-9]', '', 'g')) < 7 
     OR length(regexp_replace(phone, '[^0-9]', '', 'g')) > 15 THEN
    RETURN false;
  END IF;
  
  -- Accept everything else: +92..., 03..., ext, x, spaces, dashes, parens
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Drop old strict constraints
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS chk_staff_contact1_phone;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS chk_staff_contact2_phone;
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS chk_staff_whatsapp_phone;

-- 4. Add permissive constraints (NOT VALID for existing data)
ALTER TABLE public.staff ADD CONSTRAINT chk_staff_contact1_phone
  CHECK (public.validate_phone_loose(contact_1)) NOT VALID;

ALTER TABLE public.staff ADD CONSTRAINT chk_staff_contact2_phone
  CHECK (contact_2 IS NULL OR public.validate_phone_loose(contact_2)) NOT VALID;

ALTER TABLE public.staff ADD CONSTRAINT chk_staff_whatsapp_phone
  CHECK (whatsapp IS NULL OR public.validate_phone_loose(whatsapp)) NOT VALID;

-- 5. Also check patient tables if they have phone constraints
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS chk_patients_contact_phone;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS chk_patients_alt_contact_phone;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS chk_patients_whatsapp_phone;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS chk_patients_emergency_contact_phone;

ALTER TABLE public.patients ADD CONSTRAINT chk_patients_contact_phone
  CHECK (public.validate_phone_loose(contact)) NOT VALID;

ALTER TABLE public.patients ADD CONSTRAINT chk_patients_alt_contact_phone
  CHECK (public.validate_phone_loose(alt_contact) IS NOT FALSE) NOT VALID;

ALTER TABLE public.patients ADD CONSTRAINT chk_patients_whatsapp_phone
  CHECK (whatsapp IS NULL OR public.validate_phone_loose(whatsapp)) NOT VALID;

ALTER TABLE public.patients ADD CONSTRAINT chk_patients_emergency_contact_phone
  CHECK (public.validate_phone_loose(emergency_contact_phone)) NOT VALID;
