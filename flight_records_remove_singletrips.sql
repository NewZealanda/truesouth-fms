-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Remove the OLD whole-trip import rows (keep the leg-split rows)
-- The leg-split parts were loaded without first running the RESET, so each trip
-- exists twice: the old single-trip row (id 'fr_imp_<n>') AND the new legs
-- ('fr_imp_<n>_L1', '_L2'). This removes the single-trip duplicates only.
-- ═══════════════════════════════════════════════════════════════════════════

-- STEP 1 — counts (old_single_trip = rows to delete; leg_records = keepers)
select
  count(*) filter (where id ~ '^fr_imp_[0-9]+$')  as old_single_trip,
  count(*) filter (where id ~ '_L[0-9]+$')         as leg_records
from ts_flight_records where id like 'fr_imp_%';

-- STEP 2 — delete the old whole-trip rows (no _L suffix). Keeps all leg rows.
-- delete from ts_flight_records where id ~ '^fr_imp_[0-9]+$';
