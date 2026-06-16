#!/usr/bin/env python3
"""Upload roster data to Supabase ts_settings.
Run from Terminal: python3 upload_roster.py
"""
import json, urllib.request, urllib.error, os, ssl
ctx = ssl._create_unverified_context()

SB = 'https://wgycephyuwwfogggcbye.supabase.co'
SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneWNlcGh5dXd3Zm9nZ2djYnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjEzNzAsImV4cCI6MjA5NjQzNzM3MH0.6ac1fI7NxOJla_cI6P2bMwBXr3qkBTaHoyipcG9r95Q'

script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, 'roster_import.json')

print(f'Loading {json_path}...')
with open(json_path) as f:
    roster = json.load(f)

print(f'Loaded {len(roster)} dates (first: {sorted(roster)[0]}, last: {sorted(roster)[-1]})')
print('Uploading to Supabase...')

payload = json.dumps([{'key': 'roster', 'value': json.dumps(roster)}]).encode()

req = urllib.request.Request(
    f'{SB}/rest/v1/ts_settings',
    data=payload,
    method='POST',
    headers={
        'Content-Type': 'application/json',
        'apikey': SK,
        'Authorization': f'Bearer {SK}',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
)

try:
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        body = resp.read()
        print(f'✓ Success! Status: {resp.status}')
        if body:
            print('Response:', body[:200])
except urllib.error.HTTPError as e:
    body = e.read()
    print(f'✗ HTTP {e.code}: {body[:300]}')
except Exception as e:
    print(f'✗ Error: {e}')
