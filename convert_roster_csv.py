#!/usr/bin/env python3
"""Convert roster CSV to roster_import.json for upload_roster.py."""
import csv, json, os
from datetime import datetime

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
    'roster_import_source.csv')  # symlink/copy set below
OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
    'roster_import.json')

# If called with an arg, use that as CSV path
import sys
if len(sys.argv) > 1:
    CSV_PATH = sys.argv[1]

# Columns that are NOT staff (summary/totals columns)
SKIP_HEADERS = {
    '', 'Spare', 'Pilots', 'Desk', 'Ground', 'Admin', 'Total',
    'No. 1 Desk', 'No. 1 Pilot', 'Staff', 'Staff Mtg.Min'
}

# Map CSV status values -> ROSTER_SC keys
STATUS_MAP = {
    # Aircraft flying
    'C208B': 'c208b', 'C208B (swap)': 'c208b',
    'GA8': 'ga8',
    'PA32': 'other', 'PC6': 'other',
    # Ground/desk
    'GROUND': 'gnd',
    'Desk': 'desk', 'Desk (Swap)': 'desk', 'Desk/FF': 'desk',
    'WFH': 'desk', 'WORK': 'desk',
    # Admin
    'ADMIN': 'admin_duty',
    # Marketing/sales
    'sales': 'mrktg',
    # RDO variants
    'RDO': 'rdo', 'RDO (SWAP)': 'rdo', 'RDO (Swap)': 'rdo',
    'RDO (swap)': 'rdo', 'RDO SWAP': 'rdo', 'RDO Swap': 'rdo',
    'RDO swap': 'rdo', 'RDO (swap TRENZ)': 'rdo', 'SWAP RDO': 'rdo',
    # Off/away/not working
    'AWAY': 'off', 'Away': 'off', 'away': 'off',
    'OFF': 'off', 'Off': 'off', 'off': 'off',
    'X': 'off', 'XMAS': 'off', 'Spare': 'off',
    # Sick
    'SICK': 'sick', 'Sick': 'sick', 'sick': 'sick',
    # Half day
    '1/2 Day': 'half_day', '1/2 day': 'half_day', 'Half Day': 'half_day',
    # Training / courses
    'Training': 'training', 'COURSE': 'training', 'Course': 'training',
    # Extra / called in
    'Extra': 'called_in',
    # Travel / events / swaps -> other
    'SWAP': 'other', 'Swap': 'other',
    'AKL': 'other', 'AU ROADSHOW': 'other', 'TRENZ': 'other',
    'TECNZ': 'other', 'HM': 'other', 'KN': 'other', 'LM': 'other',
}

def parse_date(s):
    """Convert '20-Sep-2023' -> '2023-09-20'."""
    s = s.strip()
    for fmt in ('%d-%b-%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return None

with open(CSV_PATH, encoding='utf-8', errors='replace') as f:
    reader = csv.reader(f)
    header = next(reader)

# Identify user columns (index, initials)
user_cols = [
    (i, h.strip())
    for i, h in enumerate(header)
    if h.strip() and h.strip() not in SKIP_HEADERS and i >= 2
]
print(f'User columns ({len(user_cols)}): {[ini for _, ini in user_cols]}')

roster = {}
skipped_statuses = {}
with open(CSV_PATH, encoding='utf-8', errors='replace') as f:
    reader = csv.reader(f)
    next(reader)
    for row in reader:
        date_raw = row[0].strip() if row else ''
        if not date_raw or not date_raw[0].isdigit():
            continue
        date_iso = parse_date(date_raw)
        if not date_iso:
            continue
        day_entry = {}
        for i, ini in user_cols:
            if i >= len(row):
                continue
            raw = row[i].strip()
            if not raw:
                continue
            mapped = STATUS_MAP.get(raw)
            if mapped:
                day_entry[ini] = mapped
            else:
                skipped_statuses[raw] = skipped_statuses.get(raw, 0) + 1
        if day_entry:
            roster[date_iso] = day_entry

print(f'\nGenerated {len(roster)} date entries')
dates = sorted(roster)
if dates:
    print(f'Range: {dates[0]} to {dates[-1]}')

if skipped_statuses:
    print(f'\nSkipped/unmapped values (not written to JSON):')
    for v, c in sorted(skipped_statuses.items(), key=lambda x: -x[1]):
        print(f'  {repr(v)}: {c} occurrences')

with open(OUT_PATH, 'w') as f:
    json.dump(roster, f, separators=(',', ':'))

size = os.path.getsize(OUT_PATH)
print(f'\nWrote {OUT_PATH} ({size:,} bytes)')
