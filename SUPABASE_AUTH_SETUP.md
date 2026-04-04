# Supabase Auth Setup Guide

## What Changed

Firebase Auth + Firestore has been **completely replaced** with **Supabase Auth + PostgreSQL**.

### Files Modified
| File | Change |
|---|---|
| `src/components/auth/SignIn.tsx` | Replaced Firebase `signInWithEmailAndPassword` + `GoogleAuthProvider` with Supabase `signInWithPassword` + Magic Link |
| `src/components/auth/SignUp.tsx` | Replaced Firebase `createUserWithEmailAndPassword` with Supabase `signUp` |
| `src/App.tsx` | Replaced `onAuthStateChanged` Firebase listener with Supabase `onAuthStateChange` |
| `src/dataService.ts` | Replaced all Firestore CRUD with Supabase `.from('users')` queries |
| `src/components/SettingsModule.tsx` | Now uses `SUPER_ADMIN_EMAIL` and `MAX_ADMINS` constants |
| `src/constants.ts` | Added centralized `SUPER_ADMIN_EMAIL` and `MAX_ADMINS` constants |
| `supabase/migrations/001_create_users_table.sql` | New migration for `users` table |
| `.env.local` | Supabase credentials (replace placeholders) |
| `.env.example` | Updated template |

### Files No Longer Needed (but kept for reference)
- `src/firebase.ts` — Firebase config (no longer imported anywhere)
- `firebase-applet-config.json` — Firebase JSON config
- `firebase-blueprint.json` — Firebase blueprint
- `firestore.rules` — Firestore security rules

---

## Setup Steps

### 1. Create a Free Supabase Project

1. Go to [https://supabase.com/dashboard/new](https://supabase.com/dashboard/new)
2. Sign in with GitHub
3. Click **"New Project"**
4. Fill in:
   - **Project name:** `nursingcare-hmsp`
   - **Database password:** (generate a strong one, save it)
   - **Region:** Choose closest to Pakistan (e.g., `Singapore` or `Mumbai`)
5. Wait ~2 minutes for project creation

### 2. Configure Auth Settings

1. In your Supabase project dashboard, go to **Authentication → Providers**
2. **Email Provider:** Ensure it's **enabled**
3. **Email Confirmations:** Disable (for faster local dev)
   - Go to **Authentication → Email Templates** → uncheck "Enable email confirmations"
4. **Password Settings:** Minimum 6 characters (already default)

### 3. Run the Database Migration

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New Query"**
3. Copy and paste the contents of:
   ```
   supabase/migrations/001_create_users_table.sql
   ```
4. Click **"Run"**

This creates:
- `users` table with RLS policies
- Auto-update trigger for `updated_at`
- Indexes for performance
- Pre-inserts the super admin account

### 4. Get Your API Credentials

1. Go to **Project Settings → API**
2. Copy these values:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 5. Update `.env.local`

```bash
# Edit this file
nano /home/archbtw/dev/whatsapp/hmsp_nc_pk_repo/.env.local
```

Replace with your actual values:
```env
VITE_SUPABASE_URL=https://your-actual-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key
GEMINI_API_KEY=your-gemini-api-key
```

### 6. Create Your Admin Account

The migration pre-inserts `nursingcareinfo21@gmail.com` as super admin, but you need to actually **sign up** with that email first:

1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Click **"Sign Up"**
4. Enter: `nursingcareinfo21@gmail.com`
5. Enter a password (min 6 chars)
6. Click **"Sign Up"**
7. If email confirmation is disabled, you'll be logged in immediately
8. If enabled, check your email for the confirmation link

### 7. Add More Admin Users (Optional)

1. Sign in as super admin
2. Go to **Settings** (gear icon in sidebar)
3. Have another user sign up first
4. Find them in the user list
5. Click **"Make Admin"** (max 2 admins total)

---

## Authentication Flow

### Sign In Options
1. **Magic Link** (recommended) — Enter email → get a login link via email → click to sign in
2. **Email + Password** — Traditional sign-in form

### Sign Up Flow
1. Enter email + password
2. Account created in Supabase Auth
3. Auto-inserted into `users` table as `viewer` role
4. If `nursingcareinfo21@gmail.com`, auto-promoted to `admin`
5. Email confirmation (if enabled)

### Session Management
- Sessions persist in localStorage (Supabase handles this)
- Auto-refresh tokens
- On page reload, session is restored
- Sign out clears session

### Role-Based Access
| Role | Access |
|------|--------|
| `admin` | Full access to all modules + user management |
| `staff` | Standard dashboard access (future use) |
| `viewer` | Can sign in but sees "Access Restricted" page |

---

## Database Schema

### `users` Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,           -- Supabase auth user ID
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  role TEXT CHECK (role IN ('admin', 'staff', 'viewer')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
);
```

### Existing Tables (unchanged)
- `staff` — 1,157+ staff records
- `patients` — Patient records
- `broadcast_lists` — WhatsApp broadcast lists

---

## Troubleshooting

### "Invalid email or password"
- Make sure you signed up first (not just created the DB row)
- Check email confirmation if enabled

### "Supabase not configured"
- Check `.env.local` exists and has correct values
- Restart dev server after changing `.env.local`

### "Maximum limit of 2 administrators reached"
- Go to Settings → revoke admin from a user first
- Or change `MAX_ADMINS` in `src/constants.ts`

### Users table is empty
- Run the migration SQL in Supabase SQL Editor
- Or manually create: `INSERT INTO users (id, email, display_name, role) VALUES (auth.uid(), 'email', 'Name', 'admin');`

### Can't sign up — "User already registered"
- The email exists in Supabase Auth but maybe not in `users` table
- Check **Authentication → Users** in Supabase dashboard
- Try signing in instead

---

## What's Removed vs. What's Kept

| Removed | Kept |
|---------|------|
| Firebase Auth (Google OAuth, email/password) | Supabase Auth (email/password, magic link) |
| Firestore (users collection) | Supabase PostgreSQL (users table) |
| Firebase config JSON files | Supabase env variables |
| `firebase.ts` imports | `supabase.ts` (already existed) |

| Still Works |
|-------------|
| Staff CRUD (Supabase PostgreSQL) |
| Patient CRUD (Supabase PostgreSQL) |
| Real-time subscriptions (Supabase) |
| Gemini AI integration |
| Camera capture + OCR |
| Market Analysis (Firecrawl) |
| Dark/Light theme |
| All UI components |
