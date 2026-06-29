-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Supabase Storage bucket for in-app uploads (prestart photos, Ops Notice files)
-- Run in the Supabase SQL editor (as the postgres role, which the SQL editor uses).
-- After this, the app uploads real files to Storage and stores their public URL instead of base64.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) The bucket (public read so <img>/<a> work directly; files use random unguessable paths).
insert into storage.buckets (id, name, public)
values ('ts-uploads','ts-uploads', true)
on conflict (id) do update set public = excluded.public;

-- 2) Policies on storage.objects, scoped to this bucket.
drop policy if exists ts_uploads_read   on storage.objects;
create policy ts_uploads_read   on storage.objects for select to public        using (bucket_id = 'ts-uploads');

drop policy if exists ts_uploads_insert on storage.objects;
create policy ts_uploads_insert on storage.objects for insert to authenticated with check (bucket_id = 'ts-uploads');

drop policy if exists ts_uploads_update on storage.objects;
create policy ts_uploads_update on storage.objects for update to authenticated using (bucket_id = 'ts-uploads') with check (bucket_id = 'ts-uploads');

drop policy if exists ts_uploads_delete on storage.objects;
create policy ts_uploads_delete on storage.objects for delete to authenticated using (bucket_id = 'ts-uploads');

-- Done. (To make the bucket private later: set public=false and switch the app helper to signed URLs.)
