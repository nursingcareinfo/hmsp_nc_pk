# Demo Mode Feature Specification

**Status:** Implemented  
**Date:** 2026-04-15  
**Branch:** `feature/demo-mode`

## Overview

Demo mode provides a self-contained testing environment for HMSP that:
- Deploys to Vercel without Supabase credentials
- Shows realistic mock data (10 staff, 3 patients)
- Limits user additions to 3 patients and 10 staff
- Keeps all other features functional

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_DEMO_MODE` | `true` | Enable demo mode |

### Local Development

```bash
# Enable demo mode
VITE_DEMO_MODE=true npm run dev

# Or create .env.local
echo "VITE_DEMO_MODE=true" > .env.local
```

### Vercel Deployment

1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add: `VITE_DEMO_MODE` = `true`
3. Redeploy

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    dataService.ts                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  getStaff() / getPatients()                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ if (DEMO_MODE)                                      │   │
│  │   → Return DEMO_STAFF / DEMO_PATIENTS               │   │
│  │ else if (supabase)                                  │   │
│  │   → Query Supabase                                  │   │
│  │ else                                                │   │
│  │   → Return localStorage fallback                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  addStaff() / addPatient()                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ if (DEMO_MODE)                                      │   │
│  │   → Check limits (10 staff / 3 patients)          │   │
│  │   → Store in localStorage                          │   │
│  │ else                                                │   │
│  │   → Insert to Supabase                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

### `src/constants.ts`
```typescript
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const DEMO_MAX_PATIENTS = 3;
export const DEMO_MAX_STAFF = 10;
```

### `src/demoData.ts` (NEW)
- `DEMO_STAFF`: Array of 10 sample staff members
- `DEMO_PATIENTS`: Array of 3 sample patients

### `src/dataService.ts`
- `getStaff()`: Returns `DEMO_STAFF` when `DEMO_MODE=true`
- `getPatients()`: Returns `DEMO_PATIENTS` when `DEMO_MODE=true`
- `addStaff()`: Stores in localStorage with limit enforcement
- `addPatient()`: Stores in localStorage with limit enforcement

## Demo Data

### Staff (10 records)
Categories: Nurse, Nurse Assistant, Attendant, Caretaker, Baby Sitter
Districts: Karachi South, Karachi East, Karachi West, Korangi, Malir, Keamari

### Patients (3 records)
1. **NC-PAT-0001** - Abdul Rehman (Elderly care, post-stroke)
2. **NC-PAT-0002** - Nadia Hassan (Post-surgical, hip replacement)
3. **NC-PAT-0003** - Baby Sara (Neonatal care)

## Limitations

| Feature | Demo Mode | Production |
|---------|-----------|------------|
| Staff data | 10 max + demo data | Unlimited |
| Patient data | 3 max + demo data | Unlimited |
| Data persistence | localStorage only | Supabase |
| Real-time sync | Not available | Full |
| User authentication | Limited | Full |

## Future Enhancements

- [ ] Add demo mode indicator badge in UI
- [ ] Show remaining quota in add forms
- [ ] Add "Reset demo data" button
- [ ] Support export/import of demo data
- [ ] Add demo mode to feature flags system

## Testing

```bash
# Local test
VITE_DEMO_MODE=true npm run dev

# Build test
VITE_DEMO_MODE=true npm run build
```
