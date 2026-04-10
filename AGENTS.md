# AGENTS.md - HMSP Nursing Care Management

**Generated:** 2026-04-07 | **Commit:** $(git rev-parse --short HEAD) | **Branch:** $(git branch --show-current)

## Overview
Home nursing staff management system for Karachi, Pakistan (H.M.S.P).
React 19 + Vite + TypeScript + Supabase + Google Gemini AI.

## Structure
```
hmsp_nc_pk_repo/
├── src/
│   ├── components/          # React components (PatientModule, StaffMatchingModal, etc.)
│   ├── services/            # Business logic (matchingService, dataService)
│   ├── types/               # TypeScript types (Staff, Patient, etc.)
│   ├── assets/              # Static assets (logo, images)
│   └── App.tsx              # Root component + routing
├── supabase/                # Supabase migrations (16 applied)
├── .github/workflows/       # CI/CD (ci.yml, publish.yml)
├── scripts/                 # Pre-push, pre-commit hooks
└── supabase-local/          # Local PostgreSQL (parent directory)
```

## WHERE TO LOOK
| Task | Location |
|------|----------|
| Patient CRUD | `src/components/PatientModule.tsx` |
| Staff matching | `src/components/StaffMatchingModal.tsx` |
| Database operations | `src/dataService.ts` |
| Staff-patient matching logic | `src/services/matchingService.ts` |
| Type definitions | `src/types/index.ts` |
| Supabase schema | `supabase/migrations/` |
| CI/CD | `.github/workflows/` |

## CONVENTIONS
- **Package manager**: npm (LeanSpec uses pnpm, we use npm)
- **Type checking**: ALWAYS run `npm run typecheck` before marking work complete
- **Component size**: Max 500 lines, extract sub-components
- **Error handling**: Try/catch with toast notifications for all Supabase operations
- **State management**: Zustand for global state, React Query for server state
- **Styling**: Tailwind CSS 4 (dark mode default)
- **Form validation**: Zod schemas + React Hook Form
- **Phone format**: +923XX-XXXXXXX (Pakistan mobile)
- **CNIC format**: XXXXX-XXXXXXX-X (13 digits with dashes)

## ANTI-PATTERNS
- ❌ Hardcoded API keys — use `process.env.VITE_*` or `.env`
- ❌ Console.log in production code — use Sonner toasts
- ❌ Silent error swallowing — always log or toast
- ❌ Direct Supabase calls in components — use dataService
- ❌ Mutating state directly — always use setters
- ❌ Deep nesting (>4 levels) — extract functions
- ❌ Files >800 lines — split into sub-components

## COMMANDS
```bash
# Development
npm run dev              # Start dev server on port 3000
npm run build            # Production build
npm run preview          # Preview production build
npm run clean            # Remove dist/

# Quality gates (LeanSpec style)
npm run typecheck        # TypeScript type check (NEVER SKIP)
npm run lint             # Alias for typecheck
npm run format           # Prettier formatting
npm run pre-push         # typecheck + build (runs before git push)
npm run pre-release      # typecheck + build + clean

# CI/CD
npm run pre-push         # Local equivalent of CI check
```

## TESTING REQUIREMENTS
- **Type checking**: 100% pass rate required (tsc --noEmit)
- **Build**: Must succeed before push
- **E2E**: Critical flows (patient CRUD, staff assignment) via Playwright
- **Coverage target**: 80%+ for business logic (matchingService, dataService)

## SECURITY CHECKLIST
- [ ] No hardcoded secrets in source code
- [ ] Supabase RLS policies enabled on all tables
- [ ] Input validation with Zod at all API boundaries
- [ ] Environment variables for all credentials
- [ ] HTTPS enforced in production
- [ ] No sensitive data in error messages
- [ ] No secrets logged to console

## GIT WORKFLOW
- **Branch naming**: `feature/description`, `fix/description`
- **Commit format**: `type: description` (feat, fix, chore, docs, refactor)
- **Pre-push**: `npm run pre-push` runs typecheck + build
- **PR required**: All changes to main go through PR
- **Squash merge**: Keep history clean

## LEANSPEC PATTERNS ADOPTED
1. **Typecheck gate**: `npm run typecheck` is mandatory before any commit
2. **Pre-push validation**: Typecheck + build + secret scan
3. **Changelog**: Keep-a-Changelog format in CHANGELOG.md
4. **CI workflows**: ci.yml (typecheck, build, lint, security) + publish.yml
5. **Pre-commit hooks**: Block commits with hardcoded secrets
6. **DRY principle**: Extract shared logic, no duplication
7. **Test what matters**: Focus on business logic, not presentation

## DATA MODEL
### Staff (1,321 records)
- Source: Google Contacts CSV + WhatsApp import
- Categories: Nurse, Attendant, Caretaker, Baby Sitter, Doctor, Client, Other, Nurse Assistant
- Districts: Karachi South, Karachi East, Karachi West, Korangi, Malir, Keamari

### Patients
- Auto-generated IDs: NC-PAT-0001, NC-PAT-0002...
- Status: Active, Pending, Discharged, Deceased, Cancelled, Dissatisfied
- Shifts: Day (7AM-7PM), Night (7PM-7AM)
- FK: assigned_staff_id → staff(id)

### Duty Assignments
- Links patient + staff + date + shift
- Status: assigned, confirmed, completed, cancelled
- Payment tracking: rate_per_shift, payment_status

## NOTES
- Parent directory (/home/archbtw/dev/whatsapp/) contains local PostgreSQL, import scripts, and DB dashboard
- horilla-hrms/ is a separate Django project — do not modify
- Supabase Cloud project: euxzitqllnltlteckeyq
- Current branch: feature/supabase-auth (with lean-spec-workflow for dev patterns)

## Qwen Added Memories
- Assigned staff badges in PatientModule and ShiftAssignmentModal: Day shift uses bg-sky-100/60 border-sky-200/50, Night shift uses bg-indigo-100/60 border-indigo-200/50. Service Type and Assigned Staff boxes in patient detail are stacked vertically (space-y-6), not side-by-side. Both boxes have dark mode support with fallback dashes for missing fields.
- HMSP mise.toml config (mise 2026.3.5):
- Tools: node=22, bun=1.3, supabase=2.75
- env._.path = ['./node_modules/.bin'] — direct binary access without npx
- Tasks: dev, build (incremental), typecheck (incremental), check (pipeline), ci, pre-push, db-push, db-status, setup
- Incremental builds via sources/outputs on typecheck and build tasks
- Pre-push scans for hardcoded secrets
- .gitignore includes .mise.local.toml and .mise/*.local.toml
- Supabase Cloud migration: link project → db push migrations → status check
- Migration 030 applied: rate_per_shift + rate_notes on duty_assignments for hybrid salary model
