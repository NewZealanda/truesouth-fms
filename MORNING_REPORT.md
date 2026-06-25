# Morning report — overnight build (TrueSouth FMS)

Morning Andrew. Here's what got done while you slept.

## Built
- **Start of Day screen** (`modules/startday.js`, v26.74). One button runs the morning: pulls Rezdy, previews the seatmap at declared weights, allocates aircraft + pilots — then shows **only the exceptions** that need you: no-aircraft bookings, over-capacity, W&B/CofG/landing/reserve fails, split groups, missing/unrated pilots, transport with no driver, balances owing. Every row taps through to the page that fixes it. Validated read-only on real bookings — no false positives.
- **Today (at-a-glance) homescreen** (v26.75). New landing dashboard: greeting, an attention banner that opens Start of Day, headline counts, a **departures board** (time · aircraft · destination · pax · pilot), transport + money-owing summary, and quick links. It's now the **default landing** for operations users; both pinned to the top of the drawer.

## Swept + fixed (v26.76)
Three parallel audits across the whole app. Real fixes applied:
- **2 XSS holes closed** — passenger/infant names in the loadsheet seat pills, and user names in the presence bar, were going into the page unescaped. Now escaped.
- **2 sync bugs** — dragging a seated passenger back to "unallocated" and the loadsheet "Clear & Start Blank" button weren't saving/broadcasting, so changes silently reverted on refresh or didn't reach other devices. Both now persist.
- **1 UX hang guarded** — the Start-of-Day button now always releases even if a step errors.
- **2 defensive guards** in the scheduling allocator + a W&B guard on the new screen.
- **Verified clean:** the per-seat field maps (the recurring TO-PAY/child-left-behind class) move together everywhere; no date/UTC bugs; no name collisions.

Full detail + the open backlog: `ARCHITECTURE_REVIEW_v26.76.md`.

## Nightly automation
Set up a recurring task **`nightly-fms-sweep`** (fires ~00:04 daily): full-app bug sweep + architecture audit + testing, fixes safe quirks, writes a review doc, and leaves a morning report — exactly this, every night, for the whole app (your two new screens excluded from redesign). It runs while the app is open; if the app's closed at midnight it runs on next launch. Tip: hit **Run now** once in the Scheduled panel to pre-approve its tools so future runs don't pause on prompts.

## Lines of code
- **22,620 lines** of hand-written module source (`modules/*.js` + `*.html`), which builds into a single **22,590-line** `index.html`.
- **24,920 lines** including the build script and SQL migrations.

## ⚠️ One thing needs you: a stuck git lock
A stale `.git/HEAD.lock` (0 bytes, from 11:42) appeared mid-session and blocked commits. Per your standing rule I did **not** delete it. So **everything from v26.75 onward is built and saved in the working tree but not committed** (v26.74 and earlier did commit). Once you clear the lock, one commit captures it all:

```
rm -f .git/HEAD.lock          # you do this — I won't touch locks
cd ~/Documents/truesouth-fms
GIT_INDEX_FILE=/tmp/tsidx git read-tree HEAD \
  && GIT_INDEX_FILE=/tmp/tsidx git add -A \
  && GIT_INDEX_FILE=/tmp/tsidx git commit -m "v26.76: Today homescreen + Start-of-Day screen + sweep fixes (XSS escaping, loadsheet sync, sodRun finally, scheduling guards)"
```

Then review the diff and deploy as usual. Nothing's lost — it's all on disk and the build is current (`index.html` is v26.76, syntax-checked, 0 errors).
