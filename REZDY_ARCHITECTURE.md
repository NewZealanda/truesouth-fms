# TrueSouth FMS — Rezdy Integration Architecture

> Senior-architect design document for integrating the Rezdy tour-booking platform into the
> TrueSouth Flight Management System. Audience: the operator (Andrew) and any future
> developer. Scope: importing scenic-flight bookings from Rezdy, managing van pickups,
> visualising the flight schedule, and the foundation for aircraft/pilot scheduling, check-in,
> digital manifests, and accounting export.
>
> Status: design / planning. The three tables and the `rezdy-sync` Edge Function described in
> §1 and §3 already exist; everything marked **(proposed)** does not yet.

---

## 0. Context & guiding constraints

TrueSouth is a New Zealand commercial scenic-flight operator. Bookings are taken in **Rezdy**
(the public-facing tour-booking platform); operations — manifests, loadsheets, weight &
balance, roster, leave, maintenance — already live in the **FMS**. Today, moving a Rezdy
booking into the FMS is manual re-keying. This integration closes that gap and adds the
ground-operations pieces Rezdy does not handle: **van pickups** and a **flight schedule**.

Three constraints shape every decision below:

1. **The Rezdy API key is a secret.** The FMS client bundle is a single, publicly-readable
   `index.html` served from Netlify. The key (`REZDY_API_KEY`) is a Supabase secret and must
   **only ever** be used server-side inside an Edge Function. It must never appear in
   `modules/*.js`, in `index.html`, or in any client network request.
2. **Stay inside the existing stack.** Vanilla JS + `build.py` concatenation + Supabase +
   Netlify. New work should be new `modules/*.js` files and new Edge Functions, not a new
   framework or a new hosting model. (Justified in §4.)
3. **Respect Rezdy's rate limits.** Rezdy explicitly recommends caching and warns against
   hammering the API. Our architecture treats Supabase Postgres as the cache of record and
   only hits Rezdy on a deliberate sync, never on every page render.

---

## 1. Overall system architecture & data flow

The integration follows a strict **server-mediated** pattern. The client never talks to Rezdy.
It talks only to Supabase, exactly as the rest of the FMS already does. The only component that
holds the API key is the `rezdy-sync` Edge Function.

```
                          SUPABASE PROJECT (server-side; holds secrets)
                          ┌───────────────────────────────────────────────┐
                          │                                                 │
 ┌──────────────┐  POST   │  ┌────────────────────┐   GET /v1/bookings      │   ┌─────────────┐
 │              │ /functions│  │  Edge Function      │  ?apiKey=••••••••       │   │             │
 │  FMS client  │──────────▶│  │  rezdy-sync         │────────────────────────┼──▶│  Rezdy API  │
 │ (index.html, │ {date}   │  │  (Deno/TypeScript)  │◀───────────────────────┼───│ api.rezdy   │
 │  vanilla JS) │          │  │  • holds API key     │   JSON bookings        │   │  .com/v1    │
 │              │          │  │  • normalises shape  │                        │   └─────────────┘
 │  callFn(     │◀─────────│  │  • upserts cache     │                        │
 │   'rezdy-    │ normalised│  └─────────┬───────────┘                        │
 │   sync',     │ rows     │            │ upsert                              │
 │   {date})    │          │            ▼                                     │
 │              │          │  ┌────────────────────┐                          │
 │              │  GET     │  │  Postgres (cache)   │                          │
 │              │ PostgREST│  │  ts_rezdy_bookings  │                          │
 │  sbF(...)    │◀─────────┼──│  ts_schedule         │  ◀── RLS enforced ──     │
 │              │  rows    │  │  ts_pickup_lists     │      (per-user JWT)      │
 └──────┬───────┘          │  └────────────────────┘                          │
        │                  │                                                   │
        │                  │  ┌────────────────────┐  (proposed)              │
        │ realtime         │  │  pg_cron / scheduled │  nightly + hourly       │
        │ websocket        │  │  invoke rezdy-sync   │  auto-sync              │
        ▼                  │  └────────────────────┘                          │
  live updates             └───────────────────────────────────────────────┘
  (postgres_changes)
```

### Data-flow narrative

**Write path (import a day's bookings):**

1. A user opens the Bookings view for a date, or clicks **Refresh**. The client calls
   `callFn('rezdy-sync', {date:'YYYY-MM-DD'})` — the existing Edge-Function invoke helper in
   `shared.js` (line ~147), carrying the user's JWT.
2. `rezdy-sync` reads `REZDY_API_KEY` from the environment (Supabase secret), calls
   `GET https://api.rezdy.com/v1/bookings?apiKey=…&minTourStartTime=…&maxTourStartTime=…`,
   bounded to that calendar day in NZ local time.
3. It **normalises** each Rezdy booking into our flat shape (§2) and **upserts** into
   `ts_rezdy_bookings` keyed by booking reference, so re-syncing a day is idempotent.
4. It returns the normalised rows to the caller (so the UI can render immediately without a
   second round-trip).

**Read path (everyday use):**

5. All subsequent reads go straight to Postgres via PostgREST using the existing `sbF()` helper
   (`shared.js` line 53) — `sbF('ts_rezdy_bookings', '&tour_date=eq.2026-06-18')`. No Rezdy
   call, no key, RLS-enforced.
6. Pickup lists and schedule blocks are pure Postgres reads/writes (`ts_pickup_lists`,
   `ts_schedule`) and ride the **existing realtime websocket** (`postgres_changes`) so a change
   on the dispatcher's laptop appears on the driver's phone within a second.

The key architectural property: **Rezdy is a source, not a dependency of the hot path.** If
Rezdy is slow or down, the FMS still works off its cached copy; only the Refresh button is
affected.

---

## 2. Database schema

All tables follow the project convention: `id text` primary key, a JSONB `data` blob for the
full/flexible payload, a typed date column for indexing/filtering, and `updated_at`. We add a
few **promoted columns** (extracted from the JSON) where we filter or sort on them often —
JSONB is convenient but a generated/explicit column with a btree index keeps day-range queries
fast as the table grows.

### 2.1 Existing tables

#### `ts_rezdy_bookings` — the cache of normalised Rezdy bookings

```sql
create table if not exists public.ts_rezdy_bookings (
  id          text primary key,        -- booking reference / orderNumber (idempotency key)
  tour_date   date not null,           -- promoted from items[].startTimeLocal (NZ local date)
  data        jsonb not null,          -- full normalised booking (shape below)
  updated_at  timestamptz not null default now()
);
create index if not exists ix_rezdy_bookings_date on public.ts_rezdy_bookings (tour_date);
```

**Normalised `data` shape** (what `rezdy-sync` writes — flatter and friendlier than raw Rezdy):

```jsonc
{
  "ref":        "ORD-12345",            // orderNumber
  "status":     "CONFIRMED",            // Rezdy status
  "product":    "Milford Sound Scenic", // items[].productName
  "departISO":  "2026-06-18T09:30:00",  // items[].startTimeLocal
  "departDate": "2026-06-18",
  "departTime": "09:30",
  "paxCount":   4,                      // items[].totalQuantity
  "customer": {
    "firstName": "Jane", "lastName": "Doe",
    "phone": "+64 3 ...", "mobile": "+64 21 ...", "email": "jane@example.com"
  },
  "pickup": {
    "name": "Hilton Queenstown",        // pickupLocation.locationName
    "lat": -45.034, "lng": 168.661       // pickupLocation.latitude / longitude
  },
  "passengers": [                        // from participants[].fields[] (label/value pairs)
    { "name": "Jane Doe",  "weightKg": 68, "fields": {"Dietary":"-"} },
    { "name": "John Doe",  "weightKg": 84, "fields": {} }
  ],
  "notes":   "Wheelchair, allow extra time",   // comments
  "agent":   "Viator",                          // reseller/agent if present
  "raw":     { /* original Rezdy item kept for audit/debug */ }
}
```

> **Passenger weights** come from Rezdy **participant custom fields**. In `participants[].fields[]`
> each entry is `{label, value}`; the normaliser maps a configured weight-field label
> (e.g. `"Weight (kg)"`) to `weightKg`, and the passenger name field to `name`. The exact field
> labels are operator-configured in Rezdy and read from a small lookup (§3) so a label change
> doesn't require a code change.

#### `ts_schedule` — flight schedule time-blocks (calendar)

```sql
create table if not exists public.ts_schedule (
  id          text primary key,        -- uuid
  sched_date  date not null,
  data        jsonb not null,          -- { aircraftId, label, startISO, endISO, colour,
                                        --   bookingRefs[], pilotId, notes, status }
  updated_at  timestamptz not null default now()
);
create index if not exists ix_schedule_date on public.ts_schedule (sched_date);
```

Each row is one coloured block on the calendar: an aircraft doing a flight in a time window,
optionally linked to one or more bookings (`bookingRefs`) and a pilot.

#### `ts_pickup_lists` — saved/named van-allocation lists

```sql
create table if not exists public.ts_pickup_lists (
  id          text primary key,        -- uuid
  list_date   date not null,
  data        jsonb not null,          -- { name, vans:[{vanNo, capacity:11, stops:[
                                        --   {pickupName, lat, lng, order, collected,
                                        --    bookingRefs[], paxNames[] }]}], generatedAt }
  updated_at  timestamptz not null default now()
);
create index if not exists ix_pickup_lists_date on public.ts_pickup_lists (list_date);
```

A pickup list is the *output* of the van-allocation algorithm (§6) frozen as a named, editable
document — so the dispatcher can generate, hand-tweak (drag-drop), save, and re-open it, and the
driver opens the same row on a phone.

### 2.2 Proposed future tables

These extend the same pattern. Add them when the corresponding feature (§ phased plan) lands —
not before.

| Table | Purpose | Key columns / `data` highlights |
|---|---|---|
| **`ts_aircraft_schedule`** *(proposed)* | Aircraft availability/assignment distinct from flight blocks — maintenance windows, AOG, day-off-base. Lets the calendar grey-out unavailable tails. | `id`, `ac_date date`, `data{aircraftId, kind:'flight'|'maint'|'standby', startISO, endISO}` |
| **`ts_pilot_schedule`** *(proposed)* | Which pilot is on which block, reconciled against the existing roster + leave. | `id`, `duty_date date`, `data{pilotId, blockRefs[], dutyStartISO, dutyEndISO, FDP}` |
| **`ts_checkin`** *(proposed)* | Customer check-in state per booking/passenger (arrived, weighed, briefed, no-show). | `id` (=booking ref), `checkin_date date`, `data{passengers:[{name, arrived, actualWeightKg, briefed}], checkedInBy, at}` |
| **`ts_manifests_digital`** *(proposed)* | The signed-off digital passenger manifest produced from a booking + check-in + loadsheet, retained for compliance. | `id`, `flight_date date`, `data{aircraftId, pilotId, pax[], totalWeight, cofg, signedBy, signedAtISO, pdfUrl}` |
| **`ts_accounting_export`** *(proposed)* | Batches exported to accounting (Xero/MYOB/CSV): revenue per flight, reconciliation against Rezdy orders. | `id`, `export_date date`, `data{period, lines:[...], format, exportedBy, status}` |

All proposed tables inherit the §8 RLS model.

---

## 3. API endpoints / Edge Functions

The client never defines a Rezdy URL. Every Rezdy interaction is an Edge Function. PostgREST
(`/rest/v1/...`) handles all plain table reads/writes via `sbF()`.

### 3.1 Existing: `rezdy-sync`

```
POST /functions/v1/rezdy-sync
Body: { "date": "2026-06-18" }
Auth: caller's Supabase JWT (apikey + Authorization headers, via callFn)
Secret used: REZDY_API_KEY (env)

Behaviour:
  1. Validate date (YYYY-MM-DD). Reject otherwise.
  2. minTourStartTime = date 00:00 NZ;  maxTourStartTime = date 23:59 NZ.
  3. GET https://api.rezdy.com/v1/bookings?apiKey=…&minTourStartTime=…&maxTourStartTime=…
  4. Normalise each booking (§2.1 shape). Map participant custom fields → weights/names.
  5. Upsert into ts_rezdy_bookings (on conflict (id) do update). Idempotent.
  6. Return { ok:true, date, count, bookings:[…normalised…] }.
On Rezdy error: return { ok:false, status, error } — caller falls back to cached read.
```

### 3.2 Proposed Edge Functions

- **`rezdy-sync-scheduled`** *(proposed)* — a cron-triggered wrapper that calls the same core
  as `rezdy-sync` for **today + next N days** (e.g. 14), keeping the cache warm without a user
  clicking Refresh. Scheduled with Supabase Scheduled Functions / `pg_cron` (§8.6). Same
  normaliser, no client involvement.
- **`rezdy-fields`** *(proposed, tiny)* — returns the operator's configured Rezdy custom-field
  labels (weight field, name field, dietary, etc.) so the normaliser and the client stay in
  sync without hardcoding labels. Could equally be a single-row `ts_settings` entry instead of
  a function; prefer the settings row if it changes rarely.
- **`manifest-export`** *(proposed)* — server-side generation of a digital passenger manifest
  PDF from `ts_manifests_digital` + loadsheet data, stored in Supabase Storage, returning a
  signed URL. Server-side so the layout/branding and compliance fields are centralised.
- **`accounting-export`** *(proposed)* — assembles an accounting batch (CSV or Xero API push)
  from `ts_rezdy_bookings` + flown manifests for a period. Any third-party accounting key lives
  as a Supabase secret here, never client-side — same posture as the Rezdy key.

---

## 4. Recommended technology stack

**Recommendation: stay on the current vanilla-JS + Supabase + Netlify stack.** Do not introduce
React/Svelte/Vue or a build toolchain for this work. Justification follows, including the point
at which that recommendation would flip.

### Why stay

- **The hard parts are already solved here.** Auth (per-user JWT), RLS, realtime
  (`postgres_changes`), the `sbF`/`callFn` helpers, the single-global-`S`-state model, and the
  render/`safeRender` cycle are all in place and battle-tested across manifests, loadsheets,
  roster, and leave. Rezdy import, pickups, and the schedule are *more of the same kind of
  feature*: fetch rows, hold them in `S`, render a view, sync via realtime. There is no new
  architectural primitive required.
- **Server-mediated secrets fit perfectly.** The Edge Function pattern (`rezdy-sync`) is exactly
  how a publicly-readable client *should* talk to a keyed third-party API. A heavier frontend
  framework would not change this; the key stays server-side regardless.
- **Operational simplicity.** One `index.html`, one `python3 build.py`, one Netlify deploy,
  `APP_VER` visible in the UI to confirm a live deploy. A single operator-developer benefits
  enormously from not maintaining a node toolchain, bundler, and framework upgrade treadmill.
- **The data volumes are tiny.** A scenic operator's day is tens of bookings, single-digit
  aircraft, three vans. This is comfortably within what direct DOM rendering handles.

### Where the current stack strains (be honest)

- **Drag-and-drop pickup tables** and a **Google-Calendar-style schedule** are the most
  DOM-state-heavy views the app will have had. Vanilla `render()` rebuilding the whole DOM
  fights with in-progress drags and live realtime updates — the same class of problem
  `safeRender()` already mitigates for focused inputs. These two views need careful, *localised*
  DOM updates (mutate the dragged node, don't full-`render()` mid-drag) rather than the
  whole-DOM rebuild used elsewhere.
- **One global scope.** Every new module shares the global namespace (per CLAUDE.md). Three new
  feature modules raise collision risk; discipline (prefix everything, e.g. `RZ_`, `PK_`, `SC_`)
  is required and is cheaper than a framework's module system *for now*.
- **No component reuse.** The booking card, the pickup row, and the schedule block are each
  hand-rolled HTML strings. Acceptable at this size; tedious past a point.

### The threshold to reconsider a framework

Adopt a component framework (React or, lighter-weight, Svelte/Preact) **when two or more** of
these become true:

1. The app has **5+ genuinely interactive, stateful views** with drag-drop / live-edit (pickups
   and schedule push us toward this — they are the canary).
2. `render()`-vs-realtime / `render()`-vs-drag bugs become recurring rather than occasional.
3. A **second developer** joins and the single-global-scope model causes friction.
4. The team wants a typed codebase (TypeScript) for the growing data model.

Until then, the migration cost (rewrite, toolchain, retraining the deploy story) outweighs the
benefit. If/when you cross the threshold, the cleanest path is **Svelte or Preact compiled to a
single bundle that Netlify still serves statically**, keeping Supabase and the Edge Functions
exactly as they are — i.e. only the view layer changes, not the backend.

**For this integration: vanilla JS, three new modules, two-to-five new Edge Functions.**

---

## 5. Phased implementation plan

Each phase is independently shippable and bumps `APP_VER`. Build/verify per CLAUDE.md
(`python3 build.py`, `node --check` the extracted script, commit with the temp-index trick, do
not push).

### Phase 1 — Booking import (read-only) ✅ backend exists
- Confirm `rezdy-sync` and `ts_rezdy_bookings` against a real Rezdy day.
- New module `modules/rezdy.js` (added to `build.py` ORDER): a **Bookings** view with a date
  picker, a **Refresh** button (`callFn('rezdy-sync', {date})`), and a list rendered from
  `sbF('ts_rezdy_bookings', '&tour_date=eq.'+date)`.
- Display every requested field: ref, customer, pax count, passenger names + weights, phone,
  email, pickup, product, depart date/time, notes, status, agent.
- **Deliverable:** dispatchers see today's Rezdy bookings inside the FMS, no re-keying.

### Phase 2 — Pickup management
- New module `modules/pickups.js`.
- Implement the van-allocation algorithm (§6) generating a draft from the day's bookings.
- Drag-drop tabular UI (§7) across 3 vans; mark-collected; save/open named lists
  (`ts_pickup_lists`); realtime so the driver's phone updates live.
- Mobile driver view (§7) — read-mostly, big touch targets, tap-to-collect.
- **Deliverable:** generate, tweak, save, and drive a pickup run from a phone.

### Phase 3 — Schedule calendar
- New module `modules/schedule.js`.
- Day/week calendar, colour-coded blocks per aircraft, blocks linkable to bookings
  (`ts_schedule`). Manual create/move/resize.
- **Deliverable:** at-a-glance "who's flying what, when".

### Phase 4 — Auto-sync & hardening
- Deploy `rezdy-sync-scheduled` (cron) for a warm cache (today + 14 days).
- Retry/backoff + structured error surfacing in the UI (§8).
- Move custom-field labels to config (`rezdy-fields` or `ts_settings`).

### Phase 5 — Operations depth *(future)*
- Aircraft scheduling (`ts_aircraft_schedule`) + pilot scheduling (`ts_pilot_schedule`)
  reconciled with roster/leave.
- Customer check-in (`ts_checkin`): arrived / weighed / briefed, feeding actual weights into the
  loadsheet W&B.
- Digital manifests (`ts_manifests_digital` + `manifest-export`).
- Accounting export (`ts_accounting_export` + `accounting-export`).

---

## 6. Example code snippets

### 6.1 Edge Function: fetch + normalise + cache (Deno / TypeScript)

The shape `rezdy-sync` should have. Note the key is read from `Deno.env`, never returned.

```ts
// supabase/functions/rezdy-sync/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const REZDY_BASE = "https://api.rezdy.com/v1";
const NZ_TZ = "Pacific/Auckland";

Deno.serve(async (req) => {
  try {
    const { date } = await req.json();                 // "YYYY-MM-DD"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
      return json({ ok: false, error: "bad date" }, 400);
    }

    const apiKey = Deno.env.get("REZDY_API_KEY")!;      // secret — server only
    const min = `${date}T00:00:00`;                     // NZ local day window
    const max = `${date}T23:59:59`;

    // Caching/rate-limit friendly: one call per day-sync, with retry/backoff.
    const bookings = await rezdyGet(
      `${REZDY_BASE}/bookings?apiKey=${apiKey}` +
      `&minTourStartTime=${encodeURIComponent(min)}` +
      `&maxTourStartTime=${encodeURIComponent(max)}`,
    );

    const rows = (bookings ?? []).map(normalise);

    // Service-role client (Edge env) bypasses RLS to write the cache.
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    if (rows.length) {
      const { error } = await sb.from("ts_rezdy_bookings").upsert(
        rows.map((r) => ({
          id: r.ref, tour_date: r.departDate, data: r, updated_at: new Date().toISOString(),
        })),
        { onConflict: "id" },                            // idempotent re-sync
      );
      if (error) throw error;
    }
    return json({ ok: true, date, count: rows.length, bookings: rows });
  } catch (e) {
    return json({ ok: false, error: String(e?.message ?? e) }, 502);
  }
});

// Retry with exponential backoff — respects Rezdy rate limits / transient 5xx.
async function rezdyGet(url: string, tries = 3): Promise<any[]> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (r.ok) return (await r.json())?.bookings ?? [];
    if (r.status === 429 || r.status >= 500) {           // back off and retry
      await sleep(400 * 2 ** i);
      continue;
    }
    throw new Error(`Rezdy ${r.status}: ${await r.text()}`);
  }
  throw new Error("Rezdy unavailable after retries");
}

// Map raw Rezdy → our flat shape. Participant custom fields → name + weight.
function normalise(b: any) {
  const item = b.items?.[0] ?? {};
  const WEIGHT_LABELS = ["Weight (kg)", "Weight", "Passenger weight"]; // configurable
  const passengers = (item.participants ?? []).map((p: any) => {
    const f: Record<string, string> = {};
    for (const { label, value } of p.fields ?? []) f[label] = value;
    const wLabel = WEIGHT_LABELS.find((l) => f[l] != null);
    return {
      name: f["Name"] ?? f["Full name"] ?? "",
      weightKg: wLabel ? Number(String(f[wLabel]).replace(/[^\d.]/g, "")) || null : null,
      fields: f,
    };
  });
  const start = item.startTimeLocal ?? "";
  return {
    ref: b.orderNumber, status: b.status, product: item.productName ?? "",
    departISO: start, departDate: start.slice(0, 10), departTime: start.slice(11, 16),
    paxCount: item.totalQuantity ?? passengers.length,
    customer: {
      firstName: b.customer?.firstName ?? "", lastName: b.customer?.lastName ?? "",
      phone: b.customer?.phone ?? "", mobile: b.customer?.mobile ?? "",
      email: b.customer?.email ?? "",
    },
    pickup: {
      name: item.pickupLocation?.locationName ?? "",
      lat: item.pickupLocation?.latitude ?? null, lng: item.pickupLocation?.longitude ?? null,
    },
    passengers, notes: b.comments ?? "", agent: b.agent ?? b.reseller ?? null, raw: item,
  };
}

const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

### 6.2 Client: read bookings via the existing `sbF` helper

The client only ever reads the cache and invokes the function — it never sees the key.

```js
// modules/rezdy.js  (new module; added to build.py ORDER)
// Refresh: tell the server to pull this day from Rezdy, then read the cache.
async function rzRefresh(date){                       // date = 'YYYY-MM-DD'
  S.rz = S.rz || {};
  S.rz.loading = true; safeRender();
  const res = await callFn('rezdy-sync', { date });   // server holds REZDY_API_KEY
  if(!res.ok){
    S.rz.error = (res.data && res.data.error) || 'Rezdy sync failed';
    // fall through: still show whatever is cached
  } else {
    S.rz.error = null;
  }
  await rzLoad(date);                                 // always read cache (works offline-of-Rezdy)
  S.rz.loading = false; render();
}

// Plain PostgREST read of the cache — RLS-enforced, no Rezdy call.
async function rzLoad(date){
  const rows = await sbF('ts_rezdy_bookings', '&tour_date=eq.'+date, 'updated_at');
  S.rz = S.rz || {};
  S.rz.date = date;
  S.rz.bookings = (rows || []).map(r => r.data);      // already normalised server-side
  return S.rz.bookings;
}
```

### 6.3 Van-allocation algorithm (pseudocode)

Rules: **3 × Hiace, 11 seats each. Fill one van before starting the next. Within a van, order
stops furthest→nearest** (so the van ends near the airport/base). **Group identical pickup
locations together** (one stop, many pax). The reference point is the **base/airport**.

```
function allocateVans(bookings, base, vans = [{no:1,cap:11},{no:2,cap:11},{no:3,cap:11}]):
    # 1. Group passengers by pickup location (identical locationName → one stop)
    stops = {}                                  # key: pickupName
    for b in bookings:
        if b.pickup.name is empty: skip (self-drive / no pickup)
        s = stops.getOrCreate(b.pickup.name, {name, lat, lng, pax:0, refs:[], names:[]})
        s.pax    += b.paxCount
        s.refs   += b.ref
        s.names  += b.passengers.map(p => p.name)

    stopList = stops.values()

    # 2. Distance from base for each stop (haversine on lat/lng; fall back to manual order
    #    if coords missing). Sort FURTHEST → NEAREST.
    for s in stopList: s.dist = haversine(base, {s.lat, s.lng})
    sort stopList by dist DESCENDING            # furthest first

    # 3. Fill van 1 to capacity, then van 2, then van 3 (first-fit, keep groups whole)
    vi = 0
    for s in stopList:
        # if a single stop's pax > remaining capacity, it may split across stops within a van,
        # but try to keep a stop whole; only split if pax > 11 (rare for a pickup point)
        while s.pax > 0 and vi < vans.length:
            van = vans[vi]
            room = van.cap - van.used
            if room == 0: vi += 1; continue
            take = min(room, s.pax)
            van.stops.append({ ...s, paxOnThisVan: take, collected:false })
            van.used += take
            s.pax    -= take
            if s.pax > 0: vi += 1     # van full, overflow to next van

    # 4. Within each van, the stops are already furthest→nearest from step 2 ordering.
    #    Number them as the drive order.
    for van in vans:
        for i, stop in enumerate(van.stops): stop.order = i + 1

    if anyStopUnassigned: warn("more pax than 33 van seats — add a run or split day")
    return vans   # → saved as ts_pickup_lists.data.vans
```

> The result is a draft. The dispatcher then drag-drops in the UI (§7) to override edge cases
> (e.g. a mobility passenger who must ride van 1), and saves it as a named list.

---

## 7. UI wireframe concepts

ASCII sketches — intent, not pixel spec. All views live inside the existing FMS shell/tab
chrome.

### 7.1 Booking list view (desktop)

```
┌ Bookings ───────────────────────────────────────────── [v22.xx] ┐
│  Date: [ 2026-06-18 ▼ ]   [ ⟳ Refresh from Rezdy ]   12 bookings  │
│  ── synced 2 min ago ──                            [⚠ 1 no weight] │
├──────────────────────────────────────────────────────────────────┤
│ ▸ 09:30  Milford Scenic   ORD-12345  CONFIRMED   4 pax   Viator    │
│     Jane Doe  ·  +64 21 …  ·  jane@…                               │
│     Pickup: Hilton Queenstown                                      │
│     Pax: Jane Doe 68kg · John Doe 84kg · A. Doe — · B. Doe 22kg    │
│     Notes: Wheelchair, allow extra time                            │
│ ─────────────────────────────────────────────────────────────────│
│ ▸ 09:30  Milford Scenic   ORD-12346  CONFIRMED   2 pax            │
│     ...                                                            │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Pickup management screen (desktop, drag-drop)

```
┌ Pickups — 2026-06-18 ─────────────────── [Open list ▼] [Save as…] ┐
│  [ ⚙ Auto-allocate ]   Base: Queenstown Airport   33 seats / 26 pax │
├──────────────┬──────────────┬──────────────────────────────────────┤
│  VAN 1 (8/11)│  VAN 2 (10/11)│  VAN 3 (8/11)                         │
│  furthest→   │              │                                       │
│  near base   │              │                                       │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐                          │
│ │1 Glenorchy│ │ │1 Arrowtn │ │ │1 Fernhill│   ← drag rows between    │
│ │  4 pax  ☐ │ │ │  6 pax ☐ │ │ │  3 pax ☐ │      vans / reorder      │
│ ├──────────┤ │ ├──────────┤ │ ├──────────┤                          │
│ │2 Hilton  │ │ │2 CBD Hotel│ │ │2 Airport │                          │
│ │  4 pax  ☑ │ │ │  4 pax ☐ │ │ │  5 pax ☐ │   ☑ = collected          │
│ └──────────┘ │ └──────────┘ │ └──────────┘                          │
└──────────────┴──────────────┴──────────────────────────────────────┘
  Drag a stop card to another van or reorder within a van.
  Named lists saved to ts_pickup_lists; changes sync live to drivers.
```

### 7.3 Mobile driver view (phone, read-mostly)

```
┌──────────────────────┐
│ VAN 2 · 18 Jun        │
│ 10 pax · 2 of 4 done  │
├──────────────────────┤
│ ① Arrowtown      6pax │
│   123 Buckingham St   │
│   ☑ COLLECTED         │
├──────────────────────┤
│ ② CBD Hotel      4pax │
│   ☐  [  COLLECT  ]    │  ← big tap target; sets collected=true,
│   ☎ call lead pax     │     broadcasts via realtime
├──────────────────────┤
│ ③ ...                 │
└──────────────────────┘
```

### 7.4 Schedule calendar (desktop, Google-Calendar-like)

```
┌ Schedule — Wed 18 Jun ───────────────────── [Day][Week] [+ Block] ┐
│ time  │ ZK-ABC (blue)    │ ZK-DEF (green)   │ ZK-GHI (amber)       │
│ 08:00 │░░░░░░░░░░░░░░░░░░ │                  │                      │
│ 09:00 │▓ Milford 09:30   │░░░░░░░░░░░░░░░░░░ │                      │
│ 10:00 │▓ ORD-12345 4pax  │▓ Routeburn 10:00 │                      │
│ 11:00 │                  │▓ ORD-12350 2pax  │░░ Maint (grey) ░░░░░ │
│ 12:00 │░░░░░░░░░░░░░░░░░░ │                  │░░ 100hr check ░░░░░░ │
│ 13:00 │▓ Glaciers 13:00  │                  │                      │
└───────┴──────────────────┴──────────────────┴──────────────────────┘
  Each column = one aircraft, colour-coded. Blocks = ts_schedule rows,
  linked to booking refs. Click a block → booking + pax detail.
```

---

## 8. Security & scalability

### 8.1 API-key handling (the non-negotiable)
- `REZDY_API_KEY` lives **only** as a Supabase secret, read via `Deno.env.get` inside
  `rezdy-sync` / `rezdy-sync-scheduled`. It is never in `modules/*.js`, never in `index.html`,
  never returned in a response body, never logged.
- Any future third-party secret (accounting API, SMS) follows the **same posture**: secret in
  Supabase, used only in an Edge Function. The publicly-readable client bundle is treated as
  hostile-readable by design.
- Code review / CI guard *(proposed)*: a grep in the build step that fails if a known secret
  pattern or the literal env name leaks into `index.html`.

### 8.2 RLS
- The project has migrated to **per-user JWT + RLS** (Phase C). The new tables join that model:
  - `ts_rezdy_bookings`, `ts_schedule`, `ts_pickup_lists`: **read** for any `authenticated`
    user; **write from the client** restricted to dispatch/ops roles
    (`public.app_role() in ('admin','superadmin','cx_manager')`), mirroring `ts_roster_build`.
    The *cache writes* from `rezdy-sync` use the **service role** inside the Edge Function and
    bypass RLS — that's correct, because the function is trusted server code.
  - Driver "mark collected" is a write to `ts_pickup_lists`; if drivers are a lower-privileged
    role, add a narrow policy allowing them to update only the `collected` flags (or route their
    update through a small Edge Function that validates the change).
  - Proposed tables: same template — read broadly, write by role; PII-bearing rows
    (`ts_checkin`, `ts_rezdy_bookings` customer data) stay `authenticated`-only, never `anon`.
- **PII note:** Rezdy bookings carry customer name, phone, email and passenger weights — personal
  information under the NZ Privacy Act. Keep it behind auth, don't export it to logs, and prune
  the cache (see 8.5).

### 8.3 Caching to respect Rezdy rate limits
- **Postgres is the cache of record.** The client reads `ts_rezdy_bookings`, not Rezdy. Rezdy is
  hit only on an explicit Refresh or the scheduled job.
- **Per-day idempotent upsert** keyed on booking ref means re-syncing a day is cheap and safe.
- **Debounce Refresh** client-side (ignore clicks within, say, 30 s of the last sync for the same
  date) and show "synced N min ago" so users don't spam it.
- The scheduled job (8.6) keeps the common window warm, so interactive Refresh is rarely needed.

### 8.4 Retry / backoff
- `rezdy-sync` retries transient failures (HTTP 429 and 5xx) with **exponential backoff**
  (~400 ms × 2ⁿ, 3 tries — see §6.1). Permanent errors (4xx other than 429) fail fast with a
  clear message. The function never blocks the UI's cached read.

### 8.5 Error handling & data hygiene
- Function returns `{ ok:false, status, error }`; the client surfaces a non-blocking banner
  ("Rezdy unreachable — showing last synced data") and still renders the cache.
- Normalisation is **defensive**: missing pickup, missing weights, empty participants all degrade
  to safe defaults (and the UI flags "no weight" so dispatch chases it before W&B).
- **Retention/pruning** *(proposed)*: a periodic job deletes `ts_rezdy_bookings` older than ~90
  days to bound table size and limit PII retention.

### 8.6 Near-real-time
Two complementary mechanisms, both already idiomatic in this codebase:

1. **Manual refresh** — the Refresh button (`callFn('rezdy-sync', {date})`) for "I need the
   absolute latest right now" (e.g. a last-minute online booking).
2. **Scheduled sync** — `rezdy-sync-scheduled` via Supabase Scheduled Functions / `pg_cron`,
   e.g. every 15–30 min for today and nightly for the next 14 days. Keeps the cache fresh
   without user action.
3. **Realtime fan-out** — once a row lands in Postgres, the **existing realtime websocket**
   (`postgres_changes` on `ts_rezdy_bookings` / `ts_pickup_lists` / `ts_schedule`) pushes it to
   every connected client. So the dispatcher's sync, or a driver's "collected" tap, appears on
   the other screens within ~1 s — without any of them polling Rezdy.

This gives genuinely live ground-ops behaviour while touching Rezdy as little as possible.

---

## 9. Risks & open decisions

- **Custom-field label coupling.** Passenger weights depend on Rezdy participant field labels.
  Centralise the labels (`rezdy-fields` / `ts_settings`) so a Rezdy form edit doesn't silently
  break weight import. Flag bookings with missing weights loudly.
- **Pickup geocoding.** The furthest→nearest ordering needs `lat/lng`. Rezdy provides them when
  the pickup location is geocoded; for free-text pickups, fall back to a manual order the
  dispatcher sets once and the algorithm remembers.
- **Drag-drop vs full `render()`.** As called out in §4, the pickup and schedule views must do
  localised DOM updates during drag, not whole-DOM rebuilds, and must reconcile carefully with
  realtime updates (don't clobber an in-progress drag — same spirit as `safeRender()`).
- **>33 pax days.** Three 11-seat vans cap a single run at 33. The algorithm must warn and the UI
  must support a second run / split — design `ts_pickup_lists` to hold more than three vans if
  the operation grows.
- **Booking mutations in Rezdy** (cancellations, time changes) are caught by re-sync (idempotent
  upsert), but a *deleted* Rezdy booking won't auto-disappear from the cache — the sync should
  reconcile (mark cached rows absent from the latest pull as `status:'CANCELLED'` for that day,
  rather than leaving stale CONFIRMED rows).
