-- Migration: 034_add_missing_staff_columns
-- Adds columns that might be missing from older schema versions

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
