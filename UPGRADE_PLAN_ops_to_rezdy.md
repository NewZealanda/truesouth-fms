# TrueSouth FMS — Operations Upgrade Plan
### Promote the Rezdy charter workflow to the primary Operations experience

**Goal.** Make the Rezdy‑driven flow the everyday Operations flow:

- **Bookings** replaces the legacy **Manifest** as the passenger source of truth.
- The **new Seatmap** replaces the legacy **Seatmap** for allocation + W&B.
- **Loadsheets** unify into **one shared, per‑date tab strip with the editor inline** (no second tab bar, no section‑jump).

Keep the proven W&B and signing engine untouched — we only change how the flow is *surfaced*.

---

## 1. Where we are today

Two parallel worlds, both already on the **same** W&B engine (`calcFormWB`, `assignSeats`, `acLayout`) and the **same** loadsheet editor / signing surface (`loadsheet.js`):

| | Legacy (drawer ▸ Operations) | New (drawer ▸ Rezdy ▸ Integration) |
|---|---|---|
| Pax source | Manifest (`manifest.js`, `S.dispatch`) | **Bookings** + check‑in (`rezdy.js`) |
| Allocation | Seatmap workspace (`S.smWS`) | **Seatmap** (`S._rzMan*`, per‑date, live‑synced) |
| Loadsheets | Editor + local tab strip (`S.lsTabs`) | **Shared per‑date open‑tabs registry** → opens the same editor |
| Also | Saved, Charter | Calendar, Pickups, My Pickups |
| Gating | ops permissions | `rezdy` perm (superadmin only) |

The confusion the user flagged: a loadsheet made from the new Seatmap **jumps** into the legacy editor, so you see **two** sets of tabs.

---

## 2. Guiding principles

1. **Reuse the engine.** No rewrite of W&B or signing — signed loadsheets stay byte‑identical.
2. **No big‑bang.** Phase it; keep legacy as a fallback until the new flow is proven in real use.
3. **One source of truth per concept:** pax = Bookings/check‑in · allocation = Seatmap · document = Loadsheet.
4. **Shared where it's a shared artifact** (seatmap, open‑loadsheet list), **per‑user where it's a personal view** (which date you're on, which tab you have open).

---

## 3. Decisions to lock (pivotal)

- **D1 — Legacy during transition:** keep the old Manifest/Seatmap available behind an *Operations ▸ Legacy* sub‑menu (recommended), or remove outright now?
- **D2 — Charter / ad‑hoc (non‑Rezdy) flights:** handle them in the new flow via **New booking** (manual) + **New blank loadsheet** (recommended), or keep the old Manifest specifically for charter?
- **D3 — Who gets the new Operations:** replace the superadmin‑only `rezdy` gate with per‑area permissions for pilots / desk / ground as appropriate.

---

## 4. Phased plan

### Phase 1 — Unify loadsheets *(low risk, highest value — do first)*
- Make the **Loadsheets** tab the single loadsheet surface: the shared per‑date **tab strip** (registry already built) with the existing editor rendered **inline below it**. No jump to a separate screen, no second tab bar.
- Bring into that editor: **draggable PIC pool**, the full **seatmap carry‑over** (mostly done), and the **fuel/route rules** —
  - Milford departure → default fuel **115 L** (airvan/GA8) · **613 lb** (caravan/C208).
  - ETD **1530** & departure ≠ Milford → prompt *"Flybacks? Yes prefills fuel and departure points"* → set **dep = NZMF (Milford)**, **dest = NZQN (Queenstown)**, prefill fuel.
- Leave legacy *Operations ▸ Loadsheets* working as a fallback.

### Phase 2 — Seatmap as the allocation surface
- Add the **"3 boxes that grow"** shared pax‑pool layout (start with 3 aircraft, +1 when the 3 are filled), per‑date shared (already live‑synced).
- Verify parity with any legacy‑seatmap features charter needs (duplicate aircraft, cargo zones — already present).

### Phase 3 — Nav promotion
- Restructure **Operations** to host the new flow: **Bookings · Seatmap · Loadsheets · Calendar · Pickups · My Pickups**.
- Move legacy **Manifest/Seatmap** under *Operations ▸ Legacy* (collapsed). Keep **Saved** and **Charter**.
- Fold the separate **Rezdy** drawer section into Operations — everything in one place.

### Phase 4 — Permissions + cutover
- Replace the superadmin‑only `rezdy` gate with a per‑area permission map (dry‑run per role first — we have the simulate‑all‑roles tooling).
- Run both in parallel for a set period; retire legacy Manifest/Seatmap once confident.

---

## 5. Risks & mitigations
- **Charter/ad‑hoc loadsheets** — confirm *New booking* + *blank loadsheet* cover every case before retiring legacy (keep legacy until verified).
- **Signing integrity** — editor unchanged; signed W&B unaffected.
- **Permissions** — dry‑run the new map per role before enforcing.
- **Live concurrency** — seatmap + loadsheet tabs already broadcast; add presence on the inline editor.

---

## 6. Suggested first commit
**Phase 1, step 1:** render the loadsheet editor **inline** under the shared Loadsheets strip (remove the section‑jump). Smallest change that kills the double‑tab confusion, and the foundation everything else hangs off.
