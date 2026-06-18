# TrueSouth FMS — Architecture & Bug Audit (v23.04)

Full read of all modules (~12k lines) by four parallel reviews. This supersedes the
v22.87 review. Findings are grouped: **Fixed in v23.04**, then **Deferred** (needs a
decision or a larger/riskier change) by severity, then **Architecture notes**.

The dominant theme: **`sbU()` returns `null` on failure instead of throwing**, and many
callers either ignore the result or `try/catch` expecting an exception — so failed/denied
saves are reported as success and silently lose data. Now that RLS enforces per-role
writes (Stage 2), this class of bug is more likely to bite (a denied write returns null,
not an exception).

---

## Fixed in v23.04

1. **Roster save could lose edits silently** (`roster.js` saveRosterToCloud). It cleared
   the draft + undo stack *before* the cloud write and only caught exceptions — an
   RLS/HTTP failure returned null and was toasted as "Roster saved!" with the draft gone.
   Now: write first, only clear draft/undo on a confirmed write, and toast a real failure
   (changes kept locally).
2. **Aircraft W&B setup save silently failing** (`admin.js` saveAircraftDraft). The
   `sbU('ts_aircraft')` result was ignored; a failed write left stale empty-weight/arm/CofG
   on the server feeding loadsheet W&B while showing "✓ synced". Now surfaces a failure.
3. **Charter rates save silently failing** (`admin.js` saveCharterRates) — same pattern,
   now checked.
4. **Charter quote GST was computed at 10%** (`charter.js`). Showed `total/11` (a 10%
   GST-inclusive formula) while ex-GST used 15%; the two didn't reconcile. Fixed to the
   NZ-correct `total − total/1.15`.
5. **Rezdy: editing a pickup location wiped the hand-tuned van plan** (`rezdy.js`
   pickupSetLocation). It nulled `_pickupVans` then saved the empty array before the
   rebuild. Now reconciles placement in-place and preserves the arrangement.
6. **Rezdy: pickup ids weren't unique per line-item** (`rezdy.js`) — two same-product /
   same-time items in one order collided (shared location override / collected flag). Now
   includes the item index.
7. **Unknown CoG showed a reassuring green pill** (`manifest.js` cogPillClass). A missing
   CoG or a misconfigured aircraft (no cogMax) returned `pill-green`. Now neutral
   (`pill-blue`) — "unknown" no longer reads as "in limits" on a safety screen.
8. **Token-refresh resilience extended to `sbPatch`** (`shared.js`) — it bypassed the
   `_sbFetch` 401-refresh-retry wrapper (added in v23.03), so PATCH writes still failed on
   an expired token. Now routed through it.
9. **Targeted stored-XSS escaping**: added a shared `esc()` helper and applied it to the
   clearest user free-text vectors — charter quote name / author / leg notes, and the
   roster "Other" note (rendered raw into innerHTML and `title=` attributes).

(These build on v23.03: the JWT-expiry refresh-retry across all REST helpers, the
maintenance "save failed" toast, and toast positioning clearing the iPhone notch/nav bar.)

---

## Also fixed in the v23.05 / v23.06 cleanup pass

- **Half-day leave removed entirely** (unused) — form state, day-count math, display
  badges, submit payload and edit path all stripped.
- **Leave day-count now awaits the roster load** before counting, so `total_days` isn't
  over-counted when the roster hadn't loaded yet.
- **Concurrent-edit manifest deletion** — `mergeDispatch` now protects a pax added in the
  last 15s (closes the realistic data-loss window).
- **Signed loadsheet W&B no longer mutates on render** (PIC seat weight); **live loadsheet
  form no longer clobbered while mid-edit**.
- **Silent failures surfaced**: leave loaders set `[]` + toast (no more infinite
  "Loading…"); leave deletes / notification clear / `deletePerson` check the result and
  warn on failure.
- **`addOilEntry` now merges** into an existing oil row instead of replacing it.
- **Maintenance "Update Entry"** now exits edit mode after saving (was stuck).
- **Stored-XSS escaping** extended via `esc()`: passenger + group names (manifest), crew
  name/email (admin people list), maintenance comments, charter notes/name, roster note.
- **Realtime**: a stale socket can no longer start a duplicate heartbeat interval;
  `_sessionId` now uses `crypto.randomUUID()`.
- **Audit log + roster load** now go through the JWT-aware `_sbFetch` (attributed to the
  signed-in user, refresh-aware) instead of the hardcoded anon key / bare fetch.
- **Rezdy schedule** rejects end ≤ start.

## Also fixed in the v23.07 pass (remaining items)

- **Loadsheet seatmap badges** now read the form's per-seat `paxGroups`/`infantNames`
  (keyed by seat index) instead of matching by name — duplicate/blank names no longer
  mis-colour groups or drop infant flags.
- **Leave conflict visibility** — the request form now shows a roster-based "already off
  then" heads-up to the submitter (the approver already saw full approved+pending+roster
  conflicts at approval).
- **Charter quote** save/rename/delete now surface a failure toast instead of swallowing.
- **`_jwtClaims`** uses a proper base64url→TextDecoder decode (handles UTF-8, padding;
  no deprecated `escape()`), so a malformed token fails cleanly instead of logging a blank
  desk user.
- **Session-expired warning** — when the refresh token itself is gone, a throttled
  "session expired — sign back in" toast appears instead of silent write-loss.
- **`savePerson`** validates a new login account's password before writing the crew record
  (no more half-saved person on a bad password).
- **Rezdy schedule** lays overlapping blocks side by side so neither is hidden.

## Still deferred — need your input / intentionally not changed

- **Maintenance cumulative cycle totals** (`_startTot`/`_landTot`) — never written by the
  app and only fall back to a prior *stored* value; computing them on the fly needs the
  correct formula (does the imported spreadsheet baseline already include logged starts?).
  Left untouched because a wrong lifetime cycle count could mislead maintenance scheduling.
- **Approved leave → roster auto-write** — not implemented (the conflict check already
  covers approvers; a non-approver submitter can't see others' requests under RLS anyway).
- **Boot `loadAll` empty-cache overwrite** — left as-is; guarding it touches the critical
  boot path and the trigger is rare now that reloads are token-refresh-aware.

## Original lower-priority list (mostly addressed above)

- Approved leave isn't written back to the roster (conflict-detection blind spot) — needs a
  design call on whether to write roster codes on approval or have conflict checks consult
  approved requests.
- `savePerson` writes the crew record before validating a new-user password (leaves a valid
  but unintended crew record; low impact).
- Maintenance cumulative `_startTot`/`_landTot` are computed via fallback scan (works) but
  never written; and the edit form doesn't prefill starts/landings/oil.
- `_jwtClaims` uses deprecated `escape()`; boot `loadAll` can cache empty results under RLS;
  charter quote saves still swallow failures; token-refresh failure has no visible "session
  expired" banner. (All low-frequency.)

## Deferred — High priority (need a decision or a larger change)

- **Concurrent-edit data loss on the shared live manifest** (`shared.js` mergeDispatch).
  Deletion is by *absence from the remote snapshot*: if device A adds a passenger (autosave
  debounced, not yet pushed) while device B makes any change that bumps `_updateTs`, B's
  broadcast deletes A's just-added passenger. Proper fix needs tombstones (explicit delete
  markers) rather than absence-based deletion. Risky to change without careful testing.
- **Active loadsheet form can be clobbered by a remote reload** (`shared.js` H2). Unlike
  role_perms (guarded) there's no "editing" guard for an open loadsheet; a remote
  `ts_loadsheets` change can replace `S.form` mid-edit and lose in-flight keystrokes on
  blur. Recommend the same `_editingPerms`-style guard for the active loadsheet tab, or
  field-level timestamp merge.
- **Loadsheet PIC weight is mutated during render and not synced** (`loadsheet.js` C2). On
  every render it force-writes `f.seats[0]` to the roster weight without `autoSaveLS()` and
  even for signed loadsheets — W&B can silently change on view and differ across devices.
  Recommend: compute PIC weight at calc time without mutating `f`, or only when editable +
  persist on change.
- **Loadsheet seatmap badges matched by name, not seat index** (`manifest.js` C3,
  renderCabinSVG form branch). Infant/child/group are looked up via `d.pax.find(p=>p.name===nm)`
  instead of the form's own `paxGroups[i]`/`infantNames[i]` maps — duplicate/blank names
  show wrong group colours / missing infant flags. Fix: read the per-seat maps directly.
- **Maintenance "Update Entry" doesn't actually update** (`admin.js`/`maintenance.js` C1).
  `addMaintEntry` ignores `S.maintEditDate`, never clears it, and only prefills TTIS — so
  editing a day can't correct starts/landings/oil and leaves the form stuck in edit mode.
- **Maintenance cumulative start/landing totals are never written** (`maintenance.js` C2).
  Reads `_startTot`/`_landTot` but no handler writes them; the lifetime cycle tooltips are
  always empty. Decide: compute on the fly, or write on save.
- **Leave half-day cannot be requested** (`leave.js` H1). The day-count math honours a
  `partialDay` flag but there is **no UI control** to set it — the feature is dead.
- **Leave day-count uses an unloaded/stale roster** (`leave.js` H2). On submit the roster
  fetch isn't awaited; if the user submits before it resolves, `S.roster={}` and every day
  counts as working (RDO not excluded), persisting an over-counted `total_days`.
- **Approved leave isn't written to the roster** (`leave.js` H4) — conflict detection has a
  blind spot: two people can be approved off the same day without the overlap warning.
- **Audit log + a couple of reads use the hardcoded anon key**, bypassing the user JWT and
  `_sbFetch` (`shell.js` auditLog, `shared.js` restoreWorkspace/recover). Audit rows are
  attributed to anon and a mid-session refresh isn't picked up for those reads. Route
  authenticated calls through `_sbFetch`+`SH`; reserve `SK` for pre-login endpoints only.
- **Token-refresh failure doesn't log out or warn** (`shared.js` C3). If the refresh token
  is truly expired/revoked, writes fail forever silently. Recommend a "session expired —
  please sign in" state when refresh fails with an auth error.

## Deferred — Medium

- `deletePerson` ignores `sbDel` results (silent cross-device delete failure).
- Legacy `requestReset`/`applyReset` ignore `sbUserWrite` results (only reachable when
  AUTH_PHASE_A is false).
- `savePerson` writes the crew record before validating password presence/match, so a
  mistyped new-user password leaves an orphaned partial crew record.
- `addOilEntry` replaces the whole oil row, dropping per-aircraft oil entered via the daily
  form for blank columns.
- Roster cells keyed by both `uid` and crew-code (`ini`); shared codes cross-contaminate
  (dup-code warning mitigates but root cause is the keying).
- Silent-swallow on several loaders (`loadRosterFromCloud`, `loadAllLeave`, etc.) → infinite
  "Loading…" on a fetch failure; and `deleteAllLeave`/`deleteLeaveRequest`/`clearAllNotifications`
  toast success without checking `r.ok`.
- Broader stored-XSS: passenger/group names, user names/emails, maintenance comments, and
  toast messages are interpolated raw in several places. A full `esc()` sweep is
  recommended (do toasts carefully — some intentionally use HTML entities like `&mdash;`).
- Realtime: on a token refresh `initRealtime` can stack heartbeat intervals if a socket is
  mid-handshake; guard `onopen/onclose/onmessage` with `if(ws!==_rtWs)return;`.

## Deferred — Low

- `_sessionId` uses `Date.now()+Math.random().slice` — use `crypto.randomUUID()`.
- `_jwtClaims` uses deprecated `escape()`; can throw on non-Latin1 claims → blank desk user
  on restore. Use base64url→TextDecoder.
- Boot `loadAll` runs as anon under RLS and caches empty results; don't overwrite a
  non-empty cache with an empty server result.
- Rezdy schedule: no overlap validation (blocks can stack/obscure); `schedSaveBlock` doesn't
  validate end>start.
- Charter quote save/rename/delete overwrite the whole list (no merge) and swallow failures.
- Saved-loadsheet list runs a full W&B calc per card per render (perf); cache the OK flag at
  sign time.
- `toast()` type strings inconsistent (`'error'`/`'success'` vs `'err'`/`'ok'`) — verify the
  switch handles both.

---

## Architecture notes / recommendations

- **Adopt a single write convention.** Make every `sbU`/`sbDel`/`sbPatch`/`sbUserWrite`
  caller check the return and surface failures; consider a thin `saveOrToast()` wrapper so
  the "silent null" class can't recur. This is the single highest-leverage change.
- **Roster & maintenance live in `ts_settings` (key-based), not dedicated tables.** This is
  why they can't be cleanly gated by Stage 2 RLS and why their save paths are bespoke.
  Migrating them to real tables (`ts_roster`, `ts_maintenance`) would let RLS gate them by
  `roster_edit` / `maint_bookings` and simplify the code.
- **Live-sync model.** The manifest uses coarse `_updateTs` last-writer-wins with
  absence-based deletion (data-loss prone); the loadsheet has no in-edit guard. A small
  field-level merge + tombstones + an "actively editing" guard would close the main
  concurrent-edit gaps.
- **One escaping helper, used everywhere.** `esc()` now exists; standardise all dynamic
  innerHTML interpolation on it.
- **Session expiry UX.** Pair the v23.03 refresh-retry with a visible "reconnecting /
  session expired" state so a failed refresh can't silently drop writes.
