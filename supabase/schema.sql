-- =====================================================================
-- Allreminde – Datenbank einrichten
-- In Supabase: links "SQL Editor" → "New query" → alles einfügen → "Run"
-- =====================================================================

-- Deine Daten (aufgeteilt in mehrere Stücke, jedes als Text)
create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  id         text not null,
  json       text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Nur du darfst deine eigenen Daten sehen und ändern
alter table public.docs enable row level security;
drop policy if exists "eigene Daten lesen" on public.docs;
drop policy if exists "eigene Daten anlegen" on public.docs;
drop policy if exists "eigene Daten ändern" on public.docs;
drop policy if exists "eigene Daten löschen" on public.docs;
create policy "eigene Daten lesen"   on public.docs for select using (auth.uid() = user_id);
create policy "eigene Daten anlegen" on public.docs for insert with check (auth.uid() = user_id);
create policy "eigene Daten ändern"  on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Daten löschen" on public.docs for delete using (auth.uid() = user_id);

-- Änderungen sofort an andere Geräte melden
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- Speicher für Fotos und Belege (privat)
insert into storage.buckets (id, name, public) values ('files', 'files', false) on conflict (id) do nothing;
drop policy if exists "eigene Dateien lesen" on storage.objects;
drop policy if exists "eigene Dateien hochladen" on storage.objects;
drop policy if exists "eigene Dateien löschen" on storage.objects;
create policy "eigene Dateien lesen"     on storage.objects for select using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien hochladen" on storage.objects for insert with check (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Dateien löschen"   on storage.objects for delete using (bucket_id = 'files' and (storage.foldername(name))[1] = auth.uid()::text);
