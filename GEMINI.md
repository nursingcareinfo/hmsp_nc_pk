# GEMINI.md - HMSP Nursing Care Management

## Project Overview
HMSP (Home Nursing Staff Management System) is a comprehensive platform designed for managing home nursing staff and patient care, primarily serving the Karachi, Pakistan market. The application provides a centralized portal for staff management, patient care coordination, scheduling, payroll, and advances tracking.

### Core Technologies
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **State Management**: Zustand (global UI state), React Query (server state caching)
- **Styling**: Tailwind CSS 4
- **Backend/DB**: Supabase (PostgreSQL, Authentication, Realtime)
- **AI Integration**: Google Gemini AI (via `@google/genai` and custom chat assistant)
- **Validation**: Zod (schema validation) + React Hook Form

## Building and Running
- **Development**: `npm run dev` (starts on port 3000)
- **Production Build**: `npm run build`
- **Type Checking**: `npm run typecheck` (MUST be run before any commit)
- **Lint/Format**: `npm run format`

## Development Conventions
- **Component Size**: Keep components under 500 lines; extract sub-components as needed.
- **Error Handling**: Use `sonner` toasts for all Supabase operations and errors.
- **State**: Avoid direct state mutation; use Zustand stores and React `useState`/`useQuery`.
- **API Boundaries**: Use `src/dataService.ts` for all database calls; do not call Supabase directly in components.
- **Styles**: Use `cn()` helper (tailwind-merge + clsx) for conditional styling.
- **Git Flow**: Conventional commits (`feat:`, `fix:`, `chore:`, etc.). Run `npm run pre-push` locally before any push.

## Key Directories
- `src/components/`: Modular React components (e.g., `StaffModule`, `PatientModule`).
- `src/services/`: Business logic and service layers (e.g., `matchingService.ts`).
- `src/lib/`: Library configurations (e.g., `supabase.ts`).
- `src/store.ts`: Zustand store for global application state.
- `supabase/`: Supabase migration files and configuration.
- `supabase-local/`: Local PostgreSQL instance and migration/deduplication scripts.
