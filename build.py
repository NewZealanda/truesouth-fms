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
    ('flightduty',  'js'),
    ('flightrecord','js'),
    ('businessplan','js'),
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

def scan_top_level_collisions(js_modules):
    """Warn on duplicate TOP-LEVEL (column-0) declarations across the single shared
    global scope. A duplicate const/let/class is a real runtime SyntaxError that
    silently breaks the whole bundle; a duplicate top-level function/var silently
    shadows. Heuristic (column-0 only) so it never touches indented in-function code.
    Warning-only: never fails the build (avoids false positives blocking a deploy)."""
    decl_re = re.compile(r'^(?:async\s+)?(function|const|let|var|class)\s+([A-Za-z_$][\w$]*)')
    seen = {}  # name -> list of (module, kind)
    for name, content in js_modules:
        for line in content.split('\n'):
            m = decl_re.match(line)
            if m:
                seen.setdefault(m.group(2), []).append((name, m.group(1)))
    problems = []
    for sym, occ in seen.items():
        if len(occ) > 1:
            kinds = {k for _, k in occ}
            # const/let/class collisions are hard errors; function/var-only are shadowing risks
            hard = bool(kinds & {'const', 'let', 'class'})
            problems.append((hard, sym, occ))
    if problems:
        problems.sort(key=lambda p: (not p[0], p[1]))
        print('\n  ⚠ Top-level name collisions across the shared scope:')
        for hard, sym, occ in problems:
            tag = 'ERROR(const/let/class)' if hard else 'shadow'
            where = ', '.join(f'{mod}({k})' for mod, k in occ)
            print(f'    [{tag}] {sym}: {where}')
        print('  (const/let/class duplicates will throw at runtime — rename one.)')


def build():
    parts = []
    js_modules = []
    print('Building index.html from modules:')
    for name, ext in ORDER:
        path = os.path.join(MOD_DIR, f'{name}.{ext}')
        if not os.path.exists(path):
            print(f'\nERROR: missing module file: {path}')
            print('  (Check ORDER in build.py against modules/ on disk.)')
            sys.exit(1)
        with open(path, 'r', encoding='latin-1') as f:
            content = f.read()
        # Guard: a stray NUL byte (e.g. a mis-typed string escape) is invisible in editors but ships a
        # corrupt byte that can break CDNs/minifiers. Fail loudly rather than deploy it.
        if '\x00' in content:
            col = content.index('\x00')
            line = content.count('\n', 0, col) + 1
            print(f'\nERROR: NUL byte in {name}.{ext} at line {line} — remove it before building.')
            sys.exit(1)
        # Strip the module header comment from JS files (not needed in output)
        if ext == 'js' and content.startswith('// === MODULE:'):
            content = content[content.index('\n')+1:]
        parts.append(content)
        if ext == 'js':
            js_modules.append((name, content))
        ver = get_module_version(name, ext)
        lines = content.count('\n')
        print(f'  {name:15s} {"v"+ver if ver != "-" else "":8s} {lines:4d} lines')

    scan_top_level_collisions(js_modules)

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
