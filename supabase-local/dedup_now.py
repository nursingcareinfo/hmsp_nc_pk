#!/usr/bin/env python3
"""Find and delete real duplicate staff records from Supabase."""

import requests, json, sys
from collections import defaultdict

SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHppdHFsbG5sdGx0ZWNrZXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODQ2NiwiZXhwIjoyMDkwODE0NDY2fQ.kWLxKWzgLFQ-SrxIX0xQjcmK5vIZE8dPx9-9hGh5hh8"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json"
}

def fetch_all():
    all_staff = []
    offset = 0
    while True:
        params = {
            "select": "id,assigned_id,full_name,cnic,contact_1,designation,salary,hire_date,status,created_at",
            "order": "created_at.desc",
            "limit": "1000",
            "offset": str(offset)
        }
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/staff", headers=HEADERS, params=params)
        if resp.status_code != 200:
            print(f"ERROR {resp.status_code}: {resp.text[:500]}")
            sys.exit(1)
        data = resp.json()
        if not isinstance(data, list):
            print(f"ERROR: got {type(data).__name__}: {str(data)[:300]}")
            sys.exit(1)
        all_staff.extend(data)
        print(f"  Batch: {len(data)} (total: {len(all_staff)})")
        if len(data) < 1000:
            break
        offset += 1000
    return all_staff

def norm(v):
    return " ".join((v or "").lower().split())

def find_dupes(staff):
    groups = defaultdict(list)
    for s in staff:
        name = norm(s.get("full_name"))
        phone = norm(s.get("contact_1"))
        cnic = norm(s.get("cnic"))
        if len(name) < 3:
            continue
        if phone and len(phone.replace("-", "")) >= 7:
            key = f"{name}|{phone}"
            groups[key].append(s)
        elif cnic and len(cnic.replace("-", "")) >= 13:
            key = f"{name}|{cnic}"
            groups[key].append(s)
    return {k: v for k, v in groups.items() if len(v) > 1}

def main():
    print("=" * 70)
    print("  SUPABASE STAFF DEDUP CLEANUP")
    print("=" * 70)

    print("\n[1] Fetching all staff...")
    all_staff = fetch_all()
    print(f"  Total: {len(all_staff)}")

    print("\n[2] Finding duplicates by name+phone / name+CNIC...")
    dupes = find_dupes(all_staff)
    total_dupes = sum(len(v) for v in dupes.values())

    if not dupes:
        print("  ✅ No duplicates found!")
        return

    print(f"  {len(dupes)} duplicate groups, {total_dupes} records involved")

    to_delete = []
    for key, group in sorted(dupes.items()):
        # Keep the newest (first by created_at.desc)
        survivor = group[0]
        victims = group[1:]
        to_delete.extend(victims)
        if len(to_delete) <= 20:
            print(f"\n  Group: {key[:80]}")
            print(f"    KEEP: {survivor['assigned_id']} | created {survivor['created_at'][:10]}")
            for v in victims:
                print(f"    DEL : {v['assigned_id']} | created {v['created_at'][:10]}")

    print(f"\n[3] Will delete {len(to_delete)} duplicate records")
    print(f"    Result: {len(all_staff) - len(to_delete)} records remaining")

    confirm = input("\n  Type YES to confirm deletion: ").strip()
    if confirm != "YES":
        print("  Aborted.")
        return

    print(f"\n[4] Deleting {len(to_delete)} records...")
    ok = 0
    err = 0
    for i, rec in enumerate(to_delete, 1):
        resp = requests.delete(
            f"{SUPABASE_URL}/rest/v1/staff?id=eq.{rec['id']}",
            headers=HEADERS
        )
        if resp.status_code in (200, 204):
            ok += 1
        else:
            err += 1
            print(f"  FAIL {rec['assigned_id']}: {resp.status_code} {resp.text[:200]}")
        if i % 10 == 0:
            print(f"  Progress: {i}/{len(to_delete)}")

    print(f"\n{'=' * 70}")
    print(f"  DONE: deleted {ok}, errors {err}")
    print(f"{'=' * 70}")

if __name__ == "__main__":
    main()
