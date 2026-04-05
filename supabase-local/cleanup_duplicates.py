#!/usr/bin/env python3
"""
Cleanup duplicate staff records in Supabase.
Strategy: For each group of duplicates (same name + phone), keep the most recent
complete record and delete the rest.
"""

import json
import re
import sys
import os

SUPABASE_URL = "https://euxzitqllnltlteckeyq.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eHppdHFsbG5sdGx0ZWNrZXlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzODQ2NiwiZXhwIjoyMDkwODE0NDY2fQ.kWLxKWzgLFQ-SrxIX0xQjcmK5vIZE8dPx9-9hGh5hh8")

import urllib.request
import urllib.error

def fetch_page(offset, limit=1000):
    """Fetch a page of staff records from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/staff?select=*&order=created_at.desc&offset={offset}&limit={limit}"
    req = urllib.request.Request(url)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Accept-Profile", "public")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"Error fetching page {offset}: {e}")
        return []

def normalize_phone(phone):
    """Strip all non-digits from phone number."""
    if not phone:
        return ""
    return re.sub(r'\D', '', phone)

def fetch_all_staff():
    """Fetch all staff records with pagination."""
    all_staff = []
    seen_ids = set()
    offset = 0
    batch_size = 1000
    
    while True:
        print(f"  Fetching records {offset}-{offset+batch_size-1}...")
        records = fetch_page(offset, batch_size)
        if not records:
            break
        
        # Deduplicate
        for r in records:
            if r['id'] not in seen_ids:
                seen_ids.add(r['id'])
                all_staff.append(r)
        
        if len(records) < batch_size:
            break
        offset += batch_size
    
    return all_staff

def delete_record(record_id):
    """Delete a single staff record from Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/staff?id=eq.{record_id}"
    req = urllib.request.Request(url, method="DELETE")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Accept-Profile", "public")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return True
    except Exception as e:
        print(f"    ❌ Error deleting {record_id[:8]}: {e}")
        return False

def count_records():
    """Get total staff count."""
    url = f"{SUPABASE_URL}/rest/v1/staff?select=id&limit=1"
    req = urllib.request.Request(url, method="HEAD")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Accept-Profile", "public")
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            content_range = resp.headers.get('Content-Range', '')
            if '/*' in content_range:
                return int(content_range.split('/')[0].split('-')[-1]) + 1
    except Exception as e:
        print(f"Error counting: {e}")
    return None

def main():
    print("=" * 60)
    print("STAFF DATA CLEANUP — DEDUPLICATION")
    print("=" * 60)
    
    # Count current
    current_count = count_records()
    print(f"\n📊 Current staff count: {current_count}")
    
    # Fetch all
    print("\n⬇️  Fetching all staff records...")
    all_staff = fetch_all_staff()
    print(f"✅ Fetched {len(all_staff)} unique records")
    
    # Group by normalized name + phone
    print("\n🔍 Identifying duplicates...")
    from collections import defaultdict
    groups = defaultdict(list)
    
    for s in all_staff:
        name = s.get('full_name', '').strip().lower()
        phone = normalize_phone(s.get('contact_1', ''))
        
        # Group key: normalized name + normalized phone
        # If no phone, use name only
        if phone:
            group_key = f"{name}|{phone}"
        else:
            group_key = f"{name}|_nophone_"
        
        groups[group_key].append(s)
    
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    total_dupes = sum(len(v) - 1 for v in duplicates.values())
    
    print(f"📈 Found {len(duplicates)} groups with {total_dupes} duplicate records")
    print(f"📉 Expected clean count: {len(all_staff) - total_dupes}")
    
    # For each duplicate group, determine which to keep
    records_to_delete = []
    
    for key, records in duplicates.items():
        # Sort by created_at descending, keep the newest
        sorted_records = sorted(records, 
                               key=lambda x: x.get('created_at', ''), 
                               reverse=True)
        keeper = sorted_records[0]
        dupes = sorted_records[1:]
        
        for dupe in dupes:
            records_to_delete.append({
                'id': dupe['id'],
                'name': dupe['full_name'],
                'phone': dupe.get('contact_1', ''),
                'keeper_id': keeper['id'][:8],
                'reason': f"dup of {keeper['id'][:8]}"
            })
    
    print(f"\n🗑️  {len(records_to_delete)} records marked for deletion")
    
    # Show first 20 deletions for review
    print("\n📋 FIRST 20 RECORDS TO DELETE:")
    for i, rec in enumerate(records_to_delete[:20]):
        print(f"  {i+1}. \"{rec['name']}\" ({rec['id'][:8]}... | {rec['phone'][:20]})")
    
    # Confirm deletion
    confirm = input(f"\n⚠️  Delete {len(records_to_delete)} duplicate records? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("❌ Aborted.")
        return
    
    # Delete duplicates
    deleted = 0
    errors = 0
    
    print("\n🗑️  Deleting duplicates...")
    for i, rec in enumerate(records_to_delete):
        success = delete_record(rec['id'])
        if success:
            deleted += 1
            if (deleted % 50 == 0):
                print(f"  Progress: {deleted}/{len(records_to_delete)} deleted...")
        else:
            errors += 1
    
    print(f"\n✅ Deleted {deleted} records")
    if errors > 0:
        print(f"⚠️  {errors} errors")
    
    # Final count
    final_count = count_records()
    print(f"\n📊 Final staff count: {final_count}")
    print(f"📉 Removed: {current_count - final_count if current_count and final_count else 'N/A'}")
    print("\n✨ Cleanup complete!")

if __name__ == "__main__":
    main()
