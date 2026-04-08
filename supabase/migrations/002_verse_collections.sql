-- ─── Verse Collections ────────────────────────────────────────────────────────
create table if not exists public.verse_collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  name        text not null,
  color       text not null default '#d97706',
  description text,
  created_at  timestamptz default now()
);
alter table public.verse_collections enable row level security;
create policy "users manage own collections" on public.verse_collections
  for all using (auth.uid() = user_id);

-- ─── Collection Verses ────────────────────────────────────────────────────────
create table if not exists public.collection_verses (
  id             uuid primary key default gen_random_uuid(),
  collection_id  uuid references public.verse_collections(id) on delete cascade not null,
  user_id        uuid references auth.users not null,
  verse_id       text not null,
  verse_text     text not null,
  reference      text not null,
  book           text not null,
  chapter        integer not null,
  verse_number   integer not null,
  translation    text not null,
  added_at       timestamptz default now()
);
alter table public.collection_verses enable row level security;
create policy "users manage own collection verses" on public.collection_verses
  for all using (auth.uid() = user_id);
