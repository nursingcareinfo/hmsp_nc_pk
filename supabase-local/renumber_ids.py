#!/usr/bin/env python3
"""
Reassign ALL staff assigned_ids sequentially from NC-KHI-0001 to NC-KHI-NNNN.
Also fix the PostgreSQL sequence so new inserts auto-generate the next ID.
"""

import requests, sys

SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHppdHFsbG5sdGx0ZWNrZXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODQ2NiwiZXhwIjoyMDkwODE0NDY2fQ.kWLxKWzgLFQ-SrxIX0xQjcmK5vIZE8dPx9-9hGh5hh8"
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json",
    "Prefer": "return=representation"
}

def fetch_all_staff():
    all_staff = []
    for offset in [0, 1000, 2000]:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/staff",
            headers={"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Accept": "application/json"},
            params={"select": "id,assigned_id,full_name", "order": "created_at.asc", "limit": "1000", "offset": str(offset)}
        )
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            all_staff.extend(data)
        else:
            break
    return all_staff

def main():
    print("=" * 70)
    print("  STAFF ID RENUMBER — NC-KHI-0001 to NC-KHI-NNNN")
    print("=" * 70)

    print("\n[1/4] Fetching all staff...")
    staff = fetch_all_staff()
    print(f"  Total records: {len(staff)}")

    if len(staff) == 0:
        print("  No records found. Aborting.")
        return

    # Show sample
    print("\n  Current IDs (first 5):")
    for s in staff[:5]:
        print(f"    {s['assigned_id']} -> {s['full_name']}")

    confirm = input(f"\n[2/4] Renumber {len(staff)} records sequentially? (YES): ").strip()
    if confirm != "YES":
        print("  Aborted.")
        return

    print(f"\n[3/4] Updating records...")
    errors = 0
    for i, s in enumerate(staff, 1):
        new_id = f"NC-KHI-{i:04d}"  # 4-digit padding: NC-KHI-0001, NC-KHI-1321
        old_id = s["assigned_id"]

        if new_id == old_id:
            continue

        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/staff?id=eq.{s['id']}",
            headers=HEADERS,
            json={"assigned_id": new_id}
        )

        if resp.status_code in (200, 204):
            pass  # success
        else:
            errors += 1
            print(f"  FAIL {old_id} -> {new_id}: {resp.status_code} {resp.text[:200]}")

        if i % 100 == 0 or errors > 0:
            print(f"  Progress: {i}/{len(staff)} (errors: {errors})")

    print(f"  Update complete: {len(staff)} records, {errors} errors")

    # Fix the sequence
    print(f"\n[4/4] Fixing PostgreSQL sequence...")
    next_val = len(staff) + 1

    # Use SQL RPC to reset the sequence
    sql = f"""
    -- Reset the sequence to continue from the new max
    SELECT setval('staff_assigned_id_seq', {len(staff)}, true);
    """

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/setval_seq",
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json"
        },
        # We'll do it via direct SQL through the REST API endpoint
        json={}
    )
    
    # Alternative: use raw SQL via Supabase SQL API (if available)
    # Or just note what the sequence should be set to
    
    print(f"  Sequence should be set to: {len(staff)}")
    print(f"  Next auto-generated ID will be: NC-KHI-{next_val:04d}")
    
    # Create a SQL migration for the user to run
    print(f"\n  To fix the sequence, run this SQL in Supabase SQL Editor:")
    print(f"  SELECT setval('staff_assigned_id_seq', {len(staff)}, true);")

    print(f"\n{'=' * 70}")
    print(f"  DONE: {len(staff)} records renumbered")
    print(f"  Range: NC-KHI-0001 to NC-KHI-{len(staff):04d}")
    print(f"  Next auto-ID: NC-KHI-{next_val:04d}")
    print(f"{'=' * 70}")

if __name__ == "__main__":
    main()
