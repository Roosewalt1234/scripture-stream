-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users read own profile"  on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Subscriptions ────────────────────────────────────────────────────────────
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.profiles(id) on delete cascade,
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  plan                     text check (plan in ('free','monthly','annual','lifetime')) default 'free',
  status                   text check (status in ('active','canceled','past_due','trialing')) default 'active',
  current_period_end       timestamptz,
  created_at               timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "Users read own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- ─── Bookmarks ────────────────────────────────────────────────────────────────
create table public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  book       text not null,
  chapter    int  not null,
  verse      int,
  label      text,
  created_at timestamptz default now()
);
alter table public.bookmarks enable row level security;
create policy "Users manage own bookmarks" on public.bookmarks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Highlights ───────────────────────────────────────────────────────────────
create table public.highlights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  book       text not null,
  chapter    int  not null,
  verse      int  not null,
  color      text not null,
  created_at timestamptz default now()
);
alter table public.highlights enable row level security;
create policy "Users manage own highlights" on public.highlights
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Notes ────────────────────────────────────────────────────────────────────
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  book       text not null,
  chapter    int  not null,
  verse      int  not null,
  content    text not null,
  updated_at timestamptz default now()
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Reading Progress ─────────────────────────────────────────────────────────
create table public.reading_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  book         text not null,
  chapter      int  not null,
  completed_at timestamptz default now(),
  unique(user_id, book, chapter)
);
alter table public.reading_progress enable row level security;
create policy "Users manage own progress" on public.reading_progress
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Preferences ──────────────────────────────────────────────────────────────
create table public.preferences (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  theme       text  default 'light',
  font_size   int   default 18,
  font_family text  default 'serif',
  line_height float default 1.7,
  updated_at  timestamptz default now()
);
alter table public.preferences enable row level security;
create policy "Users manage own preferences" on public.preferences
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── AI Usage (rate limiting) ─────────────────────────────────────────────────
create table public.ai_usage (
  user_id           uuid  references public.profiles(id) on delete cascade,
  date              date  default current_date,
  explanation_count int   default 0,
  context_count     int   default 0,
  image_count       int   default 0,
  primary key (user_id, date)
);
alter table public.ai_usage enable row level security;
create policy "Users read own ai_usage" on public.ai_usage for select using (auth.uid() = user_id);
-- INSERT/UPDATE done by service_role only (API routes)

-- ─── Chat Sessions (Study Assistant) ─────────────────────────────────────────
create table public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  book       text,
  chapter    int,
  created_at timestamptz default now()
);
alter table public.chat_sessions enable row level security;
create policy "Users manage own chat_sessions" on public.chat_sessions
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade,
  role       text check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz default now()
);
alter table public.chat_messages enable row level security;
create policy "Users read own chat_messages" on public.chat_messages for select
  using (exists (select 1 from public.chat_sessions where id = session_id and user_id = auth.uid()));
create policy "Users insert own chat_messages" on public.chat_messages for insert
  with check (exists (select 1 from public.chat_sessions where id = session_id and user_id = auth.uid()));

-- ─── Morning Cards ────────────────────────────────────────────────────────────
create table public.morning_cards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  book            text not null,
  chapter         int  not null,
  verse           int  not null,
  image_url       text,
  devotional_text text,
  created_at      timestamptz default now()
);
alter table public.morning_cards enable row level security;
create policy "Users manage own morning_cards" on public.morning_cards
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── SOAP Journal ─────────────────────────────────────────────────────────────
create table public.soap_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  book        text not null,
  chapter     int  not null,
  verse       int,
  scripture   text not null,
  observation text,
  application text,
  prayer      text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.soap_entries enable row level security;
create policy "Users manage own soap_entries" on public.soap_entries
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Scripture Memory ─────────────────────────────────────────────────────────
create table public.memory_verses (
  id            uuid  primary key default gen_random_uuid(),
  user_id       uuid  references public.profiles(id) on delete cascade,
  book          text  not null,
  chapter       int   not null,
  verse         int   not null,
  verse_text    text  not null,
  translation   text  not null,
  ease_factor   float default 2.5,
  interval_days int   default 1,
  next_review   date  default current_date,
  total_reviews int   default 0,
  created_at    timestamptz default now()
);
alter table public.memory_verses enable row level security;
create policy "Users manage own memory_verses" on public.memory_verses
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Reading Plans ────────────────────────────────────────────────────────────
create table public.reading_plans (
  id            uuid    primary key default gen_random_uuid(),
  title         text    not null,
  description   text,
  duration_days int     not null,
  is_premium    boolean default false,
  created_by    uuid    references public.profiles(id)
);
alter table public.reading_plans enable row level security;
create policy "Anyone reads plans" on public.reading_plans for select using (true);

create table public.plan_days (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid references public.reading_plans(id) on delete cascade,
  day_number    int  not null,
  book          text not null,
  chapter_start int  not null,
  chapter_end   int  not null
);
alter table public.plan_days enable row level security;
create policy "Anyone reads plan_days" on public.plan_days for select using (true);

create table public.user_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  plan_id      uuid references public.reading_plans(id),
  started_at   timestamptz default now(),
  current_day  int  default 1,
  completed_at timestamptz
);
alter table public.user_plans enable row level security;
create policy "Users manage own user_plans" on public.user_plans
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
