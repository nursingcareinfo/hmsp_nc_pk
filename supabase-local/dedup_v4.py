#!/usr/bin/env python3
"""Phase 2: delete duplicates where BOTH have empty CNIC but same phone."""

import requests, json, sys
from collections import defaultdict

SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHppdHFsbG5sdGx0ZWNrZXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODQ2NiwiZXhwIjoyMDkwODE0NDY2fQ.kWLxKWzgLFQ-SrxIX0xQjcmK5vIZE8dPx9-9hGh5hh8"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json"
}

def norm_phone(p):
    if not p:
        return ""
    digits = "".join(c for c in p if c.isdigit())
    if digits.startswith("92"):
        digits = digits[2:]
    if digits.startswith("0"):
        digits = digits[1:]
    return digits

def fetch_all():
    all_staff = []
    for offset in [0, 1000]:
        resp = requests.get(f"{SUPABASE_URL}/rest/v1/staff", headers=HEADERS, params={
            "select": "id,assigned_id,full_name,cnic,contact_1,designation,salary,hire_date,status,created_at",
            "order": "created_at.desc", "limit": "1000", "offset": str(offset)
        })
        data = resp.json()
        if isinstance(data, list):
            all_staff.extend(data)
    return all_staff

def main():
    all_staff = fetch_all()
    print(f"Total staff: {len(all_staff)}")

    # Group by normalized name
    name_groups = defaultdict(list)
    for s in all_staff:
        name = " ".join((s.get("full_name") or "").lower().split())
        if len(name) < 3:
            continue
        name_groups[name].append(s)

    to_delete = []
    for name, recs in sorted(name_groups.items()):
        if len(recs) < 2:
            continue
        # Check pairs with same normalized phone
        for i, r1 in enumerate(recs):
            for r2 in recs[i+1:]:
                phone1 = norm_phone(r1.get("contact_1"))
                phone2 = norm_phone(r2.get("contact_1"))
                if not phone1 or not phone2:
                    continue
                if phone1 != phone2:
                    continue

                cnic1 = (r1.get("cnic") or "").strip()
                cnic2 = (r2.get("cnic") or "").strip()

                # Skip if already processed (one has CNIC)
                if cnic1 or cnic2:
                    continue

                # Both empty CNIC, same phone → keep older (higher assigned_id number or older hire_date)
                # assigned_id format: NC-KHI-XXXX - higher number = newer
                id1 = int(r1["assigned_id"].split("-")[-1]) if r1["assigned_id"].split("-")[-1].isdigit() else 0
                id2 = int(r2["assigned_id"].split("-")[-1]) if r2["assigned_id"].split("-")[-1].isdigit() else 0

                # Keep the one with lower assigned_id (older, was in original data)
                if id1 < id2:
                    to_delete.append(r2)
                    print(f"  DEL: {r2['assigned_id']} (id {id2}) vs KEEP: {r1['assigned_id']} (id {id1})")
                elif id2 < id1:
                    to_delete.append(r1)
                    print(f"  DEL: {r1['assigned_id']} (id {id1}) vs KEEP: {r2['assigned_id']} (id {id2})")

    print(f"\nRecords to delete (both empty CNIC, same phone): {len(to_delete)}")
    if not to_delete:
        print("Nothing to delete.")
        return

    confirm = input("Type YES to confirm: ").strip()
    if confirm != "YES":
        print("Aborted.")
        return

    deleted = 0
    errors = 0
    for i, rec in enumerate(to_delete, 1):
        resp = requests.delete(f"{SUPABASE_URL}/rest/v1/staff?id=eq.{rec['id']}", headers=HEADERS)
        if resp.status_code in (200, 204):
            deleted += 1
        else:
            errors += 1
            print(f"  FAIL {rec['assigned_id']}: {resp.status_code}")
        if i % 10 == 0:
            print(f"  Progress: {i}/{len(to_delete)}")

    print(f"\nDONE: deleted {deleted}, errors {errors}")
    print(f"Remaining: {len(all_staff) - deleted}")

if __name__ == "__main__":
    main()
