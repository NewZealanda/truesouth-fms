# HANDOFF — session of 2 Jul 2026 (Fable → Opus)

Read `CLAUDE.md` first (standing rules + per-version changelog — it is fully up to date through
v29.40). This file is the quick orientation for picking the work up.

## Where things stand

- **Branch: `main`**, HEAD = `cec6e78` (v29.40). Andrew pushes via GitHub Desktop himself.
  Earlier this session v29.28–v29.30 were committed on `test` and merged/pushed to main by Andrew;
  v29.31–v29.40 were committed straight on `main` (his call — he wanted main that day).
  **`test` is behind main** — sync it whenever convenient.
- Working tree may show PHANTOM changes in git status: this VM can't write `.git/index`, so all
  commits go through the temp-index trick (`GIT_INDEX_FILE=/tmp/... git read-tree HEAD && add -A
  && commit`). After committing, the real index is stale → run `git reset` (needs locks clear) or
  have Andrew do it. **NEVER "discard" the phantom changes in GitHub Desktop** — with a stale
  index a discard DELETES files (it happened once this session; everything was restored from
  HEAD + context, no loss).
- **Git locks:** this VM can create files in `.git` but cannot delete them, so every commit
  leaves a stale `.git/HEAD.lock` (sometimes `index.lock` / `refs/heads/<branch>.lock`). Standing
  rule: NEVER delete locks yourself — tell Andrew, he clears them (he's quick about it).

## What was built this session (v29.28 → v29.40)

**Booking platform (Phase 1 foundations — see PLATFORM_ROADMAP.md, the authoritative doc):**
- v29.28: `ts_products` catalog (`products.sql`) + editor at Settings ▸ Operations ▸ 🛍 Products;
  `platform-book` edge fn (catalog/availability/hold/release/book, service role, pay-later);
  public `book.html` (wx.html pattern, not linked anywhere). Realtime-subscribed.
- v29.29: **Seasonal pricing by FLIGHT date** — `next_from` + `next_price_*` columns; resolver
  seam: `platformPriceFor` (app) / `priceFor` (edge fn) / `tierFor` (book.html). Price loads from
  the marketing sheet: `products_prices_2025-26.sql` (current) + `products_prices_2026-27.sql`
  (adds columns + 1-Oct-2026 prices; both applied by Andrew). 30 Sep books at current price,
  1 Oct at next-season price, no changeover step.
- v29.31: **Summer/winter departure timetables** — `times_winter` col (`products_winter_times.sql`)
  + global recurring winter window (ts_settings `platform_cfg`, default 05-01..09-30, editable atop
  the Products editor). Availability returns `productTimes` resolved per date; book validates
  against the date-resolved set.
- `products_times_from_history.sql` — auto-fills each product's ☀/❄ timetables from 13 months of
  Rezdy booking history (3+ distinct dates threshold). Andrew has run it.
- **⚠ DESIGN CONSTRAINT (Andrew, explicit):** future goal is DYNAMIC/LIVE pricing (floats with
  availability). ALL pricing must stay funnelled through the per-(product, flight-date) resolver
  seam above — never hardcode a price, never trust a client-computed price at booking time.
  Documented in PLATFORM_ROADMAP.md.
- Deployment state: `platform-book` deployed via dashboard (JWT verify OFF) and re-deployed after
  v29.31; `rezdy-sync` + `rezdy-webhook` re-deployed for v29.30 (internalNotes). All product SQL
  applied. Products seeded + priced; all `active=false` (book.html shows "not available" —
  correct until go-live checklist in the roadmap is done, esp. the Rezdy-cap coexistence gap).

**Rezdy:**
- v29.30: Rezdy staff `internalNotes` synced into the canonical booking (both edge fns) + shown
  read-only ("🗒 Rezdy: …") above the desk's own 📝 note on the booking card.

**Roster (roster.js):**
- v29.32: Day | Week | Month view selector (week default, persisted `ts_roster_view`); view-aware
  prev/next, arrow keys, date-jump; pay-week toggle week-view only; mobile shows 2-letter initials.
- v29.34/35: iPhone polish — week view fits all 7 days (compact 44px cells, `_cmp` flag); day view
  = pinned 46px crew col + one full-width tappable status select per row (`_dayWide`).

**Records / stats:**
- v29.33: Records browser Breakdown gains 🛬 Landings-by-location (by record's `to`, filter-aware).
- v29.36: Records browse grid — Tab flows box-to-box (data-row/data-field focus restore, in-place
  computed-cell update instead of re-render, 🗑 tabindex=-1).
- v29.40: Booking stats ⚖ Declared-vs-Loadsheet weights panel (on-demand history fetch via
  `statLoadDeclared`, name+date match, no-declared-weight pax ignored).

**Calendar:**
- v29.37: scroll position survives day-stepping (clamped-scroll carry `S._winPendY` in shell.js).
- v29.38: no "Loading…" flash — `#rzCalBody` snapshot (`S._calSnap`) shown dimmed with a loading
  pill during the load, all three sub-views (`_rzCalLoadingHold`); movement grids got keepscroll.

**Maintenance:**
- v29.39: log notes now PER AIRCRAFT (`<ac>_comment` keys; legacy shared `comment` shown as
  fallback until a tail gets its own; clearing also deletes the legacy one).

**Products editor:** sticky header + always-visible horizontal scrollbar (65vh panel).

## Open / next steps

1. **Push `main`** (cec6e78) if not done; **sync `test`** from main.
2. Platform Phase 1 remainder: Windcave payments (seam ready: `createPaymentSession()` in
   platform-book + book.html already follows `payment.url`), Rezdy-cap availability guard in the
   edge fn (or only sell non-Rezdy slots), then link book.html. Roadmap has the checklist.
3. New product codes CCFPK/MFOHL/FOXFJ/MCFLB exist in the catalog but NOT in `_RZ_PROD_CFG`
   (rezdy.js) — add dest/fuel/burn before activating any of them for sale.
4. Marketing-sheet loose ends: THH/FJHH 2026-27 child price (sheet showed none → POA), STT/MCHS
   2026-27 TBC (kept current prices), "Mt Asp add on" not modelled (extras don't exist yet).
5. Carried backlog: see CLAUDE.md v28.90 entry (realtime gaps on ground/ops modules, no CSP,
   permission-not-ownership server gating, etc.).

## Verify workflow reminder (every change)
Edit `modules/*.js` → bump `APP_VER` (shared.js) → `python3 build.py` → node --check the 4 inline
script blocks of index.html (and book.html's if touched) → temp-index commit → tell Andrew about
any locks left behind. Do NOT push.
