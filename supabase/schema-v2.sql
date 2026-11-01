-- =====================================================================
-- Allreminde – Erweiterung: Profile, Freunde, Gruppen, Chat
-- In Supabase: SQL Editor → New query → alles einfügen → Run
-- (Kann gefahrlos mehrfach ausgeführt werden.)
-- =====================================================================

-- ---------- Profile (öffentlich für angemeldete Nutzer: Name, Benutzername, Foto) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique not null check (username ~ '^[a-z0-9_.]{3,20}$'),
  display_name text not null default '',
  avatar_path  text,
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profile lesen" on public.profiles;
drop policy if exists "profile anlegen" on public.profiles;
drop policy if exists "profile ändern" on public.profiles;
create policy "profile lesen"   on public.profiles for select to authenticated using (true);
create policy "profile anlegen" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile ändern"  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Freundschaften (Anfrage → angenommen) ----------
create table if not exists public.friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;
drop policy if exists "freundschaft lesen" on public.friendships;
drop policy if exists "freundschaft anfragen" on public.friendships;
drop policy if exists "freundschaft annehmen" on public.friendships;
drop policy if exists "freundschaft löschen" on public.friendships;
create policy "freundschaft lesen"    on public.friendships for select using (auth.uid() in (requester, addressee));
create policy "freundschaft anfragen" on public.friendships for insert with check (requester = auth.uid() and status = 'pending');
create policy "freundschaft annehmen" on public.friendships for update using (addressee = auth.uid()) with check (status = 'accepted');
create policy "freundschaft löschen"  on public.friendships for delete using (auth.uid() in (requester, addressee));

create or replace function public.is_friend(a uuid, b uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from friendships where status = 'accepted'
                 and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

-- ---------- Gruppen (gemeinsame Bereiche) ----------
create table if not exists public.spaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null default 'group',
  color      text not null default 'blau',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  role     text not null default 'member' check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create or replace function public.is_member(s uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from space_members where space_id = s and user_id = auth.uid());
$$;
create or replace function public.is_space_owner(s uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from space_members where space_id = s and user_id = auth.uid() and role = 'owner');
$$;
create or replace function public.created_space(s uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from spaces where id = s and created_by = auth.uid());
$$;

alter table public.spaces enable row level security;
drop policy if exists "gruppe lesen" on public.spaces;
drop policy if exists "gruppe anlegen" on public.spaces;
drop policy if exists "gruppe ändern" on public.spaces;
drop policy if exists "gruppe löschen" on public.spaces;
create policy "gruppe lesen"   on public.spaces for select using (is_member(id) or created_by = auth.uid());
create policy "gruppe anlegen" on public.spaces for insert with check (created_by = auth.uid());
create policy "gruppe ändern"  on public.spaces for update using (is_space_owner(id));
create policy "gruppe löschen" on public.spaces for delete using (is_space_owner(id));

alter table public.space_members enable row level security;
drop policy if exists "mitglieder lesen" on public.space_members;
drop policy if exists "mitglied hinzufügen" on public.space_members;
drop policy if exists "mitglied entfernen" on public.space_members;
create policy "mitglieder lesen" on public.space_members for select using (is_member(space_id));
-- Ersteller trägt sich selbst als Besitzer ein; Besitzer fügen Freunde als Mitglieder hinzu
create policy "mitglied hinzufügen" on public.space_members for insert with check (
  (user_id = auth.uid() and role = 'owner' and created_space(space_id))
  or (role = 'member' and is_space_owner(space_id) and is_friend(auth.uid(), user_id)));
-- Austreten (selbst) oder entfernen (Besitzer)
create policy "mitglied entfernen" on public.space_members for delete using (user_id = auth.uid() or is_space_owner(space_id));

-- ---------- Gemeinsame Termine, Aufgaben, Listen und Listeneinträge ----------
create table if not exists public.space_items (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  parent_id   uuid references public.space_items(id) on delete cascade,
  kind        text not null check (kind in ('task', 'list', 'entry')),
  title       text not null,
  note        text not null default '',
  date        date,
  time        text,
  done        boolean not null default false,
  done_by     uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  remind      text not null default 'all' check (remind in ('all', 'assigned', 'none')),
  reminders   int[] not null default '{1,0}',
  sort        double precision not null default 0,
  created_by  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists space_items_space on public.space_items (space_id);
alter table public.space_items enable row level security;
drop policy if exists "einträge der gruppe" on public.space_items;
create policy "einträge der gruppe" on public.space_items for all using (is_member(space_id)) with check (is_member(space_id));

-- ---------- Nachrichten (Einzel-Chat oder Gruppen-Chat) ----------
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  space_id   uuid references public.spaces(id) on delete cascade,
  to_user    uuid references public.profiles(id) on delete cascade,
  from_user  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  check ((space_id is null) <> (to_user is null))
);
create index if not exists messages_space on public.messages (space_id, created_at);
create index if not exists messages_direct on public.messages (from_user, to_user, created_at);
alter table public.messages enable row level security;
drop policy if exists "nachrichten lesen" on public.messages;
drop policy if exists "nachricht senden" on public.messages;
drop policy if exists "nachricht löschen" on public.messages;
create policy "nachrichten lesen" on public.messages for select using (
  (space_id is not null and is_member(space_id)) or (space_id is null and auth.uid() in (from_user, to_user)));
create policy "nachricht senden" on public.messages for insert with check (
  from_user = auth.uid() and ((space_id is not null and is_member(space_id)) or (to_user is not null and is_friend(auth.uid(), to_user))));
create policy "nachricht löschen" on public.messages for delete using (from_user = auth.uid());

-- ---------- Änderungen sofort an alle Geräte melden ----------
do $$
declare t text;
begin
  foreach t in array array['friendships', 'spaces', 'space_members', 'space_items', 'messages'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- Profilfotos (für Freunde sichtbar) ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
drop policy if exists "eigenes profilfoto hochladen" on storage.objects;
drop policy if exists "eigenes profilfoto ändern" on storage.objects;
drop policy if exists "eigenes profilfoto löschen" on storage.objects;
create policy "eigenes profilfoto hochladen" on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigenes profilfoto ändern"    on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigenes profilfoto löschen"   on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
