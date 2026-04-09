# Changelog

All notable changes to HMSP Nursing Care Management will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Staff Matching Modal** — Added 50ms delay before modal close to prevent race condition where detail panel shows stale "Assign Now" button after successful assignment
- **Phone Validation** — Fixed Pakistan mobile number normalization to accept 12-digit format (+92XXXXXXXXXX) instead of 13-digit; rejects landlines and invalid lengths
- **Placeholder Phones** — WhatsApp contact import now uses detectable +92999-XXXXXXX format instead of fake numbers that could conflict with real contacts
- **Import Scripts** — Added proper error handling, context managers, and CSV path validation to `import_staff.py` and `import_whatsapp_contacts.py`

### Changed
- **Supabase Credentials** — Removed hardcoded API key from `migrate_local_to_remote.py`; now requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables
- **DB Configuration** — Database password now configurable via `DB_PASSWORD` environment variable (defaults to 'postgres')
- **WhatsApp Contacts** — Externalized from Python code to `whatsapp_contacts.json` for easier editing
- **Transform Functions** — Refactored `transform_to_remote()` into 4 sub-functions (`_build_contact_info`, `_build_personal_info`, `_build_financial`, `_build_metadata`)

### Added
- **DB Queries Skill** — Installed `/db-queries` skill for safe, parameterized PostgreSQL queries with safety guardrails
- **Dashboard** — Added HTML dashboard at `dashboard.html` showing staff counts by category, source (CSV/WhatsApp), and phone collection status
- **Environment Templates** — Added `.env.example` with Supabase and Gemini API key placeholders
- **LeanSpec Workflow** — Added standardized npm scripts (`typecheck`, `pre-push`, `pre-release`), CHANGELOG.md, CI workflows, and pre-commit hooks

### Security
- **API Key Exposure** — Removed hardcoded Supabase anon key from version-controlled source code
- **Input Validation** — Phone normalization now rejects invalid formats instead of guessing

## [0.0.0] - 2026-04-01

### Added
- Initial project setup with React 19 + Vite + TypeScript
- Supabase Cloud integration (project: euxzitqllnltlteckeyq)
- Staff management with 1,321 records (16 migrations)
- Patient management with CRUD operations
- Duty assignment system (Day/Night shifts)
- Attendance calendar with color-coded tracking
- Payroll system (flat rate per shift)
- Advance payments with staff card integration
- WhatsApp integration for contact import and broadcast lists
- Google Gemini AI integration for live feed analysis
- Dark mode default theme with Tailwind CSS 4
- Zustand state management + TanStack React Query caching
