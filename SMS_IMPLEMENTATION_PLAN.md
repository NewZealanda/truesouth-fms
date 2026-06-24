# TrueSouth FMS — SMS (Safety Management System) implementation plan

Goal: fold the GoNoGo SMS (currently a Knack web app at `gonogo.knack.com/true-south-flights`)
into TrueSouth FMS, so reporting, hazards/risks, meetings and the rest live in one operator app
that already knows our fleet, crew and flights. This is a **plan only** — nothing built yet.

---

## 1. What GoNoGo actually is (observed 24 Jun 2026)

A mature, wide aviation SMS. Modules seen:

| Module | What it holds | Records |
|---|---|---|
| **Issues, Ideas & Incidents** | Front-line safety reporting register | ~420 |
| **Hazards & Risks** | Risk register with initial/residual risk matrix | ~39 |
| **Project Planner** | Safety actions/projects (Kanban-ish) | — |
| **Meetings** | Safety meetings + minutes, linked to hazards/issues | — |
| **Safety Reports** | Charts/analytics | — |
| **My Stuff** | "What's assigned to me / I raised" | — |
| **Dashboard Home** | 6-month trend charts, open vs total | — |
| Company Documents | Controlled doc library | — |
| Hazardous Substances | HSNO register | — |
| Operations Notices | Ops notices/NOTAM-style | — |
| Audits | Audit checklists + findings | — |
| Visitors / Contractors / Personnel | People registers | — |
| Equipment | Equipment register | — |

The reporting form is deliberately tiny (encourages reporting): *What is the issue?* (required),
*Other information*, *Name* (optional — **anonymous allowed**), *Aircraft Registration* (dropdown),
*Date*, two images + a document. Everything else (status, classification, linked hazard, corrective
**tasks**) is added during triage.

**The two registers that matter most** — and integrate naturally with the FMS — are
**Issues/Incidents** and **Hazards & Risks**. The rest are generic admin registers that can follow.

---

## 2. Architecture fit (no surprises)

The FMS already has the hooks for this:

- **Nav stub exists.** `S.section==='sms'` is a placeholder ("🛡️ SMS — Safety Management System"),
  gated by `_sectionAllowed('sms')` → `hasRolePerm('sms')`. We fill it in instead of stubbing it.
- **New module `modules/sms.js`**, added to the `build.py` ORDER (after `businessplan.js`, before
  `roster.js` say). One global scope — prefix everything `_sms…` / `S._sms…` to avoid collisions.
- **Supabase tables** (`ts_sms_*`), REST + the existing realtime websocket, RLS per the current
  per-role `has_perm()` scheme. Lazy-load on first open (like `loadFlightDuty` / `loadBusinessPlan`).
- **Permissions:** add an SMS column-set to `DEFAULT_ROLE_PERMS` + `PERM_COLS`. Suggested perms:
  - `sms` — see the SMS section (everyone who should).
  - `sms_report` — submit an issue (effectively everyone signed in; anonymous handled separately).
  - `sms_manage` — triage/classify, edit hazards, close issues, assign tasks (safety officer / admin).
  - `sms_admin` — settings, risk-matrix config, delete.
- **Notifications:** reuse `ts_notifications` for "task assigned to you", "issue needs review", etc.
- **Files:** issue photos/docs. Two options — (a) **Supabase Storage** bucket `sms` (cleanest, keeps
  it self-contained), or (b) the existing **Google Drive** upload path we use for loadsheets. Decision
  needed; I lean Supabase Storage so reports aren't gated on a Google sign-in.

### FMS integration points (the reason to bring it in-house)
- **Aircraft** dropdown ← `S.aircraft` (the real fleet), not a free-typed string.
- **Reporter** ← the signed-in `S.user` (with an explicit "submit anonymously" toggle that omits it).
- **Link an issue to a flight / loadsheet** (optional) — e.g. attach an incident to the day's
  `ts_flight_records` / loadsheet so it's traceable.
- **Crew** ← `S.crew` / `S.users` for "assigned to" and meeting attendees.
- **Maintenance** ← raise a maintenance booking from an equipment/aircraft defect, or vice-versa.

---

## 3. Data model (proposed Supabase tables)

Mirrors the existing style (text PKs `sms_<epoch>_<rand>`, `updated_at/by`, RLS `to authenticated`).

### Phase 1 — core

**`ts_sms_issues`** (Issues / Ideas / Incidents)
```
id            text pk
ref           text         -- human ref e.g. "SR-2026-014" (auto)
title         text not null -- "What is the issue?"
details       text          -- other information
type          text          -- 'issue' | 'idea' | 'incident' | 'hazard-obs'
reporter_id   text          -- user id, null if anonymous
reporter_name text          -- typed name (optional)
anonymous     boolean default false
aircraft      text          -- ZK-xxx (nullable)
flight_record_id text       -- optional link to ts_flight_records
date_raised   date not null
status        text default 'open'  -- 'open' | 'in_review' | 'actioned' | 'closed'
classification text         -- e.g. 'Operational' | 'Technical' | 'Ground' | 'Airspace' …
severity      text          -- triage severity (optional, ties to risk matrix)
hazard_id     text          -- linked hazard (ts_sms_hazards)
images        jsonb         -- [{name,url}]
documents     jsonb
closed_at     timestamptz
closed_by     text
updated_at    timestamptz default now()
updated_by    text
```

**`ts_sms_tasks`** (corrective actions — used by issues, hazards, audits, meetings)
```
id          text pk
parent_type text   -- 'issue' | 'hazard' | 'audit' | 'meeting'
parent_id   text
title       text not null
detail      text
assigned_to text   -- user id
due_date    date
status      text default 'open'  -- 'open' | 'in_progress' | 'done'
done_at     timestamptz
updated_at  timestamptz default now()
updated_by  text
```

**`ts_sms_hazards`** (Hazards & Risks register)
```
id           text pk
ref          text
hazard       text not null
details      text
area         text          -- 'Flight Ops' | 'Ground' | 'Maintenance' | 'Airspace' …
status       text default 'open'   -- 'open' | 'monitored' | 'closed'
review_date  date
initial_likelihood int   -- 1..5
initial_consequence int  -- 1..5
final_likelihood   int
final_consequence  int
-- risk score + band derived from the matrix (see §4)
owner_id     text
updated_at   timestamptz default now()
updated_by   text
```

**`ts_sms_risks`** (the controls/mitigations under a hazard — one hazard → many risks)
```
id          text pk
hazard_id   text not null
risk        text          -- the risk/consequence statement
controls    text          -- existing + proposed controls
likelihood  int
consequence int
updated_at  timestamptz default now()
updated_by  text
```

### Phase 2 — collaboration & cadence

- **`ts_sms_meetings`** — `id, date, title, attendees jsonb, minutes, actions(→tasks), linked_hazards
  jsonb, linked_issues jsonb`.
- **`ts_sms_audits`** — `id, ref, title, template, date, auditor, status, findings jsonb (→issues/tasks)`.
- **`ts_sms_documents`** — controlled doc register (`id, title, category, version, review_date, url,
  owner`) — pairs naturally with the existing Drive/loadsheet upload plumbing.

### Phase 3 — registers (lighter, generic)

`ts_sms_substances` (HSNO), `ts_sms_opsnotices`, `ts_sms_equipment`, and people registers
(`visitors / contractors / personnel`). Personnel likely just reads `S.crew`/`S.users` rather than a
new table.

---

## 4. Risk matrix (config-driven, like the F&D limits)

A 5×5 likelihood × consequence matrix → score → band (Low / Medium / High / Extreme) with the
green/amber/red colouring GoNoGo uses. Store the band thresholds + colours in `ts_settings`
(`sms_risk_matrix`) so they're editable in Settings ▸ Operations (mirrors `renderFDLimits`). Initial
risk vs final/residual risk both render against it; a hazard's tile shows initial → final like GoNoGo.

---

## 5. Screens (what `renderSMS()` builds)

Tier-2 tabs inside the SMS section (same pattern as Operations/Pilot Bag):

1. **Report** — the big friendly "Raise an issue" form (mobile-first; QR-code-to-report is a nice
   later touch — GoNoGo has QR codes). Anonymous toggle. Aircraft from the fleet.
2. **Register** — the Issues list with status/classification filters, search, and a triage drawer
   (set status, classify, link hazard, add corrective tasks). Matches GoNoGo's table + edit/view/tasks.
3. **Hazards & Risks** — register with the matrix colouring; hazard detail → risks → controls →
   residual risk; review-date reminders.
4. **Meetings**, **Audits**, **Documents** (Phase 2 tabs).
5. **Dashboard** — open vs total trend, by classification, overdue tasks, hazards due for review
   (Recharts is already available in the app).
6. **My Stuff** — my reports + tasks assigned to me (just filtered views).

---

## 6. Migrating the existing GoNoGo data

GoNoGo is Knack; export each object to CSV from its builder (Records ▸ Export), then I map →
`ts_sms_*` and load (SQL file or batched API, your call — same as the Access import flow). Priorities:
the ~420 issues and ~39 hazards (+ their risks/controls and any open tasks). Attachments would need
re-hosting (Knack asset URLs → Supabase Storage/Drive) — doable but the fiddly part; we can start with
text + links and backfill files.

---

## 7. Suggested phasing & rough effort

- **Phase 1 — Report + Register + Hazards/Risks + Tasks + matrix + perms + RLS + migrate issues/hazards.**
  This is the 80/20 — staff can report from the FMS and safety can triage and manage risk. Largest
  single chunk but self-contained.
- **Phase 2 — Meetings, Audits, Documents, Dashboard/Safety Reports, notifications, QR-to-report.**
- **Phase 3 — the generic registers** (substances, ops notices, equipment, visitors/contractors,
  personnel) — quick CRUD tables once the framework exists.

Each phase ships behind the `sms` permission so it can be enabled per-role as it lands, and the FMS
keeps running unaffected if a phase is mid-build.

---

## 8. Open decisions for you

1. **File storage** for report photos/docs — Supabase Storage (recommended) vs the Google Drive path.
2. **Anonymous reporting** — keep it (GoNoGo has it). Confirm.
3. **Do we retire GoNoGo** once Phase 1+2 are live, or run both for a while? (Affects how hard we chase
   100% feature parity on the long-tail registers.)
4. **Ref/numbering scheme** for issues and hazards (e.g. `SR-2026-NNN`).
5. **Who gets `sms_manage`** (the safety officer role) vs report-only.

Nothing here touches existing FMS behaviour until we build it; the `sms` nav slot and permission are
already reserved.
