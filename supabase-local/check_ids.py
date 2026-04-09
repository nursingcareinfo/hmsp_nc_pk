#!/usr/bin/env python3
"""Check assigned_id sequence status and find gaps."""

import requests
SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHppdHFsbG5sdGx0ZWNrZXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODQ2NiwiZXhwIjoyMDkwODE0NDY2fQ.kWLxKWzgLFQ-SrxIX0xQjcmK5vIZE8dPx9-9hGh5hh8"
HEADERS = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}", "Accept": "application/json"}

# Fetch ALL staff
all_staff = []
for offset in [0, 1000, 2000]:
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/staff?select=assigned_id&order=assigned_id.desc&limit=1000&offset={offset}", headers=HEADERS)
    data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        all_staff.extend(data)
    else:
        break

ids = [int(r["assigned_id"].split("-")[-1]) for r in all_staff if r["assigned_id"]]
ids.sort()

print(f"Total records: {len(ids)}")
print(f"ID range: NC-KHI-{ids[0]:03d} to NC-KHI-{ids[-1]:03d}")
print(f"Expected range: {ids[0]} to {ids[-1]} = {ids[-1] - ids[0] + 1} records")
print(f"Missing (gaps): {ids[-1] - ids[0] + 1 - len(ids)}")

# Show gap ranges
missing = []
for i in range(ids[0], ids[-1] + 1):
    if i not in ids:
        missing.append(i)

# Group consecutive missing into ranges
if missing:
    ranges = []
    start = missing[0]
    end = missing[0]
    for m in missing[1:]:
        if m == end + 1:
            end = m
        else:
            ranges.append((start, end))
            start = m
            end = m
    ranges.append((start, end))
    
    print(f"\nGap ranges (deleted IDs):")
    for s, e in ranges[:20]:
        count = e - s + 1
        print(f"  NC-KHI-{s:03d} to NC-KHI-{e:03d} ({count} missing)")
    if len(ranges) > 20:
        print(f"  ... and {len(ranges) - 20} more gap ranges")
    print(f"\nTotal gap ranges: {len(ranges)}")
