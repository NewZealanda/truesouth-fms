-- TrueSouth FMS — RUN THIS ONCE FIRST, before loading the leg-split parts.
-- Removes the previous import (single-trip rows AND any earlier leg rows) so re-loading is clean.
-- Does NOT touch app-made flight cards (their ids don't start with fr_imp_).
delete from ts_flight_records where id like 'fr_imp_%';
