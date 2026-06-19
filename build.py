#!/usr/bin/env python3
"""
TrueSouth FMS - Build Script
Concatenates module files into index.html

Usage:
    python3 build.py

Modules (in order):
    head.html      HTML head, CSS, meta tags
    shared.js      State, DB, utility functions, calcFormWB
    shell.js       renderApp, renderOperations, presence/flash system
    loadsheet.js   renderLoadsheet
    saved.js       renderSaved
    charter.js     renderCharter, renderCharterRates
    admin.js       renderAdmin*, generateLoadsheet, renderRouteMap, utils
    maintenance.js renderMaintenance + all sub-renderers
    tail.html      Closing tags + init
"""
import os, re, sys
from datetime import datetime

MOD_DIR = os.path.join(os.path.dirname(__file__), 'modules')
OUT_FILE = os.path.join(os.path.dirname(__file__), 'index.html')

ORDER = [
    ('head',        'html'),
    ('shared',      'js'),
    ('shell',       'js'),
    ('loadsheet',  'js'),
    ('scratchpad',  'js'),
    ('aerodromes',  'js'),
    ('saved',       'js'),
    ('charter',     'js'),
    ('admin',       'js'),
    ('maintenance', 'js'),
    ('roster',      'js'),
    ('leave',       'js'),
    ('rezdy',       'js'),
    ('tail',        'html'),
]

def get_module_version(name, ext):
    path = os.path.join(MOD_DIR, f'{name}.{ext}')
    if ext == 'js':
        with open(path, 'r', encoding='latin-1') as f:
            first = f.readline()
        m = re.search(r'=== v([\d.]+) ===', first)
        return m.group(1) if m else '?'
    return '-'

def build():
    parts = []
    print('Building index.html from modules:')
    for name, ext in ORDER:
        path = os.path.join(MOD_DIR, f'{name}.{ext}')
        with open(path, 'r', encoding='latin-1') as f:
            content = f.read()
        # Strip the module header comment from JS files (not needed in output)
        if ext == 'js' and content.startswith('// === MODULE:'):
            content = content[content.index('\n')+1:]
        parts.append(content)
        ver = get_module_version(name, ext)
        lines = content.count('\n')
        print(f'  {name:15s} {"v"+ver if ver != "-" else "":8s} {lines:4d} lines')
    
    output = ''.join(parts)
    
    # Verify latin-1 encodable
    try:
        encoded = output.encode('latin-1')
    except UnicodeEncodeError as e:
        print(f'\nERROR: Non-latin-1 character found: {e}')
        sys.exit(1)
    
    with open(OUT_FILE, 'wb') as f:
        f.write(encoded)
    
    total = output.count('\n')
    size_kb = len(encoded) / 1024
    print(f'\nOutput: index.html  {total} lines  {size_kb:.0f} KB')
    print(f'Built at {datetime.now().strftime("%H:%M:%S")}')

if __name__ == '__main__':
    build()
