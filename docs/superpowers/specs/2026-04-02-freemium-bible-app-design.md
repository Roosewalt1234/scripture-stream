# Scripture Stream — Freemium Bible App Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Full freemium transformation — Next.js migration, Supabase auth/database, Stripe payments, paid feature suite

---

## 1. Overview

Transform Scripture Stream from a frontend-only Bible reader into a full-stack freemium SaaS Bible study platform. The app will have two tiers: a free tier (Bible reading with limited AI) and a paid Premium tier ($9.99/mo) with unlimited AI, cloud sync, study tools, export features, and more.

**Pricing:**
- Free: $0 forever
- Monthly: $9.99/mo (displayed with crossed-out original price of $25.00/mo)
- Annual: $79.99/yr (displayed with crossed-out original price of $199/yr) — saves ~33%
- Lifetime: $149 one-time ("Best value for daily readers")

**No free trial period.** The free tier itself serves as the ongoing trial — free users always see locked premium features but cannot use them, creating a persistent upgrade incentive.

---

## 2. Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth + Database | Supabase (Auth + PostgreSQL + RLS) |
| Payments | Stripe (Checkout + Customer Portal + Webhooks) |
| AI | Google Gemini API (server-side via Next.js API routes) |
| Bible Data | bible-api.com (REST, public domain) |
| Deployment | Railway |

### Why Next.js (migrating from Vite/React)

- API routes handle Stripe webhooks and all Gemini calls server-side — Gemini API key never exposed to browser
- Server-side rendering on `/` and `/pricing` pages enables SEO (critical for organic discovery)
- Single deployment, single repo, no separate backend service
- `middleware.ts` handles auth + subscription gating at the edge

### Project Structure

```
scripture-stream/
├── app/
│   ├── (marketing)/               # SSR — SEO optimized
│   │   ├── page.tsx               # Landing page
│   │   ├── pricing/page.tsx       # Pricing page
│   │   └── about/page.tsx
│   ├── (auth)/
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (app)/                     # Protected routes (auth required)
│   │   ├── read/[book]/[chapter]/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── study/page.tsx
│   │   ├── morning-card/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── stripe/webhook/route.ts
│       ├── stripe/checkout/route.ts
│       ├── stripe/portal/route.ts
│       ├── ai/explain/route.ts
│       ├── ai/context/route.ts
│       ├── ai/assistant/route.ts
│       ├── ai/morning-card/route.ts
│       ├── ai/devotional/route.ts
│       ├── ai/sermon-outline/route.ts
│       ├── ai/discussion-questions/route.ts
│       ├── ai/prayer/route.ts
│       ├── ai/reading-plan/route.ts
│       └── ai/image/route.ts
├── components/
│   ├── reader/                    # All reader components
│   ├── study/                     # Study tools components
│   ├── marketing/                 # Landing + pricing components
│   ├── auth/                      # Auth forms
│   ├── ui/                        # Shared UI primitives
│   └── upgrade-modal.tsx          # Premium feature gate modal
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client (cookies)
│   │   └── middleware.ts          # Auth helpers
│   ├── stripe/
│   │   ├── client.ts
│   │   └── helpers.ts
│   └── gemini/
│       └── service.ts             # All Gemini calls (server-only)
├── middleware.ts                  # Auth + subscription gating
└── types/
    └── index.ts                   # All TypeScript interfaces
```

---

## 3. Database Schema (Supabase PostgreSQL)

```sql
-- Extends auth.users (auto-created by Supabase Auth)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription state (synced from Stripe via webhook)
CREATE TABLE subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id        TEXT UNIQUE,
  stripe_subscription_id    TEXT UNIQUE,           -- NULL for lifetime purchases
  plan                      TEXT CHECK (plan IN ('free','monthly','annual','lifetime')),
  status                    TEXT CHECK (status IN ('active','canceled','past_due','trialing')),
  current_period_end        TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Reading data
CREATE TABLE bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INT NOT NULL,
  verse       INT,
  label       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE highlights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INT NOT NULL,
  verse       INT NOT NULL,
  color       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book        TEXT NOT NULL,
  chapter     INT NOT NULL,
  verse       INT NOT NULL,
  content     TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reading_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book          TEXT NOT NULL,
  chapter       INT NOT NULL,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book, chapter)
);

-- User preferences (synced for paid subscribers)
CREATE TABLE preferences (
  user_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  theme        TEXT DEFAULT 'light',
  font_size    INT DEFAULT 18,
  font_family  TEXT DEFAULT 'serif',
  line_height  FLOAT DEFAULT 1.7,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Reading plans
CREATE TABLE reading_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  duration_days INT NOT NULL,
  is_premium    BOOLEAN DEFAULT FALSE,
  created_by    UUID REFERENCES profiles(id)
);

CREATE TABLE plan_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
  day_number    INT NOT NULL,
  book          TEXT NOT NULL,
  chapter_start INT NOT NULL,
  chapter_end   INT NOT NULL
);

CREATE TABLE user_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES reading_plans(id),
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  current_day   INT DEFAULT 1,
  completed_at  TIMESTAMPTZ
);

-- AI Study Assistant chat
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book        TEXT,
  chapter     INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Good Morning Cards (saved generated cards)
CREATE TABLE morning_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book             TEXT NOT NULL,
  chapter          INT NOT NULL,
  verse            INT NOT NULL,
  image_url        TEXT,
  devotional_text  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- SOAP Journal entries
CREATE TABLE soap_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book          TEXT NOT NULL,
  chapter       INT NOT NULL,
  verse         INT,
  scripture     TEXT NOT NULL,
  observation   TEXT,
  application   TEXT,
  prayer        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Scripture memory flashcards
CREATE TABLE memory_verses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book            TEXT NOT NULL,
  chapter         INT NOT NULL,
  verse           INT NOT NULL,
  verse_text      TEXT NOT NULL,
  translation     TEXT NOT NULL,
  ease_factor     FLOAT DEFAULT 2.5,        -- SM-2 algorithm
  interval_days   INT DEFAULT 1,
  next_review     DATE DEFAULT CURRENT_DATE,
  total_reviews   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage tracking (free tier rate limiting)
CREATE TABLE ai_usage (
  user_id            UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date               DATE DEFAULT CURRENT_DATE,
  explanation_count  INT DEFAULT 0,   -- Free limit: 5/day
  context_count      INT DEFAULT 0,   -- Free limit: 3/day
  image_count        INT DEFAULT 0,   -- Free limit: 2/day
  PRIMARY KEY (user_id, date)
);
```

**Row Level Security:** All tables have RLS enabled. Users can only SELECT/INSERT/UPDATE/DELETE their own rows (`user_id = auth.uid()`). Stripe webhook route uses the Supabase `service_role` key (server-side only) to write subscription records, bypassing RLS.

---

## 4. Authentication

- **Provider:** Supabase Auth
- **Methods:** Email/password + Google OAuth
- **Email verification** required before accessing the app
- **Session management:** `@supabase/ssr` with Next.js cookie-based sessions
- **middleware.ts** checks session on all `/app/*` routes — redirect to `/signin` if unauthenticated

**Auth flow:**
1. User signs up → Supabase sends verification email
2. User verifies → Supabase creates `auth.users` record → trigger creates `profiles` row + `subscriptions` row with `plan: 'free'`
3. User signs in → session cookie set → redirected to `/read/john/3`

---

## 5. Subscription Gating

### Feature Matrix

| Feature | Free | Premium |
|---------|------|---------|
| Bible reading (17 translations) | ✅ | ✅ |
| Highlights, bookmarks, notes | Local (localStorage) | Cloud synced |
| Verse explanation (AI) | 5/day | Unlimited |
| Historical context (AI) | 3/day | Unlimited |
| Verse art generation | 2/day | Unlimited |
| Live voice conversation | ❌ | ✅ |
| Verse comparison | 2 translations | 5 + interlinear + commentaries |
| Good Morning Card studio | View only | ✅ Full studio |
| AI Study Assistant chat | ❌ | ✅ |
| Sermon / teaching outline AI | ❌ | ✅ |
| AI devotional writer | ❌ | ✅ |
| AI discussion questions | ❌ | ✅ |
| AI prayer generator | ❌ | ✅ |
| AI reading plan recommender | ❌ | ✅ |
| PDF export | ❌ | ✅ |
| Reading analytics & streak | Basic | Full (calendar, stats) |
| Data sync across devices | ❌ | ✅ |
| Export personal data backup | ❌ | ✅ |
| Reading plans | 3 free plans | 1000+ plans + custom builder |
| SOAP journaling | ❌ | ✅ |
| Scripture memory (flashcards) | ❌ | ✅ |
| Original language interlinear | ❌ | ✅ |
| Commentary access | ❌ | ✅ Matthew Henry Complete, Calvin's Commentaries, Spurgeon's Treasury of David (Psalms), John Wesley's Notes |
| Prayer journal | Basic list | Full journal + categories + answered log |

### Gating UX

- Locked features are **always visible** — never hidden
- Lock icon (🔒) on premium features in sidebar and toolbar
- Clicking any locked feature opens the **Upgrade Modal**
- Upgrade Modal shows: feature name, what it does, crossed-out $25.00/mo, $9.99/mo price, 4 benefit bullets, "Upgrade Now" CTA, "Maybe later" dismissal, "See all features" link to `/pricing`
- No ugly disabled states — the UI looks polished at every tier

### API Route Gating (middleware.ts)

```
/api/ai/explain        → check auth + check daily explanation_count (free: ≤5, paid: unlimited)
/api/ai/context        → check auth + check daily context_count (free: ≤3, paid: unlimited)
/api/ai/image          → check auth + check daily image_count (free: ≤2, paid: unlimited)
/api/ai/assistant      → check auth + check subscription (paid only) → 403 if free
/api/ai/morning-card   → check auth + check subscription (paid only) → 403 if free
/api/ai/[others]       → check auth + check subscription (paid only) → 403 if free
/read/:book/:chapter   → check auth → redirect to /signin if unauthenticated
/dashboard             → check auth → redirect to /signin if unauthenticated
/study                 → check auth → redirect to /signin if unauthenticated
/morning-card          → check auth + check subscription → redirect to /pricing if free
/settings              → check auth → redirect to /signin if unauthenticated
```

---

## 6. Payments (Stripe)

### Products & Prices

- **Monthly:** $9.99/mo recurring
- **Annual:** $79.99/yr recurring
- **Lifetime:** $149 one-time payment

### Checkout Flow

1. User clicks "Upgrade Now" anywhere in app
2. POST to `/api/stripe/checkout` — creates Stripe Checkout Session with `customer_email` pre-filled
3. User redirected to Stripe-hosted Checkout page
4. Payment succeeds → Stripe fires `checkout.session.completed`
5. `/api/stripe/webhook` receives event → upserts `subscriptions` table
6. User redirected to `/app/dashboard?upgraded=true` with success banner

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription record, set plan + status + period_end |
| `customer.subscription.updated` | Update status, period_end, plan |
| `customer.subscription.deleted` | Set status to `canceled` |
| `invoice.payment_failed` | Set status to `past_due` |

### Cancellation

- User goes to Settings → Subscription → "Manage Subscription"
- POST to `/api/stripe/portal` → creates Stripe Customer Portal session → redirect
- User cancels in Stripe portal → `customer.subscription.deleted` webhook fires
- Access continues until `current_period_end` — not cut off immediately

### Lifetime Plan

- Stored as `plan: 'lifetime'` with `current_period_end: null`
- Never expires — subscription check returns `true` for lifetime users regardless of date

---

## 7. Key Paid Features

### Good Morning Card Studio (`/app/morning-card`)

- **Left panel:** Verse picker (today's Verse of the Day auto-loaded, or search any verse), style options (background: Ethereal/Ancient/Nature/Modern/Custom upload), font selector, color theme, toggles for devotional text and prayer
- **Right panel:** Live card preview updating as options change
- **AI generation:** Background image (Gemini image gen) + 3-sentence devotional reflection + short prayer — all generated together in one API call to `/api/ai/morning-card`
- **Export formats:** PNG download in Instagram square (1080×1080), Instagram Story (1080×1920), WhatsApp (800×800)
- **Save:** Generated cards saved to `morning_cards` table, accessible in card history

### Verse Comparison + Interlinear

- Expandable panel in reader showing up to 5 translation columns side by side
- Toggle "Original Language" → adds Greek (NT) or Hebrew (OT) row beneath each English verse
- Click any original language word → popover shows: transliteration, Strong's number, full lexicon definition, count of occurrences in Bible
- Commentary tab: shows Matthew Henry Complete + Calvin's Commentaries note for the selected verse (all public domain, bundled with the app)
- Free users: 2 translation columns only, no interlinear, no commentary

### AI Study Assistant

- Persistent chat panel slides in from the right side of the reader
- Context-aware: always knows current book, chapter, and selected verse
- Starter questions shown when first opened ("What is the main theme of this chapter?", "Explain the cultural context of verse 5", "What does this teach about prayer?")
- Responses include clickable Scripture references that navigate the reader
- Full conversation history saved to `chat_sessions` + `chat_messages` in Supabase
- Powered by Gemini via `/api/ai/assistant`

### PDF Export

- Export current chapter: selected translation, highlights shown in color, notes shown as margin annotations, optional commentary notes
- Export reading plan progress report
- Export all personal notes as a formatted study journal
- Generated server-side via a PDF library (e.g., `@react-pdf/renderer` or `puppeteer`)

### SOAP Journaling

- Tab in the verse action menu alongside existing Notes tab
- Scripture field: auto-filled with selected verse text
- Observation, Application, Prayer: free-text fields
- AI can pre-fill Observation field with verse explanation as a starting point
- Entries dated and searchable, exportable to PDF

### Scripture Memory (Spaced Repetition)

- "Add to Memory" button on any verse (paid only)
- SM-2 spaced repetition algorithm schedules reviews
- Daily dashboard widget shows cards due for review
- Card flip UI: reference shown → user recalls verse → reveals text → marks Easy/Hard/Again
- Progress tracked with streak and total verses memorized count

### Reading Analytics Dashboard

- GitHub contribution graph-style streak calendar
- Books completed vs total, chapters read, estimated reading time
- Most highlighted books and verses
- Reading plan completion percentages
- All data derived from `reading_progress`, `highlights`, `notes` tables

---

## 8. UI Structure & Navigation

### Marketing Pages (Server-Side Rendered)

- `/` — Landing page: hero, 3 feature pillars, social proof, pricing preview, CTA
- `/pricing` — Full pricing comparison table, plan toggle (Monthly/Annual/Lifetime), FAQ
- `/about` — About Scripture Stream

### App Layout (Authenticated)

```
Header: Logo | Search bar | Morning Card button | Upgrade button (free) / Plan badge (paid)
├── Sidebar: Books | Chapters | Translations | Plans | Tools (🔒 for free) | Memory (🔒 for free)
└── Main: Reader | Dashboard | Study | Morning Card | Settings
```

### Reader View Toolbar

```
[Translation ▾] [Compare 🔒] [Interlinear 🔒] [Commentary 🔒] [Audio ▶] [Export 🔒]
```

### Verse Action Menu (on verse click)

```
[Highlight ▾] [Note] [SOAP 🔒] [Explain (n left / ∞)] [Memory 🔒] [Share]
```

### Settings Page Sections

1. **Account** — name, email, avatar, change password
2. **Subscription** — current plan, next billing date, "Manage Subscription" → Stripe portal
3. **Preferences** — theme, font size, font family, line height (synced for paid users)
4. **Data** — export all data as JSON backup, import backup, delete account
5. **Notifications** — Verse of the Day toggle, Morning Card reminder toggle

---

## 9. Data Sync Strategy

| User type | Storage |
|-----------|---------|
| Unauthenticated | localStorage only |
| Free (logged in) | localStorage (reads/writes locally) |
| Paid (logged in) | Supabase (reads/writes to database, synced across devices) |

On upgrade from free to paid: a one-time migration step offers to sync existing localStorage data to Supabase ("We found your local data — would you like to sync it to the cloud?").

On export: paid users can download all their data (bookmarks, highlights, notes, reading progress, SOAP entries, memory verses) as a single JSON file from Settings → Data.

---

## 10. Migration Plan (Vite/React → Next.js)

The existing app has significant working functionality that must be preserved without regression:

1. **Bible reader** — port ReaderView.tsx, Sidebar.tsx, Header.tsx to Next.js components
2. **Gemini Live audio** — port LiveConversation.tsx carefully (complex WebSocket + audio encoding)
3. **All existing services** — bibleService.ts, geminiService.ts, storageService.ts, audioUtils.ts adapted to work in both client and server contexts
4. **Existing UI/styles** — Tailwind config, index.css, color themes, font preferences all preserved
5. **New additions** — Supabase auth, Stripe, new feature components added on top

Migration order: marketing pages first (no auth complexity) → auth pages → reader (core feature) → new paid features.

---

## 11. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-only (webhooks, admin)

# Stripe
STRIPE_SECRET_KEY=                 # Server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=             # Server-only

# Stripe Price IDs
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_ANNUAL=
STRIPE_PRICE_LIFETIME=

# Gemini (server-only — no longer exposed to browser)
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=               # e.g. https://scripture-stream.up.railway.app
```

---

## 12. Out of Scope (for this phase)

- Mobile app (iOS/Android) — web only
- Church/team plan — future phase
- Original language morphological search — future phase
- Dead Sea Scrolls / extra-biblical text links — future phase
- 3D Temple reconstructions — future phase
- Podcast/audio export — future phase
- Social features (friends, public notes) — future phase
