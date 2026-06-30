-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — remove saved + binned manifests (v28.59)
-- Saved manifests are retired (Operations is the Rezdy seatmap/loadsheet flow).
-- The UI for saving/viewing them is gone; this clears the lingering rows.
--
-- IMPORTANT: preserves the `live_draft` row and any `ls_live_*` rows — those power
-- live dispatch / collaborative sync and are NOT saved manifests.
--
-- Run in the Supabase SQL editor. Review the SELECT first if you want to see what
-- will be removed.
-- ═══════════════════════════════════════════════════════════════════════════

-- Preview what will be deleted (optional):
-- select id, name, saved_at from public.ts_manifests
-- where id <> 'live_draft' and id not like 'ls_live_%';

delete from public.ts_manifests
where id <> 'live_draft'
  and id not like 'ls_live_%';

-- Verify only live/collaborative rows remain:
select id from public.ts_manifests order by id;

-- Done.
