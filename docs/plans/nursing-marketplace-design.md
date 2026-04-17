# Design Document: Nursing Care Marketplace

**Date:** 2026-04-11
**Status:** Approved
**Branch:** main (fresh project)

---

## 1. Project Identity

| Aspect | Decision |
|--------|----------|
| **Name** | nursing-marketplace (working title) |
| **Location** | `~/dev/nursing-marketplace/` |
| **Type** | Single app (monorepo later if needed) |
| **Package Manager** | pnpm |
| **Runtime** | Node 22 via mise |
| **Framework** | Next.js 15 App Router |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 4 + shadcn/ui |
| **Database** | Supabase Cloud (separate project from HMSP) |
| **Auth** | Supabase Auth (email/phone + magic link) |
| **Payments** | Stripe (Pakistan via Stripe Atlas or PayStack) |
| **AI** | Google Gemini (reuse HMSP integration patterns) |
| **Deployment** | Vercel |
| **Target Region** | Karachi + Hyderabad, Pakistan (expand later) |

---

## 2. Problem Statement

Traditional nursing agencies in Pakistan charge patients excessive rates while maintaining high profit margins. This platform creates a **direct marketplace** where patients can hire nursing staff at fair rates, with the platform taking only a small commission (5-10%) for sustainability.

---

## 3. Business Model

**Hybrid Revenue:**
- Small commission (5-10%) per booking
- Optional staff subscriptions for premium features (visibility boost, verified badges, priority placement)
- Keeps costs 30-50% lower than traditional agencies

---

## 4. Core Features (MVP)

| Feature | Priority | Description |
|---------|----------|-------------|
| **Staff Profiles** | P0 | Public profiles with photo, qualifications, experience, rates, reviews, verified badges |
| **Patient Accounts** | P0 | Registration, medical needs, preferred schedule, booking history |
| **Browse & Search** | P0 | Filter by category, district, availability, rating, price. Full-text search |
| **Direct Booking** | P0 | Patient selects staff, chooses dates/shifts, confirms, pays |
| **Request Board** | P0 | Patients post care needs, staff browse and apply |
| **Reviews & Ratings** | P0 | Post-booking reviews (1-5 stars + text). Verified bookings only |
| **Payments (Escrow)** | P0 | Patient pays platform → holds until shift done → releases to staff minus commission |
| **Staff Dashboard** | P0 | Manage profile, view bookings, earnings, availability calendar, accept/reject requests |
| **Patient Dashboard** | P0 | Manage bookings, post requests, view applications, payment history |
| **Notifications** | P0 | Email + in-app: booking, request, review, payment alerts |
| **Messaging** | P1 | In-app chat between patient and staff before booking |
| **Admin Dashboard** | P1 | Verify credentials, resolve disputes, platform metrics |

---

## 5. User Flows

### Flow 1: Direct Hire
```
Patient browses staff → Filters by category/district/rating →
Views staff profile → Selects dates/shifts → Confirms booking →
Pays through platform (escrow) → Staff gets notified →
Staff accepts → Shift completes → Patient confirms →
Platform releases payment to staff (minus commission) → Both leave reviews
```

### Flow 2: Request + Apply
```
Patient posts request (title, description, category, dates, budget) →
Staff browse open requests → Staff applies with message + proposed rate →
Patient reviews applications → Patient selects staff →
Booking confirmed → Same payment flow as Direct Hire
```

### Flow 3: Staff Onboarding
```
Staff registers → Creates profile (photo, qualifications, experience) →
Sets rates (day/night shifts) → Selects districts served →
Uploads verification documents (PNC license, CNIC) →
Admin reviews → Profile goes live (verified badge after approval)
```

---

## 6. Database Schema

### Core Tables

**users** (Supabase Auth)
```sql
id UUID (PK), email TEXT, phone TEXT, role TEXT (patient/staff/admin),
created_at TIMESTAMPTZ
```

**staff_profiles**
```sql
id UUID (PK), user_id UUID (FK → users), full_name TEXT, photo_url TEXT, phone TEXT,
category TEXT (nurse/attendant/caretaker/baby_sitter/doctor),
districts_served TEXT[], experience_years INT, education JSONB, certifications JSONB,
rate_per_shift_day DECIMAL, rate_per_shift_night DECIMAL,
availability_calendar JSONB,
verified BOOLEAN, verification_documents JSONB,
reliability_score DECIMAL (computed from reviews + completion rate),
subscription_tier TEXT (free/premium/verified), subscription_expires TIMESTAMPTZ,
bio TEXT, languages TEXT[],
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ
```

**patient_profiles**
```sql
id UUID (PK), user_id UUID (FK → users), full_name TEXT, phone TEXT, address TEXT,
district TEXT, area TEXT, medical_needs TEXT, preferred_shift TEXT (day/night/either),
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**bookings**
```sql
id UUID (PK), patient_id UUID (FK), staff_id UUID (FK),
start_date DATE, end_date DATE, shift_type TEXT (day/night),
status TEXT (pending/confirmed/in_progress/completed/cancelled/disputed),
total_amount DECIMAL, platform_fee DECIMAL, staff_payout DECIMAL,
payment_status TEXT (pending/paid/held/released/refunded),
created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
```

**requests**
```sql
id UUID (PK), patient_id UUID (FK),
title TEXT, description TEXT, category_needed TEXT,
district TEXT, start_date DATE, end_date DATE, shift_type TEXT,
budget_min DECIMAL, budget_max DECIMAL,
status TEXT (open/in_progress/filled/cancelled),
created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ
```

**applications**
```sql
id UUID (PK), request_id UUID (FK), staff_id UUID (FK),
message TEXT, proposed_rate DECIMAL,
status TEXT (pending/accepted/rejected),
created_at TIMESTAMPTZ
```

**reviews**
```sql
id UUID (PK), booking_id UUID (FK), reviewer_id UUID (FK), reviewee_id UUID (FK),
rating INT (1-5), comment TEXT,
created_at TIMESTAMPTZ
```

**payments**
```sql
id UUID (PK), booking_id UUID (FK), payer_id UUID (FK), payee_id UUID (FK),
amount DECIMAL, platform_fee DECIMAL, staff_payout DECIMAL,
stripe_payment_intent_id TEXT, status TEXT,
created_at TIMESTAMPTZ
```

**notifications**
```sql
id UUID (PK), user_id UUID (FK), type TEXT, title TEXT, message TEXT,
read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ
```

### Views + Functions
- `staff_with_stats` — staff profiles + avg rating + booking count
- `request_with_applications` — requests + application count
- `fn_calculate_reliability_score(staff_id)` — computed from reviews + completion rate

---

## 7. Development Workflow

### Toolchain
| Tool | Purpose |
|------|---------|
| **agtx** | Terminal kanban + git worktrees + tmux + multi-agent orchestration |
| **Superpowers** | Brainstorm → Spec → Plan → Subagent → Review workflow |
| **Qwen CLI** | Frontend development (React, Tailwind, shadcn/ui) |
| **Gemini CLI** | Backend development (Supabase schema, API routes, payments) |
| **OpenCode CLI** | Documentation, tests, code review |
| **NotebookLM** | Domain knowledge base (nursing regulations, competitor analysis) |

### Agent Assignment by Phase
| Phase | Agent | Role |
|-------|-------|------|
| Brainstorm | Gemini | Research, explore alternatives |
| Spec | Qwen | Write detailed specifications |
| Plan | OpenCode | Break into file-level tasks |
| Implement (Frontend) | Qwen | React components, pages, styling |
| Implement (Backend) | Gemini | Supabase schema, migrations, API routes |
| Review | OpenCode | Code review, security audit |
| Test | Qwen | E2E tests, typecheck |

### agtx Kanban Flow
```
Backlog → Planning → Running → Review → Done
```
Each task = isolated git worktree + tmux window + assigned agent

---

## 8. Continuous Learning System

### 5-Layer Memory Stack (Shared Across All Agents)

| File | Purpose | Updated By |
|------|---------|------------|
| `context-snapshot.json` | Current state: git blast radius, changed files, recent commits | Auto-written each session |
| `project-map.md` | Cached structure, key files, constraints | Auto on structure change |
| `session-log.md` | Architectural decisions, rejected approaches, durable facts | Agents during work |
| `known-issues.md` | Error signature → proven fix lookup | After bug fixes |
| `lessons-learned.md` | What worked, what didn't (grows over time) | Post-task extraction |
| `patterns.md` | Discovered patterns + best practices | Pattern discovery |
| `state.md` | Current task + plan + open questions | Auto on task switch |

### Learning Triggers
| Event | Action |
|-------|--------|
| Task completed | Extract lessons → `lessons-learned.md` |
| Bug fixed | Add error + fix → `known-issues.md` |
| Pattern discovered | Add to `patterns.md` |
| Architecture decision | Log in `session-log.md` |
| New session starts | Read all memory files → informed context |

### NotebookLM Integration
- **Notebook:** "Nursing Care Marketplace"
- **Sources:** HMSP codebase, PNC regulations, competitor analysis, healthcare compliance
- **Access:** `notebooklm-py` CLI + skill for all agents
- **Usage:** Agents query before spec writing and implementation

---

## 9. Project Structure

```
nursing-marketplace/
├── .agent-memory/                    # Continuous learning (shared across agents)
│   ├── context-snapshot.json
│   ├── project-map.md
│   ├── session-log.md
│   ├── known-issues.md
│   ├── lessons-learned.md
│   ├── patterns.md
│   └── state.md
│
├── .agents/
│   └── skills/
│       ├── continuous-learning/      # Auto-improvement skill
│       │   ├── SKILL.md
│       │   ├── extract-lessons.mjs
│       │   └── update-memory.mjs
│       └── notebooklm-query/         # NotebookLM integration
│           ├── SKILL.md
│           └── query.mjs
│
├── .agtx/                            # agtx kanban config
│   └── config.toml
│
├── .github/workflows/
│   ├── ci.yml                        # typecheck + build + test
│   └── deploy.yml                    # Vercel deploy
│
├── src/
│   ├── app/
│   │   ├── (auth)/                   # Auth routes (sign in, sign up, forgot)
│   │   ├── (dashboard)/
│   │   │   ├── staff/                # Staff dashboard
│   │   │   ├── patient/              # Patient dashboard
│   │   │   └── admin/                # Admin dashboard (P1)
│   │   ├── (public)/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── staff/                # Browse staff (public)
│   │   │   ├── staff/[id]/           # Staff profile (public)
│   │   │   └── requests/             # Request board (public)
│   │   └── api/
│   │       ├── stripe/               # Stripe webhooks
│   │       └── notebooklm/           # Proxy for NotebookLM queries
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── staff/                    # Staff-specific components
│   │   ├── patient/                  # Patient-specific components
│   │   ├── booking/                  # Booking flow components
│   │   └── shared/                   # Shared layout, nav, etc.
│   ├── lib/
│   │   ├── supabase/                 # Supabase client + helpers
│   │   ├── stripe/                   # Stripe client + helpers
│   │   └── utils.ts
│   ├── services/
│   │   ├── bookingService.ts
│   │   ├── requestService.ts
│   │   ├── reviewService.ts
│   │   ├── paymentService.ts
│   │   └── notificationService.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts                 # Route protection
│
├── supabase/
│   ├── migrations/                   # SQL migrations
│   └── config.toml
│
├── public/                           # Static assets
│   └── branding/
│
├── mise.toml                         # Dev environment
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── .env.example
└── README.md
```

---

## 10. Key Differentiators from HMSP

| HMSP (Current) | Marketplace (New) |
|----------------|-------------------|
| Internal ops tool | Public marketplace |
| You manage staff | Staff own their profiles |
| You assign staff | Patients browse & book |
| Fixed shift rates | Staff set own rates |
| Single admin view | Multi-tenant dashboards |
| Manual onboarding | Self-service registration |
| No payments in-app | Escrow payment system |
| No reviews | Rating & review system |
| Your data only | Open platform |
| Vite SPA | Next.js SSR (SEO) |

---

## 11. mise.toml Configuration

```toml
[tools]
node = "22"
pnpm = "10"
supabase = "2.75"

[env]
_.path = ["./node_modules/.bin"]

[tasks.dev]
run = "next dev --turbopack"

[tasks.build]
run = "next build"
sources = ["src/**/*"]
outputs = [".next/**/*"]

[tasks.typecheck]
run = "tsc --noEmit"
sources = ["src/**/*"]
outputs = ["tsconfig.tsbuildinfo"]

[tasks.test]
run = "pnpm vitest run"

[tasks.check]
run = [{ task = "typecheck" }, { task = "test" }, { task = "build" }]

[tasks.db-push]
run = "supabase db push"

[tasks.kb]
run = "notebooklm ask --notebook 'Nursing Care Marketplace' '{{args}}'"
description = "Query NotebookLM knowledge base"
```

---

## 12. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gemini (for AI features)
GEMINI_API_KEY=your-gemini-api-key

# NotebookLM (optional, for agent knowledge base)
NOTEBOOKLM_NOTEBOOK_ID=your-notebook-id

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 13. Approved By

- **User:** Approved via brainstorm session
- **Date:** 2026-04-11
- **Next Step:** Project initialization + move to `/plan` for task decomposition

---

## 14. Notes

- Completely separate from existing HMSP (no code sharing)
- Fresh start for staff — no migration of 1,300+ HMSP records
- Staff self-register and set own rates
- Both direct hire AND request-posting models supported
- PWA-capable (works on desktop + mobile browsers)
- Future: native mobile apps via React Native or Flutter
