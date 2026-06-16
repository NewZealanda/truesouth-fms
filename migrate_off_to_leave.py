#!/usr/bin/env python3
"""Migrate all 'off' roster entries to 'leave' in Supabase."""
import json, subprocess, sys

SB  = 'https://wgycephyuwwfogggcbye.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndneWNlcGh5dXd3Zm9nZ2djYnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NjEzNzAsImV4cCI6MjA5NjQzNzM3MH0.6ac1fI7NxOJla_cI6P2bMwBXr3qkBTaHoyipcG9r95Q'

def curl(method, path, body=None):
    cmd = ['curl', '-sk', '-X', method,
           SB + path,
           '-H', 'apikey: ' + KEY,
           '-H', 'Authorization: Bearer ' + KEY,
           '-H', 'Content-Type: application/json',
           '-H', 'Prefer: return=representation']
    if body:
        cmd += ['-d', json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print('curl error:', r.stderr)
        sys.exit(1)
    return json.loads(r.stdout) if r.stdout.strip() else []

# Fetch roster
rows = curl('GET', '/rest/v1/ts_settings?key=eq.roster&select=value')
if not rows:
    print('No roster found.')
    sys.exit(0)

raw = rows[0]['value']
roster = json.loads(raw) if isinstance(raw, str) else raw

changed = 0
for ds, day in roster.items():
    for uid, st in list(day.items()):
        if st == 'off':
            day[uid] = 'leave'
            changed += 1

print(f'Found {changed} "off" entries to replace with "leave".')
if changed == 0:
    print('Nothing to do.')
    sys.exit(0)

curl('PATCH', '/rest/v1/ts_settings?key=eq.roster', {'value': json.dumps(roster)})
print(f'Done. {changed} cells migrated to "leave".')
