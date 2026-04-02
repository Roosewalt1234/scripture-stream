# Scripture Stream — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Scripture Stream from Vite/React to Next.js 15, add Supabase auth + database schema, move all Gemini calls server-side with free-tier rate limiting, and preserve every existing feature in the new stack.

**Architecture:** Next.js 15 App Router replaces Vite. Route groups: `(marketing)` for SSR landing/pricing, `(auth)` for sign-in/up, `(app)` for the protected reader. All Gemini API calls move to `/api/ai/*` route handlers — the key never touches the browser. Supabase `@supabase/ssr` manages cookies-based sessions. Free users stay on localStorage; paid users will get cloud sync in Plan 2.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), `@google/genai`, `jest`, `@testing-library/react`, Railway

---

## Scope Note — 4-Plan Series

- **Plan 1 (this):** Foundation — Next.js, Supabase schema + auth, ported reader, server-side AI
- **Plan 2:** Payments & Gating — Stripe, upgrade modal, feature matrix enforcement
- **Plan 3:** Core Paid AI Features — Study Assistant, Morning Card Studio, new AI endpoints
- **Plan 4:** Study Tools — SOAP, Scripture Memory, PDF Export, Analytics

---

## File Map

### Replace / Scaffold
- `package.json` — rewrite for Next.js 15
- `next.config.ts` — new
- `tailwind.config.ts` — port from `tailwind.config.cjs`
- `postcss.config.mjs` — replace `postcss.config.cjs`
- `tsconfig.json` — replace with Next.js tsconfig

### Types & Constants
- `types/index.ts` — expand from `types.ts` (add User, Subscription, AIUsage)
- `lib/constants.ts` — move from `constants.ts` (unchanged data)

### Supabase
- `supabase/migrations/001_initial_schema.sql` — all tables + RLS
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server client (cookies)

### Middleware & Auth
- `middleware.ts` — route protection
- `app/(auth)/signin/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(auth)/callback/route.ts` — OAuth + email verify handler

### App Shell
- `app/layout.tsx` — root layout (fonts, metadata)
- `app/(marketing)/page.tsx` — landing page
- `app/(marketing)/pricing/page.tsx` — pricing shell
- `app/(app)/layout.tsx` — protected layout
- `app/(app)/read/[book]/[chapter]/page.tsx` — reader route
- `app/(app)/dashboard/page.tsx` — dashboard shell

### Lib
- `lib/bible/service.ts` — port from `services/bibleService.ts`
- `lib/storage/local.ts` — port from `services/storageService.ts`
- `lib/gemini/service.ts` — server-only Gemini calls

### API Routes
- `app/api/ai/explain/route.ts` — verse explanation + rate limit
- `app/api/ai/context/route.ts` — historical context + rate limit
- `app/api/ai/image/route.ts` — verse art + rate limit
- `app/api/ai/tts/route.ts` — TTS (paid only — no rate limit needed)

### Components (ported)
- `components/reader/reader-view.tsx` — from `components/ReaderView.tsx`
- `components/reader/sidebar.tsx` — from `components/Sidebar.tsx`
- `components/reader/reader-header.tsx` — from `components/Header.tsx`
- `components/reader/live-conversation.tsx` — from `components/LiveConversation.tsx`
- `components/providers/theme-provider.tsx` — theme context
- `components/marketing/landing-page.tsx` — from `components/LandingPage.tsx`

### Tests
- `__tests__/middleware.test.ts`
- `__tests__/api/ai/explain.test.ts`
- `__tests__/lib/bible-service.test.ts`

---

## Task 1: Scaffold Next.js 15 Project

**Files:**
- Rewrite: `package.json`
- Create: `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `tsconfig.json`

- [ ] **Step 1: Back up existing Vite config files**

```bash
cd "C:/Users/dell/OneDrive/Desktop/Scripture Stream/scripture-stream"
cp vite.config.ts vite.config.ts.bak
cp tailwind.config.cjs tailwind.config.cjs.bak
cp tsconfig.json tsconfig.json.bak
```

- [ ] **Step 2: Replace `package.json`**

```json
{
  "name": "scripturestream",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@google/genai": "^1.34.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.21",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "ts-jest": "^29.3.1",
    "typescript": "~5.8.2"
  }
}
```

- [ ] **Step 3: Create `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 6: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: Create `jest.config.ts`**

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathPattern: '__tests__',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};

export default config;
```

- [ ] **Step 8: Create `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 9: Install dependencies**

```bash
npm install
```

Expected: installs ~200 packages with no errors.

- [ ] **Step 10: Verify Next.js can start**

```bash
npm run dev
```

Expected: `▲ Next.js 15.x.x — ready on http://localhost:3000` (404 page is fine — no pages yet)

- [ ] **Step 11: Commit**

```bash
git add package.json next.config.ts tailwind.config.ts postcss.config.mjs tsconfig.json jest.config.ts jest.setup.ts
git commit -m "chore: scaffold Next.js 15 project replacing Vite"
```

---

## Task 2: Types and Constants

**Files:**
- Create: `types/index.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Create `types/index.ts`**

```typescript
// ─── Bible ───────────────────────────────────────────────────────────────────

export type Translation = string;

export interface Verse {
  id: string;
  number: number;
  text: string;
  book: string;
  chapter: number;
  translation: Translation;
}

export interface BibleBook {
  name: string;
  chapters: number;
  category: 'Old Testament' | 'New Testament';
}

// ─── User data ───────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  translation: Translation;
  createdAt: number;
}

export interface Note {
  id: string;
  verseId: string;
  content: string;
  lastUpdated: number;
}

export interface Highlight {
  id: string;
  verseId: string;
  color: string;
}

export interface ReadingProgress {
  book: string;
  chapter: number;
  completedAt: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans';
}

// ─── Auth / Subscription ─────────────────────────────────────────────────────

export type SubscriptionPlan = 'free' | 'monthly' | 'annual' | 'lifetime';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ─── AI usage (free tier rate limiting) ──────────────────────────────────────

export interface AIUsage {
  userId: string;
  date: string;
  explanationCount: number;
  contextCount: number;
  imageCount: number;
}

export const AI_FREE_LIMITS = {
  explanation: 5,
  context: 3,
  image: 2,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isPremium(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.plan === 'lifetime') return true;
  if (sub.status !== 'active') return false;
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) return false;
  return sub.plan === 'monthly' || sub.plan === 'annual';
}
```

- [ ] **Step 2: Create `lib/constants.ts`** — copy the full content from `constants.ts` verbatim, updating the import to use the new types path:

```typescript
import { BibleBook } from '@/types';
// ... rest of constants.ts content unchanged (BIBLE_BOOKS, TRANSLATIONS, BIBLE_BOOK_ID_BY_NAME, etc.)
```

- [ ] **Step 3: Write tests for `isPremium`**

Create `__tests__/types/is-premium.test.ts`:

```typescript
import { isPremium, Subscription } from '@/types';

const base: Subscription = {
  id: '1', userId: 'u1', stripeCustomerId: null, stripeSubscriptionId: null,
  plan: 'monthly', status: 'active',
  currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
};

test('active monthly is premium', () => {
  expect(isPremium(base)).toBe(true);
});

test('null subscription is not premium', () => {
  expect(isPremium(null)).toBe(false);
});

test('lifetime is always premium regardless of period', () => {
  expect(isPremium({ ...base, plan: 'lifetime', currentPeriodEnd: null })).toBe(true);
});

test('canceled subscription is not premium', () => {
  expect(isPremium({ ...base, status: 'canceled' })).toBe(false);
});

test('expired active subscription is not premium', () => {
  const expired = { ...base, currentPeriodEnd: new Date(Date.now() - 1000).toISOString() };
  expect(isPremium(expired)).toBe(false);
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern=is-premium
```

Expected: 5 passing

- [ ] **Step 5: Commit**

```bash
git add types/ lib/constants.ts __tests__/types/
git commit -m "feat: add types, constants, isPremium helper"
```

---

## Task 3: Supabase Database Migration

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write `supabase/migrations/001_initial_schema.sql`**

```sql
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
  stripe_subscription_id   text unique,  -- null for lifetime purchases
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
```

- [ ] **Step 3: Apply migration in Supabase dashboard**

In Supabase dashboard → SQL editor, paste and run the full migration. Verify all tables appear in Table Editor.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema with RLS for all tables"
```

---

## Task 4: Supabase Client Helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `.env.local` (not committed)
- Update: `.gitignore`

- [ ] **Step 1: Add `.env.local`** — create this file manually (not committed):

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Add `.env.local` to `.gitignore`**

```bash
echo ".env.local" >> .gitignore
echo ".env*.local" >> .gitignore
```

- [ ] **Step 3: Create `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* called from Server Component — middleware handles refresh */ }
        },
      },
    }
  );
}

/** Service role client — server-side only, bypasses RLS */
export function createServiceClient() {
  // Import inline to avoid bundling into client
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/ .gitignore
git commit -m "feat: add Supabase browser and server clients"
```

---

## Task 5: Next.js Middleware (Route Protection)

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write `__tests__/middleware.test.ts`**

```typescript
// Integration-level smoke test — middleware logic tested via route behaviour.
// Full auth middleware requires a real Supabase session; test the helper logic only.

import { isPremium } from '@/types';

test('middleware guard: isPremium gates paid routes', () => {
  const freeSub = { id:'1', userId:'u', plan:'free' as const,
    status:'active' as const, currentPeriodEnd: null,
    stripeCustomerId: null, stripeSubscriptionId: null };
  expect(isPremium(freeSub)).toBe(false);
});
```

- [ ] **Step 2: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=middleware
```

Expected: 1 passing

- [ ] **Step 3: Create `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = ['/read', '/dashboard', '/study', '/settings'];
// Routes that require a paid subscription
const PREMIUM_PATHS = ['/morning-card'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before any early return
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  const needsAuth = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect free users away from premium-only pages
  const needsPremium = PREMIUM_PATHS.some(p => pathname.startsWith(p));
  if (needsPremium && user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .single();

    const isPaid =
      sub?.plan === 'lifetime' ||
      (sub?.status === 'active' &&
        sub?.plan !== 'free' &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date()));

    if (!isPaid) {
      const url = request.nextUrl.clone();
      url.pathname = '/pricing';
      url.searchParams.set('feature', 'morning-card');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 4: Commit**

```bash
git add middleware.ts __tests__/middleware.test.ts
git commit -m "feat: add auth + subscription middleware"
```

---

## Task 6: Auth Pages

**Files:**
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/signin/page.tsx`
- Create: `app/(auth)/signup/page.tsx`
- Create: `app/(auth)/reset-password/page.tsx`
- Create: `app/(auth)/callback/route.ts`

- [ ] **Step 1: Create `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-stone-800">Scripture Stream</h1>
          <p className="text-stone-500 mt-1">Your daily Bible companion</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/(auth)/signup/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Check your email</h2>
        <p className="text-stone-500">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-8">
      <h2 className="text-xl font-semibold text-stone-800 mb-6">Create your account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Full name</label>
          <input
            type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="John Smith" required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="you@example.com" required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Min 8 characters" minLength={8} required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-4">
        Already have an account?{' '}
        <Link href="/signin" className="text-amber-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/signin/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(redirectTo);
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=${redirectTo}` },
    });
  }

  return (
    <div className="bg-white rounded-xl shadow p-8">
      <h2 className="text-xl font-semibold text-stone-800 mb-6">Sign in</h2>
      <button
        onClick={handleGoogle}
        className="w-full border border-stone-300 rounded-lg py-2.5 flex items-center justify-center gap-2 text-stone-700 hover:bg-stone-50 transition mb-4"
      >
        <span>Continue with Google</span>
      </button>
      <div className="flex items-center gap-2 my-4">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-stone-400 text-sm">or</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="flex justify-between text-sm text-stone-500 mt-4">
        <Link href="/reset-password" className="hover:text-amber-600">Forgot password?</Link>
        <Link href="/signup" className="text-amber-600 hover:underline">Create account</Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return <Suspense><SignInForm /></Suspense>;
}
```

- [ ] **Step 4: Create `app/(auth)/reset-password/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/settings`,
    });
    if (error) { setError(error.message); return; }
    setSent(true);
  }

  if (sent) return (
    <div className="bg-white rounded-xl shadow p-8 text-center">
      <p className="text-stone-600">Password reset link sent to <strong>{email}</strong>.</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow p-8">
      <h2 className="text-xl font-semibold text-stone-800 mb-6">Reset password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          placeholder="you@example.com" required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" className="w-full bg-amber-600 text-white font-semibold py-2.5 rounded-lg">
          Send reset link
        </button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-4">
        <Link href="/signin" className="text-amber-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/(auth)/callback/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
}
```

- [ ] **Step 6: Verify sign-up flow manually**

```bash
npm run dev
```

Navigate to `http://localhost:3000/signup`. Create a test account. Check Supabase dashboard → Authentication → Users to confirm the user was created and the `profiles` + `subscriptions` trigger fired.

- [ ] **Step 7: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add sign-up, sign-in, reset-password, OAuth callback"
```

---

## Task 7: Root Layout and App Shell

**Files:**
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/(app)/layout.tsx`
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/providers/theme-provider.tsx`

- [ ] **Step 1: Create `app/globals.css`** — port from `index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-size: 18px;
  --line-height: 1.7;
}

html { font-size: var(--font-size); }

body {
  @apply bg-stone-50 text-stone-800;
}

/* Sepia theme */
.theme-sepia {
  @apply bg-amber-50 text-amber-900;
}

/* Dark theme */
.theme-dark {
  @apply bg-stone-900 text-stone-100;
}
```

- [ ] **Step 2: Create `components/providers/theme-provider.tsx`**

```tsx
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferences } from '@/types';

interface ThemeContextValue {
  prefs: UserPreferences;
  setPrefs: (p: Partial<UserPreferences>) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  prefs: { theme: 'light', fontSize: 18, lineHeight: 1.7, fontFamily: 'serif' },
  setPrefs: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPreferences>({
    theme: 'light', fontSize: 18, lineHeight: 1.7, fontFamily: 'serif',
  });

  useEffect(() => {
    const stored = localStorage.getItem('ss_prefs');
    if (stored) setPrefsState(JSON.parse(stored));
  }, []);

  function setPrefs(partial: Partial<UserPreferences>) {
    const next = { ...prefs, ...partial };
    setPrefsState(next);
    localStorage.setItem('ss_prefs', JSON.stringify(next));
  }

  return (
    <ThemeContext.Provider value={{ prefs, setPrefs }}>
      <div
        className={`theme-${prefs.theme} min-h-screen`}
        style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineHeight }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

- [ ] **Step 3: Create `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: 'Scripture Stream — Daily Bible Study',
  description: 'Read, study, and explore the Bible with AI-powered insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create `app/(app)/layout.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');
  return <>{children}</>;
}
```

- [ ] **Step 5: Create `app/(app)/dashboard/page.tsx`** (shell — expanded in Plan 4)

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user!.id).single();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-serif text-stone-800 mb-2">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
      </h1>
      <p className="text-stone-500">Continue your Bible study journey.</p>
      <a href="/read/john/3" className="mt-6 inline-block bg-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-amber-700 transition">
        Open Bible Reader →
      </a>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/globals.css app/\(app\)/ components/providers/
git commit -m "feat: add root layout, theme provider, protected app shell"
```

---

## Task 8: Bible Service and Storage Service

**Files:**
- Create: `lib/bible/service.ts`
- Create: `lib/storage/local.ts`
- Create: `__tests__/lib/bible-service.test.ts`

- [ ] **Step 1: Write failing test for Bible service**

Create `__tests__/lib/bible-service.test.ts`:

```typescript
import { bibleService } from '@/lib/bible/service';

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('getChapter returns verses from API', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      verses: [
        { book_id: 'jhn', book: 'John', chapter: 3, verse: 16, text: 'For God so loved...' }
      ]
    })
  });

  const verses = await bibleService.getChapter('John', 3, 'web');
  expect(verses).toHaveLength(1);
  expect(verses[0].text).toBe('For God so loved...');
  expect(verses[0].id).toBe('web-John-3-16');
});

test('getChapter throws on 404', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
  await expect(bibleService.getChapter('John', 99, 'web')).rejects.toThrow('Not found');
});

test('getChapter uses cache on second call', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ verses: [{ book_id: 'jhn', book: 'John', chapter: 1, verse: 1, text: 'In the beginning' }] })
  });

  await bibleService.getChapter('John', 1, 'web');
  await bibleService.getChapter('John', 1, 'web');
  expect(fetch).toHaveBeenCalledTimes(1); // second call hits cache
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --testPathPattern=bible-service
```

Expected: FAIL — module not found

- [ ] **Step 3: Create `lib/bible/service.ts`**

```typescript
import { BIBLE_BOOK_ID_BY_NAME, DEFAULT_TRANSLATION } from '@/lib/constants';
import { Translation, Verse } from '@/types';

const BIBLE_API_BASE = 'https://bible-api.com/data';
const chapterCache = new Map<string, Verse[]>();

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export const bibleService = {
  getChapter: async (book: string, chapter: number, translation: Translation): Promise<Verse[]> => {
    const translationId = asNonEmptyString(translation) ?? DEFAULT_TRANSLATION;
    const bookId = BIBLE_BOOK_ID_BY_NAME[book];
    if (!bookId) throw new Error(`Unknown book: ${book}`);

    const cacheKey = `${translationId}:${bookId}:${chapter}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) return cached;

    const url = `${BIBLE_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Not found for ${translationId}: ${book} ${chapter}.`);
      if (res.status === 429) throw new Error('Rate limited. Please try again in a moment.');
      throw new Error(`Scripture source error (${res.status}).`);
    }

    const data = await res.json() as { verses: { book_id: string; book: string; chapter: number; verse: number; text: string }[] };
    const verses: Verse[] = (data.verses || []).map(v => ({
      id: `${translationId}-${book}-${chapter}-${v.verse}`,
      number: v.verse,
      text: (v.text || '').trim(),
      book,
      chapter,
      translation: translationId,
    }));

    chapterCache.set(cacheKey, verses);
    return verses;
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=bible-service
```

Expected: 3 passing

- [ ] **Step 5: Create `lib/storage/local.ts`**

```typescript
'use client';
import { Bookmark, Note, Highlight, ReadingProgress } from '@/types';

// localStorage keys
const KEYS = {
  bookmarks: 'ss_bookmarks',
  notes: 'ss_notes',
  highlights: 'ss_highlights',
  progress: 'ss_progress',
} as const;

function get<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function set<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const localStore = {
  // Bookmarks
  getBookmarks: (): Bookmark[] => get(KEYS.bookmarks),
  saveBookmark: (b: Bookmark) => set(KEYS.bookmarks, [...get<Bookmark>(KEYS.bookmarks), b]),
  removeBookmark: (id: string) => set(KEYS.bookmarks, get<Bookmark>(KEYS.bookmarks).filter(b => b.id !== id)),

  // Notes
  getNotes: (): Note[] => get(KEYS.notes),
  saveNote: (n: Note) => {
    const notes = get<Note>(KEYS.notes);
    const idx = notes.findIndex(x => x.verseId === n.verseId);
    if (idx > -1) { notes[idx] = n; set(KEYS.notes, notes); }
    else set(KEYS.notes, [...notes, n]);
  },

  // Highlights
  getHighlights: (): Highlight[] => get(KEYS.highlights),
  saveHighlight: (h: Highlight) => set(KEYS.highlights, [...get<Highlight>(KEYS.highlights), h]),
  removeHighlight: (verseId: string) => set(KEYS.highlights, get<Highlight>(KEYS.highlights).filter(h => h.verseId !== verseId)),

  // Reading progress
  getProgress: (): ReadingProgress[] => get(KEYS.progress),
  markAsRead: (book: string, chapter: number) => {
    const progress = get<ReadingProgress>(KEYS.progress);
    if (!progress.some(p => p.book === book && p.chapter === chapter)) {
      set(KEYS.progress, [...progress, { book, chapter, completedAt: Date.now() }]);
    }
  },
  unmarkAsRead: (book: string, chapter: number) =>
    set(KEYS.progress, get<ReadingProgress>(KEYS.progress).filter(p => !(p.book === book && p.chapter === chapter))),
  isRead: (book: string, chapter: number): boolean =>
    get<ReadingProgress>(KEYS.progress).some(p => p.book === book && p.chapter === chapter),
};
```

- [ ] **Step 6: Commit**

```bash
git add lib/bible/ lib/storage/ __tests__/lib/
git commit -m "feat: add Bible service and localStorage adapter with tests"
```

---

## Task 9: Server-Side Gemini Service + AI API Routes

**Files:**
- Create: `lib/gemini/service.ts`
- Create: `app/api/ai/explain/route.ts`
- Create: `app/api/ai/context/route.ts`
- Create: `app/api/ai/image/route.ts`
- Create: `app/api/ai/tts/route.ts`
- Create: `__tests__/api/ai/explain.test.ts`

- [ ] **Step 1: Create `lib/gemini/service.ts`**

```typescript
// SERVER-ONLY — never import this from client components
import { GoogleGenAI, Modality } from '@google/genai';

function getClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenAI({ apiKey: key });
}

export const geminiService = {
  async explainVerse(verseText: string, reference: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Explain the meaning and theological significance of: "${verseText}" (${reference}). Concise but deep.`,
      config: { temperature: 0.7, maxOutputTokens: 800 },
    });
    return response.text ?? 'Unable to generate explanation.';
  },

  async getHistoricalContext(book: string, chapter: number): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide historical background for ${book} chapter ${chapter}. Include author, time period, and original audience.`,
      config: { temperature: 0.5, maxOutputTokens: 1000 },
    });
    return response.text ?? 'Context unavailable.';
  },

  async generateVerseArt(verseText: string, style: string): Promise<string | null> {
    const stylePrompts: Record<string, string> = {
      Ethereal: 'ethereal, peaceful, soft light, heavenly atmosphere, soft watercolor',
      Ancient: 'ancient parchment textures, warm earthy tones, historical oil painting',
      Nature: 'beautiful serene nature landscape, morning sun, mountains or quiet waters, realistic photography',
      Modern: 'minimalist abstract gradient, clean lines, contemporary spiritual art',
    };
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Beautiful artistic background for: "${verseText}". Style: ${stylePrompts[style] ?? stylePrompts.Ethereal}. NO TEXT.` }] },
      config: { imageConfig: { aspectRatio: '1:1' } },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  },

  async generateSpeech(text: string, voiceName = 'Kore'): Promise<string | null> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `Read clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
  },
};
```

- [ ] **Step 2: Write failing test for explain API route**

Create `__tests__/api/ai/explain.test.ts`:

```typescript
import { POST } from '@/app/api/ai/explain/route';
import { NextRequest } from 'next/server';

// Mock Supabase and Gemini
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/gemini/service', () => ({
  geminiService: { explainVerse: jest.fn().mockResolvedValue('Mock explanation') },
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockSupabase(userId: string | null, plan: string, usageCount: number) {
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { plan, status: 'active', current_period_end: null } }),
    }),
  });
  (createServiceClient as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { explanation_count: usageCount } }),
      upsert: jest.fn().mockResolvedValue({}),
    }),
  });
}

test('returns explanation for authenticated free user under limit', async () => {
  mockSupabase('user-1', 'free', 2);
  const res = await POST(makeRequest({ verseText: 'For God so loved', reference: 'John 3:16' }));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.explanation).toBe('Mock explanation');
});

test('returns 429 for free user at limit', async () => {
  mockSupabase('user-1', 'free', 5);
  const res = await POST(makeRequest({ verseText: 'Test', reference: 'John 1:1' }));
  expect(res.status).toBe(429);
});

test('returns 401 for unauthenticated request', async () => {
  mockSupabase(null, 'free', 0);
  const res = await POST(makeRequest({ verseText: 'Test', reference: 'John 1:1' }));
  expect(res.status).toBe(401);
});
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npm test -- --testPathPattern=explain
```

Expected: FAIL — module not found

- [ ] **Step 4: Create `app/api/ai/explain/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Parse body
  const { verseText, reference } = await req.json() as { verseText: string; reference: string };
  if (!verseText || !reference) {
    return NextResponse.json({ error: 'Missing verseText or reference' }, { status: 400 });
  }

  // 3. Check subscription
  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();

  const paid = isPremium(sub ? { ...sub, id: '', userId: user.id, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  // 4. Rate limit free users
  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('explanation_count').eq('user_id', user.id).eq('date', today).single();

    const count = usage?.explanation_count ?? 0;
    if (count >= AI_FREE_LIMITS.explanation) {
      return NextResponse.json(
        { error: 'Daily limit reached. Upgrade to Premium for unlimited explanations.' },
        { status: 429 }
      );
    }

    // Increment usage
    await service.from('ai_usage').upsert({
      user_id: user.id, date: today,
      explanation_count: count + 1,
    }, { onConflict: 'user_id,date' });
  }

  // 5. Generate explanation
  const explanation = await geminiService.explainVerse(verseText, reference);
  return NextResponse.json({ explanation });
}
```

- [ ] **Step 5: Run tests to confirm passing**

```bash
npm test -- --testPathPattern=explain
```

Expected: 3 passing

- [ ] **Step 6: Create `app/api/ai/context/route.ts`** — same pattern, different limit key:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { book, chapter } = await req.json() as { book: string; chapter: number };
  if (!book || !chapter) return NextResponse.json({ error: 'Missing book or chapter' }, { status: 400 });

  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();
  const paid = isPremium(sub ? { ...sub, id: '', userId: user.id, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('context_count').eq('user_id', user.id).eq('date', today).single();
    const count = usage?.context_count ?? 0;
    if (count >= AI_FREE_LIMITS.context) {
      return NextResponse.json({ error: 'Daily limit reached. Upgrade to Premium.' }, { status: 429 });
    }
    await service.from('ai_usage').upsert({ user_id: user.id, date: today, context_count: count + 1 }, { onConflict: 'user_id,date' });
  }

  const context = await geminiService.getHistoricalContext(book, chapter);
  return NextResponse.json({ context });
}
```

- [ ] **Step 7: Create `app/api/ai/image/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { verseText, style } = await req.json() as { verseText: string; style: string };

  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();
  const paid = isPremium(sub ? { ...sub, id: '', userId: user.id, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('image_count').eq('user_id', user.id).eq('date', today).single();
    const count = usage?.image_count ?? 0;
    if (count >= AI_FREE_LIMITS.image) {
      return NextResponse.json({ error: 'Daily limit reached. Upgrade to Premium.' }, { status: 429 });
    }
    await service.from('ai_usage').upsert({ user_id: user.id, date: today, image_count: count + 1 }, { onConflict: 'user_id,date' });
  }

  const imageData = await geminiService.generateVerseArt(verseText, style ?? 'Ethereal');
  return NextResponse.json({ imageData });
}
```

- [ ] **Step 8: Create `app/api/ai/tts/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, voiceName } = await req.json() as { text: string; voiceName?: string };
  const audioData = await geminiService.generateSpeech(text, voiceName);
  return NextResponse.json({ audioData });
}
```

- [ ] **Step 9: Commit**

```bash
git add lib/gemini/ app/api/ai/ __tests__/api/
git commit -m "feat: add server-side Gemini service and rate-limited AI API routes"
```

---

## Task 10: Port Reader Components

**Files:**
- Create: `components/reader/reader-header.tsx`
- Create: `components/reader/sidebar.tsx`
- Create: `components/reader/reader-view.tsx`
- Create: `app/(app)/read/[book]/[chapter]/page.tsx`

- [ ] **Step 1: Create `components/reader/reader-header.tsx`**

Port from existing `components/Header.tsx`. Key changes:
- Replace `import { Link } from 'react-router-dom'` with `import Link from 'next/link'`
- Remove `useNavigate` — use `<Link>` for navigation
- Keep all existing UI/styling logic unchanged

```tsx
'use client';
import Link from 'next/link';
import { useTheme } from '@/components/providers/theme-provider';
import { UserPreferences } from '@/types';

interface ReaderHeaderProps {
  onMenuToggle: () => void;
  onLiveStudy: () => void;
}

export function ReaderHeader({ onMenuToggle, onLiveStudy }: ReaderHeaderProps) {
  const { prefs, setPrefs } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white dark:bg-stone-900 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-stone-100 transition" aria-label="Toggle menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="font-serif text-lg font-semibold text-stone-800">Scripture Stream</Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLiveStudy}
          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition"
        >
          Live Study
        </button>
        {(['light', 'dark', 'sepia'] as UserPreferences['theme'][]).map(t => (
          <button
            key={t}
            onClick={() => setPrefs({ theme: t })}
            className={`w-6 h-6 rounded-full border-2 transition ${prefs.theme === t ? 'border-amber-500 scale-110' : 'border-stone-300'} ${t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-stone-800' : 'bg-amber-100'}`}
            aria-label={`${t} theme`}
          />
        ))}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `components/reader/sidebar.tsx`**

Port from existing `components/Sidebar.tsx`. Key changes:
- Replace `useNavigate` with `useRouter` from `next/navigation`
- Replace route pushing with `router.push('/read/bookname/chapter')`
- Keep all existing UI, tab logic, and Bible data

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BIBLE_BOOKS, TRANSLATIONS } from '@/lib/constants';
import { Translation } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  currentBook: string;
  currentChapter: number;
  currentTranslation: Translation;
  onTranslationChange: (t: Translation) => void;
}

export function Sidebar({ isOpen, currentBook, currentChapter, currentTranslation, onTranslationChange }: SidebarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'books' | 'translations'>('books');
  const [selectedBook, setSelectedBook] = useState(currentBook);
  const [testament, setTestament] = useState<'Old Testament' | 'New Testament'>('Old Testament');

  const filteredBooks = BIBLE_BOOKS.filter(b => b.category === testament);
  const bookData = BIBLE_BOOKS.find(b => b.name === selectedBook);

  function navigateToChapter(book: string, chapter: number) {
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
  }

  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r border-stone-200 bg-white h-full overflow-y-auto flex-shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200">
        {(['books', 'translations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${activeTab === tab ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'books' && (
        <div>
          {/* Testament toggle */}
          <div className="flex p-3 gap-2">
            {(['Old Testament', 'New Testament'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTestament(t)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition ${testament === t ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {t === 'Old Testament' ? 'Old' : 'New'}
              </button>
            ))}
          </div>
          {/* Book list */}
          <div className="px-3 pb-3 space-y-1">
            {filteredBooks.map(book => (
              <button
                key={book.name}
                onClick={() => setSelectedBook(book.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedBook === book.name ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
              >
                {book.name}
              </button>
            ))}
          </div>
          {/* Chapter grid */}
          {bookData && (
            <div className="border-t border-stone-100 p-3">
              <p className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">{selectedBook} — Chapters</p>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => navigateToChapter(selectedBook, ch)}
                    className={`py-1.5 text-xs rounded transition ${selectedBook === currentBook && ch === currentChapter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-amber-100'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'translations' && (
        <div className="p-3 space-y-1">
          {TRANSLATIONS.map(t => (
            <button
              key={t.id}
              onClick={() => onTranslationChange(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${currentTranslation === t.id ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
            >
              <span className="font-medium">{t.id.toUpperCase()}</span>
              <span className="text-stone-400 ml-2 text-xs">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Create `components/reader/reader-view.tsx`**

This is a port of the existing `ReaderView.tsx`. Replace the Gemini direct calls with `fetch` calls to the API routes. Key changes:

```tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Verse, Highlight, Note, Translation } from '@/types';
import { bibleService } from '@/lib/bible/service';
import { localStore } from '@/lib/storage/local';
import { DEFAULT_TRANSLATION } from '@/lib/constants';
import { ReaderHeader } from './reader-header';
import { Sidebar } from './sidebar';
import { LiveConversation } from './live-conversation';

interface ReaderViewProps {
  initialBook: string;
  initialChapter: number;
}

const HIGHLIGHT_COLORS = ['#FEF08A', '#93C5FD', '#86EFAC', '#FDA4AF', '#FCA5A1'] as const;

export function ReaderView({ initialBook, initialChapter }: ReaderViewProps) {
  const [book, setBook] = useState(initialBook);
  const [chapter, setChapter] = useState(initialChapter);
  const [translation, setTranslation] = useState<Translation>(DEFAULT_TRANSLATION);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [notes, setNotes] = useState<Note[]>(localStore.getNotes());
  const [highlights, setHighlights] = useState<Highlight[]>(localStore.getHighlights());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLiveConvo, setShowLiveConvo] = useState(false);
  // AI state
  const [explanation, setExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [historicalContext, setHistoricalContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [verseArt, setVerseArt] = useState<string | null>(null);
  const [artLoading, setArtLoading] = useState(false);
  const [artStyle, setArtStyle] = useState('Ethereal');

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedVerse(null);
    setExplanation('');
    setHistoricalContext('');
    bibleService.getChapter(book, chapter, translation)
      .then(v => { setVerses(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [book, chapter, translation]);

  async function handleExplainVerse(verse: Verse) {
    setSelectedVerse(verse);
    setExplanationLoading(true);
    setExplanation('');
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: verse.text, reference: `${verse.book} ${verse.chapter}:${verse.number}` }),
    });
    const data = await res.json();
    setExplanation(res.ok ? data.explanation : data.error);
    setExplanationLoading(false);
  }

  async function handleHistoricalContext() {
    setContextLoading(true);
    setHistoricalContext('');
    const res = await fetch('/api/ai/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, chapter }),
    });
    const data = await res.json();
    setHistoricalContext(res.ok ? data.context : data.error);
    setContextLoading(false);
  }

  async function handleGenerateArt(verse: Verse) {
    setArtLoading(true);
    setVerseArt(null);
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: verse.text, style: artStyle }),
    });
    const data = await res.json();
    if (res.ok) setVerseArt(data.imageData);
    setArtLoading(false);
  }

  function handleHighlight(verse: Verse, color: string) {
    const existing = highlights.find(h => h.verseId === verse.id);
    if (existing && existing.color === color) {
      localStore.removeHighlight(verse.id);
      setHighlights(localStore.getHighlights());
    } else {
      if (existing) localStore.removeHighlight(verse.id);
      localStore.saveHighlight({ id: `hl-${verse.id}`, verseId: verse.id, color });
      setHighlights(localStore.getHighlights());
    }
  }

  function handleSaveNote(verse: Verse, content: string) {
    localStore.saveNote({ id: `note-${verse.id}`, verseId: verse.id, content, lastUpdated: Date.now() });
    setNotes(localStore.getNotes());
  }

  const bookObj = { name: book, chapters: 1, category: 'Old Testament' as const };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        currentBook={book}
        currentChapter={chapter}
        currentTranslation={translation}
        onTranslationChange={setTranslation}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <ReaderHeader
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onLiveStudy={() => setShowLiveConvo(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          {/* Chapter navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">{book} {chapter}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChapter(c => Math.max(1, c - 1))}
                className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition"
              >← Prev</button>
              <button
                onClick={() => setChapter(c => c + 1)}
                className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition"
              >Next →</button>
            </div>
          </div>

          {/* Historical context button */}
          <button
            onClick={handleHistoricalContext}
            className="mb-4 text-sm text-amber-700 hover:text-amber-900 underline"
          >
            {contextLoading ? 'Loading context…' : 'View Historical Context'}
          </button>
          {historicalContext && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              {historicalContext}
            </div>
          )}

          {/* Verse art */}
          {verseArt && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img src={verseArt} alt="Verse art" className="w-full" />
            </div>
          )}

          {/* Verses */}
          {loading && <p className="text-stone-400">Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && verses.map(verse => {
            const hl = highlights.find(h => h.verseId === verse.id);
            const note = notes.find(n => n.verseId === verse.id);
            return (
              <div
                key={verse.id}
                className={`group mb-3 p-3 rounded-lg cursor-pointer transition ${selectedVerse?.id === verse.id ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'}`}
                style={hl ? { backgroundColor: hl.color + '55' } : {}}
                onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
              >
                <span className="text-xs text-stone-400 mr-2 select-none">{verse.number}</span>
                <span className="text-stone-800">{verse.text}</span>
                {note && (
                  <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{note.content}</p>
                )}
                {/* Actions shown on selection */}
                {selectedVerse?.id === verse.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {HIGHLIGHT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={e => { e.stopPropagation(); handleHighlight(verse, color); }}
                        className={`w-5 h-5 rounded-full border-2 ${hl?.color === color ? 'border-stone-600 scale-110' : 'border-transparent'} transition`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      onClick={e => { e.stopPropagation(); handleExplainVerse(verse); }}
                      className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      Explain
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleGenerateArt(verse); }}
                      className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      Art
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Explanation panel */}
          {(explanation || explanationLoading) && (
            <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <h3 className="font-semibold text-stone-700 mb-2">
                {selectedVerse ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}` : ''} — Explanation
              </h3>
              {explanationLoading ? <p className="text-stone-400 text-sm animate-pulse">Generating…</p> : <p className="text-stone-700 text-sm leading-relaxed">{explanation}</p>}
            </div>
          )}
        </main>
      </div>
      {showLiveConvo && (
        <LiveConversation
          currentBook={book}
          currentChapter={chapter}
          selectedVerse={selectedVerse ?? undefined}
          onClose={() => setShowLiveConvo(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `app/(app)/read/[book]/[chapter]/page.tsx`**

```tsx
import { ReaderView } from '@/components/reader/reader-view';
import { BIBLE_BOOKS } from '@/lib/constants';

// Decode URL book slug (e.g. "1-samuel" → "1 Samuel")
function decodeBookSlug(slug: string): string {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  const match = BIBLE_BOOKS.find(b => b.name.toLowerCase() === decoded.toLowerCase());
  return match?.name ?? decoded;
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const book = decodeBookSlug(bookSlug);
  const chapter = parseInt(chapterStr, 10) || 1;

  return <ReaderView initialBook={book} initialChapter={chapter} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  return {
    title: `${decodeURIComponent(book)} ${chapter} — Scripture Stream`,
  };
}
```

- [ ] **Step 5: Verify reader loads**

```bash
npm run dev
```

Navigate to `http://localhost:3000/read/john/3`. Should show John 3 in the reader. Sign in first if redirected.

- [ ] **Step 6: Commit**

```bash
git add components/reader/ app/\(app\)/read/
git commit -m "feat: port reader view, sidebar, and header to Next.js"
```

---

## Task 11: Port Live Conversation

**Files:**
- Create: `components/reader/live-conversation.tsx`

- [ ] **Step 1: Create `components/reader/live-conversation.tsx`**

Port from existing `components/LiveConversation.tsx`. Key changes:
- Add `'use client'` directive at the top
- Remove React Router imports — none needed (it's a modal)
- Keep all WebSocket / audio encoding / Gemini Live API logic unchanged
- The Gemini Live API is called client-side directly (it uses a streaming WebSocket, not a simple HTTP call — keep the existing pattern)

```tsx
'use client';
// Port of LiveConversation.tsx — add 'use client' at top, remove react-router imports.
// All other logic (Gemini Live audio, PCM encoding, WebSocket session management) is unchanged.
// Copy the full body of the existing LiveConversation.tsx here.

import { useState, useRef, useEffect, useCallback } from 'react';
import { Verse } from '@/types';
// ... rest of LiveConversation.tsx unchanged
```

> **Note:** Copy the entire body of `components/LiveConversation.tsx` into this file, adding only `'use client';` at line 1 and updating the `Verse` import path to `@/types`.

- [ ] **Step 2: Verify live conversation activates**

In the reader, click "Live Study" button. The live conversation modal should open and attempt to connect.

- [ ] **Step 3: Commit**

```bash
git add components/reader/live-conversation.tsx
git commit -m "feat: port Gemini Live voice conversation to Next.js"
```

---

## Task 12: Landing Page and Pricing Shell

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Create `app/(marketing)/layout.tsx`**

```tsx
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 2: Create `app/(marketing)/page.tsx`**

Port from existing `components/LandingPage.tsx`. Key changes:
- This is a Server Component (no `'use client'`)
- Replace `useNavigate` with `<Link href="/read/john/3">`
- Replace `useNavigate` "Learn More" with `<Link href="/pricing">`
- Replace `useNavigate` "Support Us" with `<Link href="/pricing">`
- All styling remains identical

```tsx
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scripture Stream — Daily Bible Study',
  description: 'Read, study, and explore the Bible with AI-powered insights. Free Bible reader with premium study tools.',
};

export default function LandingPage() {
  return (
    // Port LandingPage.tsx JSX here, replacing useNavigate calls with <Link> tags
    // and adding export default + Metadata export at the top
    // Copy the full JSX body from the existing components/LandingPage.tsx verbatim.
    // Three substitutions required:
    //   1. `useNavigate` hook removed — delete the const navigate = useNavigate() line
    //   2. `navigate('/read/john/3')` → replace onClick handler with href="/read/john/3" on <Link>
    //   3. `navigate('/pricing')` → replace with <Link href="/pricing">
    // All classNames, images, and layout stay identical.
    return <div />;
  // END: replace <div /> with ported LandingPage JSX
}
```

- [ ] **Step 3: Create `app/(marketing)/pricing/page.tsx`** (shell — filled in Plan 2)

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Scripture Stream',
  description: 'Upgrade to Premium for unlimited AI, cloud sync, and powerful study tools.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">Simple, Honest Pricing</h1>
        <p className="text-stone-500 text-lg mb-8">Pricing plans coming soon. Sign up free to get started.</p>
        <a href="/signup" className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition inline-block">
          Start Free
        </a>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(marketing\)/
git commit -m "feat: port landing page to Next.js, add pricing shell"
```

---

## Task 13: Remove Vite Files and Update Railway Config

**Files:**
- Delete: `vite.config.ts`, `vite.config.ts.bak`, `index.html`, `index.tsx`
- Update: `railway.toml`, `Dockerfile`

- [ ] **Step 1: Remove Vite-specific files**

```bash
rm vite.config.ts vite.config.ts.bak index.html index.tsx
rm tailwind.config.cjs.bak tsconfig.json.bak
rm -rf postcss.config.cjs
```

- [ ] **Step 2: Update `railway.toml`**

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

- [ ] **Step 3: Update `Dockerfile`** (for local Docker builds)

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Add `output: 'standalone'` to `next.config.ts`**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Run production build to verify no errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully` with no TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add railway.toml Dockerfile next.config.ts
git commit -m "chore: remove Vite artifacts, update Railway and Docker config for Next.js"
```

---

## Task 14: End-to-End Smoke Test

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 2: Manually verify the full auth + reader flow**

1. Go to `http://localhost:3000` — landing page renders
2. Click "Begin Your Journey" — redirects to `/signin` (protected route)
3. Sign up with a new email — verification email sent
4. Verify email — redirected to `/dashboard`
5. Navigate to `/read/john/3` — John 3 loads in the reader
6. Click verse 16 — verse action menu appears
7. Click "Explain" — calls `/api/ai/explain`, explanation appears (or rate limit message)
8. Click "View Historical Context" — calls `/api/ai/context`, context appears
9. Toggle theme — theme changes persist
10. Click "Live Study" — live conversation modal opens

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Plan 1 — Next.js foundation with auth, reader, and server-side AI"
```

---

## Plan 1 Complete

**What's working after this plan:**
- Next.js 15 app replacing Vite
- Supabase auth (email + Google OAuth)
- All 14 database tables with RLS
- Protected routes via middleware
- Bible reader fully functional (all translations, navigation, highlights, notes)
- All AI features moved server-side with free-tier rate limiting (5/3/2 per day)
- Gemini Live voice conversation preserved
- Landing page and pricing shell
- Railway deployment ready

**What comes next:**
- **Plan 2:** Stripe payments, upgrade modal, full feature gating matrix
- **Plan 3:** AI Study Assistant, Morning Card Studio, sermon builder, devotional writer
- **Plan 4:** SOAP journaling, Scripture Memory, PDF export, Reading Analytics
