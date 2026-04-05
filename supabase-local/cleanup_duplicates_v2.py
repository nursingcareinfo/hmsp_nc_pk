#!/usr/bin/env python3
"""
Find and remove duplicate staff records from Supabase.
Matches by: normalized name + phone OR name + CNIC.
Keeps the record with the most recent hire_date (or most complete data).
"""

import requests
import json
import sys
from collections import defaultdict

# ─── CONFIG ──────────────────────────────────────────────────────────────
SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
# The service role key bypasses RLS. Get it from your Supabase Dashboard → Settings → API
SERVICE_ROLE_KEY = input("Enter Supabase SERVICE ROLE key: ").strip()
# ─────────────────────────────────────────────────────────────────────────

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Profile": "public",
    "Accept": "application/json"
}

def fetch_all_staff():
    """Fetch all staff records with pagination."""
    all_staff = []
    offset = 0
    while True:
        params = {
            "select": "id,assigned_id,full_name,father_husband_name,cnic,contact_1,contact_2,designation,salary,hire_date,qualification,experience_years,status,created_at",
            "order": "created_at.desc",
            "limit": "1000",
            "offset": str(offset)
        }
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/staff", headers=HEADERS, params=params)
        if resp.status_code != 200:
            print(f"ERROR: {resp.status_code} - {resp.text[:300]}")
            sys.exit(1)
        data = resp.json()
        if not isinstance(data, list):
            print(f"ERROR: Expected array, got {type(data).__name__}: {json.dumps(data)[:300]}")
            sys.exit(1)
        all_staff.extend(data)
        print(f"  Fetched {len(data)} records (total: {len(all_staff)})")
        if len(data) < 1000:
            break
        offset += 1000
    return all_staff

def normalize(val):
    """Lowercase, strip, remove extra spaces."""
    return " ".join((val or "").lower().split())

def find_duplicates(staff_list):
    """Find duplicate groups by name+phone or name+CNIC."""
    groups = defaultdict(list)
    
    for s in staff_list:
        name = normalize(s.get("full_name"))
        phone = normalize(s.get("contact_1"))
        cnic = normalize(s.get("cnic"))
        
        # Skip entries with no name or phone/cnic
        if len(name) < 3:
            continue
        
        # Primary key: name + phone
        if phone and len(phone) >= 7:
            key = f"{name}|{phone}"
            groups[key].append(s)
        # Secondary key: name + CNIC
        elif cnic and len(cnic) >= 10:
            key = f"{name}|{cnic}"
            groups[key].append(s)
    
    return {k: v for k, v in groups.items() if len(v) > 1}

def pick_survivor(records):
    """Pick which record to KEEP from a duplicate group.
    Strategy: keep the one with the most recent hire_date, then most fields filled."""
    def score(r):
        fields_filled = sum(1 for v in r.values() if v not in (None, "", []))
        hire = r.get("hire_date") or "1900-01-01"
        return (hire, fields_filled)
    
    sorted_recs = sorted(records, key=score, reverse=True)
    return sorted_recs[0], sorted_recs[1:]

def delete_records(records_to_delete):
    """Delete records by ID."""
    deleted = 0
    errors = 0
    for r in records_to_delete:
        resp = requests.delete(
            f"{SUPABASE_URL}/rest/v1/staff?id=eq.{r['id']}",
            headers=HEADERS
        )
        if resp.status_code in (200, 204):
            deleted += 1
        else:
            errors += 1
            print(f"  DELETE FAILED {r['assigned_id']} ({r['id'][:8]}): {resp.status_code} {resp.text[:200]}")
    return deleted, errors

def main():
    print("=" * 70)
    print("  SUPABASE STAFF DEDUPLICATION")
    print("=" * 70)
    
    print("\n[1/4] Fetching all staff records...")
    all_staff = fetch_all_staff()
    print(f"  Total records: {len(all_staff)}")
    
    print("\n[2/4] Finding duplicates...")
    dupes = find_duplicates(all_staff)
    
    if not dupes:
        print("  ✅ No duplicates found by name+phone or name+CNIC.")
        return
    
    total_dupe_records = sum(len(v) for v in dupes.values())
    print(f"  Found {len(dupes)} duplicate groups ({total_dupe_records} records total)")
    
    # Show summary
    to_delete_all = []
    for key, group in sorted(dupes.items()):
        survivor, victims = pick_survivor(group)
        to_delete_all.extend(victims)
    
    print(f"  Will delete: {len(to_delete_all)} duplicate records")
    print(f"  Records after cleanup: {len(all_staff) - len(to_delete_all)}")
    
    # Show details for first 10 groups
    print("\n[3/4] Duplicate details (first 10 groups):")
    for i, (key, group) in enumerate(sorted(dupes.items())[:10]):
        survivor, victims = pick_survivor(group)
        print(f"\n  ── Group {i+1}: {key[:60]} ──")
        print(f"    KEEP: {survivor['assigned_id']} | {survivor.get('salary','?')} | {survivor.get('hire_date','?')} | {survivor.get('status','?')}")
        for v in victims:
            print(f"    DEL : {v['assigned_id']} | {v.get('salary','?')} | {v.get('hire_date','?')} | {v.get('status','?')}")
    
    # Confirm
    confirm = input(f"\n[4/4] Delete {len(to_delete_all)} duplicate records? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("  Aborted. No records deleted.")
        return
    
    print(f"\n  Deleting {len(to_delete_all)} records...")
    deleted, errors = delete_records(to_delete_all)
    
    print(f"\n{'=' * 70}")
    print(f"  DONE: Deleted {deleted} records, {errors} errors")
    print(f"  Records remaining: {len(all_staff) - deleted}")
    print(f"{'=' * 70}")

if __name__ == "__main__":
    main()
