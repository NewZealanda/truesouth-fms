# TrueSouth FMS — Architecture Review & Bug Sweep (v24.04)

Date: 2026-06-20. Method: five parallel deep read-only audits (Rezdy; Loadsheet+W&B;
Sync/Realtime/Persistence; Roster/Leave/Maintenance/Notifications; Security/XSS/Build),
followed by triage. **Fixes applied this pass are high-confidence, localized, and
inspection-verifiable.** Larger realtime/auth changes and operator-facing math changes are
listed as backlog (Section 3) — they need runtime testing on a real device and were
deliberately NOT shipped blind in this batch.

Supersedes the open items in `ARCHITECTURE_REVIEW_v23.04.md`.

---

## 1. FIXED in v24.04

### Weight & balance (safety-critical)
- **Co-pilot orphaned bag/infant (HIGH).** `lsCoPilot` (admin.js) pushed a displaced
  seat-1 passenger to the pool but never cleared `f.bags[1]` / `f.infantNames[1]`, so
  `calcFormWB` counted the orphaned bag as crew weight — silent TOW/CoG inflation on a
  signable loadsheet. Now deletes both with the rest of the seat-1 maps.
- **Removed-seat submit gate (HIGH).** The Save/Submit gate's `_overCap` only counted seats
  `>= capacity`, but `calcFormWB` and the red banner also count *removed* seats (e.g. ZK-SLB
  12/13). A passenger on a removed seat added weight yet didn't block signing. The gate now
  uses the same predicate as the banner (`>=capacity || removedSeats.includes`).

### Security / XSS
- **toast() rendered raw HTML (HIGH, customer-controlled).** `shell.js` interpolated
  `t.msg` unescaped; many toasts embed Rezdy passenger names. A customer typing
  `<img src=x onerror=…>` as their booking name → script ran in staff browser when toasted.
  Now `esc(t.msg)`. (No toast passes intentional HTML — verified.)
- **Loadsheet seat-name sinks (HIGH, customer-controlled).** Passenger first-name on the
  seat grid, infant name, and the unallocated-pool bubble name were interpolated unescaped
  (`.split(' ')[0]` does not stop a space-free payload). All three now `esc()`-wrapped.
- **Admin person-editor attribute breakout (MED).** `value="..."` for name/code/DL#/CAA#/
  email was unescaped — a `"` broke out of the attribute. Now escaped.
- **Audit-log local `esc()` (MED).** The function-local `esc` in `renderAdminAudit` did not
  escape `"`, but its output is used inside a `title="..."` attribute. Now escapes quotes.
- **savePerson crew-write permission gap (MED).** The crew-record write ran unconditionally
  (only the UI was gated). Now requires admin / `admin_crew` / self-profile. (Server RLS also
  gates `ts_crew`; this is the matching client guard.)

### Rezdy / operations
- **Cancelled bookings created phantom pickups (HIGH).** `_rzPickups` had no cancelled
  filter (unlike every other consumer) — drivers could be sent to collect cancelled
  customers and van load was over-counted. Added the standard `/cancel/i.test(b.status)`
  guard.
- **Fuel/cargo changes didn't refresh the W&B readout (MED).** `rezdyManFuel` and
  `rezdyManCargo` saved but never re-rendered, so the seatmap TOW/CoG chip showed stale
  numbers after a fuel/cargo edit. Both now `safeRender()`.

### Maintenance notifications
- **"Cancelled" notice could never fire after a Confirm (MED/HIGH).** The `confirmed` branch
  sent a notification but never set `_announced`, so a booking that was confirmed (without a
  separate date-edit) then deleted sent no cancellation notice. Confirm now sets `_announced`.

### Sync robustness
- **One bad `endorsements` row poisoned the whole crew load (MED).** `JSON.parse` of a
  single malformed crew `endorsements` value rejected the entire `ts_crew` map (initial load
  and realtime reload), silently freezing every device's crew list. Per-row parse now
  try/caught (both `loadAll` and `reloadTable`).

### Build
- **build.py hardening.** Added (a) a per-module presence check with a clear error, and
  (b) a top-level (column-0) duplicate-declaration scan across the single shared scope —
  const/let/class duplicates are flagged as runtime-error risks, function/var as shadowing.
  Warning-only so it can't false-positive a deploy. **Current bundle: zero collisions.**

---

## 2. SECURITY POSTURE — A1 UPDATED (was the standing "top risk")

The previous reviews and CLAUDE.md said "RLS disabled, client-side auth." **That is stale.**
In the current code:

- `AUTH_PHASE_A=true` and `AUTH_PHASE_C=true` (shared.js). Login goes through Supabase
  Auth/GoTrue (`_sbSignIn`, grant_type=password); REST + realtime carry the user JWT;
  password verification is server-side (`verify-login` edge function, service role) — hashes
  never reach the browser. Legacy users migrate to bcrypt on first login.
- RLS + per-role policies exist in the repo migrations (`auth_stage2_apply.sql`,
  `auth_settings_harden.sql`, `auth_phaseC_policies.sql`, `auth_settings_roleperms_guard.sql`,
  …): anon denied, reads require `authenticated`, writes gated by `public.has_perm(<perm>)`
  mirroring the client grid; `role_perms` self-escalation is blocked by a restrictive policy;
  `profiles.role` has no UPDATE policy.

**Action for Andrew:** confirm those migrations are actually applied in the live Supabase
project (the code/flags are on; the DB policies are the other half). If applied, A1 is
largely closed and should be downgraded from "top risk." Residual notes:
- Server gating is by PERMISSION, not OWNERSHIP — any `operations` user (incl. desk/pilot)
  can delete any loadsheet/manifest. Add row-ownership policies if that matters.
- No CSP. A strict CSP is **incompatible** with this app's pervasive inline `onclick`/style
  without a refactor, so it's not a quick win — the XSS fixes above (escaping at the sinks)
  are the right mitigation for now.
- Legacy `verify-login` hashing is unsalted SHA-256 (transitional; superseded by GoTrue).

---

## 3. BACKLOG (not fixed this pass — needs runtime testing / a decision)

### Realtime sync gaps (HIGH — "edits don't show on the other iPad")
- **A2 — Pickups / check-ins / booking-allocation have NO live-sync.** `pickupSave` upserts
  `ts_pickup_lists` but never broadcasts, and that table isn't in the realtime subscription.
  Two devices on the same day don't see each other's check-ins/allocations until a manual
  reload; whole-blob last-write-wins can drop a check-in. *Fix:* add a `pickup_update`
  broadcast + receiver (mirror `rz_manifest_update`), guarded by date.
- **A3 — Roster / roster_colors have no live propagation.** Saved to `ts_settings` but the
  keys aren't in the realtime reload `in.(…)` list, so a roster edit is invisible to other
  devices until a full reload (and the roster drives leave counts + pilot availability).
  *Fix:* add `roster`/`roster_colors` to the reload list with the `_rosterUnsaved`/perms-style
  draft guard, or a dedicated `roster_update` broadcast.
- **A4 — Reconnect backfill incomplete.** On websocket re-open only `ts_manifests` +
  `ts_loadsheets` reload; the Rezdy manifest, shared lstabs, roster, `ts_settings`, and
  pickups can stay silently stale after a brief drop. *Fix:* extend the backfill to re-pull
  current-date Rezdy state + `reloadTable('ts_settings')`.
- `aircraft_obs` (maintenance observations) is also persisted-but-not-live-synced (lower
  traffic) — same class as A3.

### Leave-day counts (HIGH — operator-trust path)
- **L-A — `total_days` frozen at submit.** Stored once and only refreshed on an explicit
  edit; if the roster gains/loses an RDO inside the window afterward, the headline number and
  the live "RDO excl" parenthetical can disagree. *Fix:* compute `total_days` live in the
  card/approvals view from `_lvWorkingDays`, or recompute+persist on approve.
- **L-B — Preview computed before the roster loads.** On the My-Leave tab the roster load is
  fire-and-forget while the form preview runs synchronously; an empty `S.roster` makes every
  day count as working, so the previewed number can differ from what's stored. *Fix:* gate the
  preview behind a roster-loaded flag.
- **L-C — Shared crew-code keying can cross-contaminate** roster + leave counts when two crew
  share a code (or initials fallback collides). *Fix:* prefer id-only keying for new writes.

### Rezdy seat allocation (MED)
- **R-A — Dead overflow guard.** In `rezdyManCreateLoadsheet` the fallback seat-advance loop
  tests `seatOf['__'+nextFree]`, a key that never exists (`seatOf` is keyed pax-id→index), so
  only `form.names[nextFree]` is checked. When the manifest seat map is incomplete a pax can
  silently overwrite a seat a later pax owns. *Fix:* drive the fallback off a real occupancy
  set and mark seats used as they're filled.
- **R-B — Split-destination same-time push** can leave the second destination's pax on an
  unfocused tab after a Bookings→Seatmap push (time-only vs TIME·DEST key). *Fix:* surface
  multiple destination groups after a push.
- A single `_rzDepTimePart(dep)` normaliser would de-risk the recurring time-only vs
  TIME·DEST composite-key handling (several `.split('·')[0]` / `.split('+')` sites).

### Roster save-guard leaks (MED)
- Build-Pattern↔Roster tab switch and the pay-week toggle bypass `_navAway`; pattern "push"
  writes `S.roster` while a draft sits in `S._rosterDraft`, so the draft can re-win on save.
  *Fix:* route those through the guard / flush the draft before applying a pattern.

### Notifications (MED)
- Leave-submit notifies a hardcoded role list while approval is permission-gated — a user
  granted `leave_approve` outside those roles never gets notified (and vice-versa). *Fix:*
  build recipients from effective `leave_approve` holders.
- Maintenance date-edit notifications have no dedup window (repeated edits spam recipients).

### Consistency / low
- UTC-vs-local date basis is mixed (`toISOString().slice(0,10)` vs the local `_rIso`) in
  maintenance + leave bucketing — occasional off-by-one near midnight NZ. Standardize on a
  local-date helper.
- `calcAcScore` (auto-seat optimiser) resolves setup by `acId` only, not `_seatmapKey||acId`
  — inconsistent with the documented W&B contract (not safety-critical: optimiser only).
- Print "Flt burn" line prints a display value + unit but no kg cross-check; consider showing
  the kg figure too so the printed sheet is self-consistent.

---

## 4. Verified-correct (checked, no action)
- W&B unit model: `toKg` (airvan litres×AVGAS / else lb×LB), `form.fuel` kg, `burnOff` display
  units via `burnToKg`, final reserve `toKg(29)` airvan / 68.05 kg caravan — all consistent
  between seatmap preview, W&B preview, loadsheet create, and route-edit re-default.
- Seat move/swap/delete move all 7 per-seat maps together (no TO-PAY/child orphaning) on the
  loadsheet editor paths.
- v24.03 unsigned-banner + dark-ink signature changes are internally consistent.
- Rezdy realtime broadcasts (`rz_manifest_update`/`rz_sched_update`/`rz_lstabs_update`) are
  echo-guarded (`self:false` + `_sessionId` + date) with no render-without-broadcast handler.
- `rz_fuel_ov` (new editable fuels table) save key / localStorage cache / realtime reload list
  / per-key handler all agree.
- `rezdySetDate` clears the full set of date-scoped maps — no cross-date bleed.
- Rezdy API key is server-only (edge function env); not in the public bundle.
