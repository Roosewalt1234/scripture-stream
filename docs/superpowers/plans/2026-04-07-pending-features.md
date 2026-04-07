# Scripture Stream — Pending Features (Plans 2–4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Stripe payments, upgrade modal, 7 AI endpoints, Morning Card Studio, AI Study Assistant, SOAP journaling, Scripture Memory flashcards, PDF export, Reading Analytics dashboard, cloud sync for paid users, and a full Settings page — completing the Scripture Stream freemium feature set for public launch.

**Architecture:** Three phases. Phase 1 wires Stripe payments and the upgrade modal so free users can convert. Phase 2 builds all premium AI features behind the subscription gate. Phase 3 adds study tools (SOAP, memory, analytics, PDF export) and cloud sync. All AI calls remain server-side. Stripe webhook is the single source of truth for subscription state. Free users use localStorage; paid users get Supabase cloud sync. Stripe env vars can be added later — the code degrades gracefully if missing.

**Tech Stack:** Next.js 15, Supabase, `stripe` npm package, Google Gemini (`@google/genai`), `@react-pdf/renderer`, TypeScript, Tailwind CSS, Jest

---

## File Map

### Phase 1 — Payments & Gating
| File | Action | Purpose |
|------|--------|---------|
| `lib/stripe/client.ts` | Create | Stripe server SDK singleton |
| `lib/stripe/helpers.ts` | Create | `getOrCreateCustomer`, subscription upsert |
| `app/api/stripe/checkout/route.ts` | Create | Create Stripe Checkout session |
| `app/api/stripe/portal/route.ts` | Create | Create Stripe Customer Portal session |
| `app/api/stripe/webhook/route.ts` | Create | Handle Stripe webhook events |
| `components/upgrade-modal.tsx` | Create | Premium gate modal shown on locked feature click |
| `app/(marketing)/pricing/page.tsx` | Modify | Full pricing page (replaces placeholder) |
| `app/(app)/settings/page.tsx` | Create | Account, subscription, preferences, data export |
| `app/(app)/layout.tsx` | Modify | Pass `isPremium` + `subscription` to children via context |
| `components/providers/subscription-provider.tsx` | Create | Context: user subscription state |

### Phase 2 — Premium AI Features
| File | Action | Purpose |
|------|--------|---------|
| `lib/gemini/service.ts` | Modify | Add: studyAssistant, morningCard, devotional, sermonOutline, discussionQuestions, prayer, readingPlan |
| `app/api/ai/assistant/route.ts` | Create | Study Assistant chat (premium only) |
| `app/api/ai/morning-card/route.ts` | Create | Morning Card generation (premium only) |
| `app/api/ai/devotional/route.ts` | Create | AI devotional writer (premium only) |
| `app/api/ai/sermon-outline/route.ts` | Create | Sermon outline generator (premium only) |
| `app/api/ai/discussion-questions/route.ts` | Create | Discussion questions (premium only) |
| `app/api/ai/prayer/route.ts` | Create | Prayer generator (premium only) |
| `app/api/ai/reading-plan/route.ts` | Create | Reading plan recommender (premium only) |
| `components/reader/panel-study-assistant.tsx` | Create | Chat UI for Study Assistant |
| `components/reader/right-panel.tsx` | Modify | Add Study tab (index 3), wire upgrade modal for premium |
| `app/(app)/morning-card/page.tsx` | Create | Morning Card Studio page |
| `components/morning-card/card-studio.tsx` | Create | Left controls + right live preview |

### Phase 3 — Study Tools
| File | Action | Purpose |
|------|--------|---------|
| `app/api/soap/route.ts` | Create | SOAP journal CRUD (GET, POST, PATCH, DELETE) |
| `app/api/memory/route.ts` | Create | Scripture memory CRUD + SM-2 review endpoint |
| `app/api/analytics/route.ts` | Create | Aggregate reading stats from Supabase tables |
| `app/api/export/route.ts` | Create | PDF export (chapter / notes journal) |
| `components/study/soap-journal.tsx` | Create | SOAP form + entry list |
| `components/study/memory-flashcard.tsx` | Create | Flashcard flip UI + SM-2 review buttons |
| `components/dashboard/analytics-widget.tsx` | Create | Streak calendar + key stats |
| `app/(app)/study/page.tsx` | Create | Study page: SOAP + Memory tabs |
| `app/(app)/dashboard/page.tsx` | Modify | Add analytics widget + memory due count |
| `components/reader/reader-view.tsx` | Modify | Accept `isPremium`, cloud sync storage, SOAP button in verse actions |
| `lib/storage/cloud.ts` | Create | Supabase CRUD for notes, highlights, bookmarks (paid users) |

---

## Phase 1: Stripe Payments & Gating

---

### Task 1: Install Stripe package

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install stripe**

```bash
cd "C:/Users/dell/OneDrive/Desktop/Scripture Stream/scripture-stream"
npm install stripe
```

Expected output: `added 1 package` (stripe ~16.x)

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install stripe package"
```

---

### Task 2: Stripe server client and helpers

**Files:**
- Create: `lib/stripe/client.ts`
- Create: `lib/stripe/helpers.ts`
- Test: `__tests__/lib/stripe-helpers.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// __tests__/lib/stripe-helpers.test.ts
import { mapStripeStatus } from '@/lib/stripe/helpers';

describe('mapStripeStatus', () => {
  it('maps active subscription', () => {
    expect(mapStripeStatus('active')).toBe('active');
  });
  it('maps past_due subscription', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due');
  });
  it('maps canceled subscription', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled');
  });
  it('maps trialing subscription', () => {
    expect(mapStripeStatus('trialing')).toBe('trialing');
  });
  it('maps unknown status to canceled', () => {
    expect(mapStripeStatus('unpaid')).toBe('canceled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="stripe-helpers" --no-coverage
```

Expected: FAIL — `mapStripeStatus` not found

- [ ] **Step 3: Create `lib/stripe/client.ts`**

```typescript
// lib/stripe/client.ts
// SERVER-ONLY — never import from client components
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe = new Stripe(key, { apiVersion: '2025-03-31.basil' });
  return _stripe;
}
```

- [ ] **Step 4: Create `lib/stripe/helpers.ts`**

```typescript
// lib/stripe/helpers.ts
// SERVER-ONLY
import { SubscriptionStatus } from '@/types';
import { createServiceClient } from '@/lib/supabase/server';

export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    trialing: 'trialing',
  };
  return map[stripeStatus] ?? 'canceled';
}

export function mapPlanFromPriceId(priceId: string): 'monthly' | 'annual' | 'lifetime' {
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return 'annual';
  if (priceId === process.env.STRIPE_PRICE_LIFETIME) return 'lifetime';
  return 'monthly';
}

/** Upsert subscription record after a Stripe event */
export async function upsertSubscription(opts: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  plan: 'monthly' | 'annual' | 'lifetime' | 'free';
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
}) {
  const db = createServiceClient();
  await db.from('subscriptions').upsert(
    {
      user_id: opts.userId,
      stripe_customer_id: opts.stripeCustomerId,
      stripe_subscription_id: opts.stripeSubscriptionId,
      plan: opts.plan,
      status: opts.status,
      current_period_end: opts.currentPeriodEnd?.toISOString() ?? null,
    },
    { onConflict: 'user_id' }
  );
}

/** Find user_id from a Stripe customer id */
export async function getUserIdByCustomer(stripeCustomerId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data?.user_id ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- --testPathPattern="stripe-helpers" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/stripe/ __tests__/lib/stripe-helpers.test.ts
git commit -m "feat: add Stripe client and helpers"
```

---

### Task 3: Stripe Checkout, Portal, and Webhook routes

**Files:**
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/portal/route.ts`
- Create: `app/api/stripe/webhook/route.ts`
- Test: `__tests__/api/stripe/webhook.test.ts`

- [ ] **Step 1: Write failing webhook test**

```typescript
// __tests__/api/stripe/webhook.test.ts
import { mapStripeStatus, mapPlanFromPriceId } from '@/lib/stripe/helpers';

describe('webhook helpers', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ANNUAL = 'price_annual';
    process.env.STRIPE_PRICE_LIFETIME = 'price_lifetime';
  });

  it('maps monthly price to monthly plan', () => {
    expect(mapPlanFromPriceId('price_monthly')).toBe('monthly');
  });

  it('maps annual price to annual plan', () => {
    expect(mapPlanFromPriceId('price_annual')).toBe('annual');
  });

  it('maps lifetime price to lifetime plan', () => {
    expect(mapPlanFromPriceId('price_lifetime')).toBe('lifetime');
  });

  it('defaults unknown price to monthly', () => {
    expect(mapPlanFromPriceId('price_unknown')).toBe('monthly');
  });
});
```

- [ ] **Step 2: Run test to verify it passes (helpers already exist)**

```bash
npm test -- --testPathPattern="webhook" --no-coverage
```

Expected: PASS (helpers already written in Task 2)

- [ ] **Step 3: Create checkout route**

```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json() as { plan: 'monthly' | 'annual' | 'lifetime' };

  const priceMap: Record<string, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    annual: process.env.STRIPE_PRICE_ANNUAL,
    lifetime: process.env.STRIPE_PRICE_LIFETIME,
  };
  const priceId = priceMap[plan];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or Stripe not configured' }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: plan === 'lifetime' ? 'payment' : 'subscription',
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 4: Create portal route**

```typescript
// app/api/stripe/portal/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/client';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 5: Create webhook handler**

```typescript
// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { upsertSubscription, getUserIdByCustomer, mapStripeStatus, mapPlanFromPriceId } from '@/lib/stripe/helpers';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature invalid: ${err}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      if (session.mode === 'payment') {
        // Lifetime purchase
        await upsertSubscription({
          userId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: null,
          plan: 'lifetime',
          status: 'active',
          currentPeriodEnd: null,
        });
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;
      const priceId = sub.items.data[0]?.price.id ?? '';
      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        plan: mapPlanFromPriceId(priceId),
        status: mapStripeStatus(sub.status),
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByCustomer(sub.customer as string);
      if (!userId) break;
      await upsertSubscription({
        userId,
        stripeCustomerId: sub.customer as string,
        stripeSubscriptionId: sub.id,
        plan: 'free',
        status: 'canceled',
        currentPeriodEnd: null,
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = await getUserIdByCustomer(invoice.customer as string);
      if (!userId) break;
      const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
      if (subId) {
        const stripe2 = getStripe();
        const stripeSub = await stripe2.subscriptions.retrieve(subId);
        await upsertSubscription({
          userId,
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: subId,
          plan: mapPlanFromPriceId(stripeSub.items.data[0]?.price.id ?? ''),
          status: 'past_due',
          currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/stripe/ __tests__/api/stripe/
git commit -m "feat: add Stripe checkout, portal, and webhook routes"
```

---

### Task 4: Subscription Context Provider

**Files:**
- Create: `components/providers/subscription-provider.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create subscription provider**

```typescript
// components/providers/subscription-provider.tsx
'use client';
import { createContext, useContext } from 'react';
import { Subscription } from '@/types';
import { isPremium } from '@/types';

interface SubscriptionContextValue {
  subscription: Subscription | null;
  isPaid: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  isPaid: false,
});

export function SubscriptionProvider({
  subscription,
  children,
}: {
  subscription: Subscription | null;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ subscription, isPaid: isPremium(subscription) }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
```

- [ ] **Step 2: Update app layout to load and provide subscription**

```typescript
// app/(app)/layout.tsx
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SubscriptionProvider } from '@/components/providers/subscription-provider';
import { Subscription } from '@/types';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan, status, current_period_end, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', user.id)
    .single();

  const subscription: Subscription | null = sub
    ? {
        id: sub.id,
        userId: user.id,
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end ?? null,
        stripeCustomerId: sub.stripe_customer_id ?? null,
        stripeSubscriptionId: sub.stripe_subscription_id ?? null,
      }
    : null;

  return (
    <SubscriptionProvider subscription={subscription}>
      {children}
    </SubscriptionProvider>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/providers/subscription-provider.tsx app/(app)/layout.tsx
git commit -m "feat: add subscription context provider to app layout"
```

---

### Task 5: Upgrade Modal

**Files:**
- Create: `components/upgrade-modal.tsx`

- [ ] **Step 1: Create upgrade modal**

```typescript
// components/upgrade-modal.tsx
'use client';
import { useState } from 'react';

interface UpgradeModalProps {
  featureName: string;
  featureDescription: string;
  onClose: () => void;
}

export function UpgradeModal({ featureName, featureDescription, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade(plan: 'monthly' | 'annual' | 'lifetime') {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Unable to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-2xl">🔒</span>
            <h2 className="text-xl font-serif text-stone-800 mt-1">{featureName}</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">×</button>
        </div>

        <p className="text-stone-600 text-sm mb-5">{featureDescription}</p>

        {/* Benefits */}
        <ul className="space-y-2 mb-6">
          {[
            'Unlimited AI explanations, context, and verse art',
            'AI Study Assistant, Morning Card Studio & more',
            'SOAP journaling, Scripture memory flashcards',
            'Cloud sync across all your devices',
          ].map(b => (
            <li key={b} className="flex items-start gap-2 text-sm text-stone-700">
              <span className="text-amber-500 mt-0.5">✓</span>
              {b}
            </li>
          ))}
        </ul>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Plans */}
        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleUpgrade('monthly')}
            disabled={loading}
            className="w-full py-3 px-4 border-2 border-stone-200 rounded-xl text-sm font-medium hover:border-amber-400 transition flex justify-between items-center disabled:opacity-50"
          >
            <span>Monthly</span>
            <span className="text-stone-500"><s className="text-stone-300">$25</s> $9.99/mo</span>
          </button>
          <button
            onClick={() => handleUpgrade('annual')}
            disabled={loading}
            className="w-full py-3 px-4 border-2 border-amber-500 bg-amber-50 rounded-xl text-sm font-medium hover:border-amber-600 transition flex justify-between items-center disabled:opacity-50"
          >
            <span className="flex items-center gap-2">Annual <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">Save 33%</span></span>
            <span className="text-stone-500"><s className="text-stone-300">$199</s> $79.99/yr</span>
          </button>
          <button
            onClick={() => handleUpgrade('lifetime')}
            disabled={loading}
            className="w-full py-3 px-4 border-2 border-stone-200 rounded-xl text-sm font-medium hover:border-amber-400 transition flex justify-between items-center disabled:opacity-50"
          >
            <span className="flex items-center gap-2">Lifetime <span className="text-xs bg-stone-700 text-white px-2 py-0.5 rounded-full">Best value</span></span>
            <span className="text-stone-500">$149 once</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-400">
          <button onClick={onClose} className="hover:text-stone-600 transition">Maybe later</button>
          <a href="/pricing" className="hover:text-stone-600 transition underline">See all features →</a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upgrade-modal.tsx
git commit -m "feat: add upgrade modal with Stripe checkout integration"
```

---

### Task 6: Full Pricing Page

**Files:**
- Modify: `app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Replace pricing page with full implementation**

```typescript
// app/(marketing)/pricing/page.tsx
import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://scripturestream.app';

export const metadata: Metadata = {
  title: 'Pricing — Scripture Stream',
  description: 'Upgrade to Premium for unlimited AI, cloud sync, and powerful study tools.',
  alternates: { canonical: `${APP_URL}/pricing` },
};

const FEATURES = [
  { name: 'Bible reading (17 translations)', free: true, paid: true },
  { name: 'Highlights, bookmarks & notes', free: 'Local only', paid: 'Cloud synced' },
  { name: 'Verse explanation (AI)', free: '5/day', paid: 'Unlimited' },
  { name: 'Historical context (AI)', free: '3/day', paid: 'Unlimited' },
  { name: 'Verse art generation', free: '2/day', paid: 'Unlimited' },
  { name: 'AI Study Assistant chat', free: false, paid: true },
  { name: 'Morning Card Studio', free: false, paid: true },
  { name: 'Sermon / teaching outline AI', free: false, paid: true },
  { name: 'AI devotional writer', free: false, paid: true },
  { name: 'AI discussion questions', free: false, paid: true },
  { name: 'AI prayer generator', free: false, paid: true },
  { name: 'Translation compare (5 columns)', free: false, paid: true },
  { name: 'Original language interlinear', free: false, paid: true },
  { name: 'Commentary access', free: false, paid: true },
  { name: 'SOAP journaling', free: false, paid: true },
  { name: 'Scripture memory (flashcards)', free: false, paid: true },
  { name: 'Reading analytics & streak', free: 'Basic', paid: 'Full dashboard' },
  { name: 'PDF export', free: false, paid: true },
  { name: 'Cloud sync across devices', free: false, paid: true },
  { name: 'Data backup & export', free: false, paid: true },
  { name: 'Reading plans', free: '3 plans', paid: '1000+ plans' },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-amber-600 font-bold">✓</span>;
  if (value === false) return <span className="text-stone-300">–</span>;
  return <span className="text-sm text-stone-600">{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">Simple, Honest Pricing</h1>
        <p className="text-stone-500 text-lg mb-12">Start free forever. Upgrade when you're ready for more.</p>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Free */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 text-left">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Free</p>
            <p className="text-4xl font-bold text-stone-800 mb-1">$0</p>
            <p className="text-stone-400 text-sm mb-6">Forever</p>
            <a href="/signup" className="block w-full py-3 border border-stone-300 rounded-xl text-center text-sm font-semibold hover:bg-stone-50 transition">
              Get Started Free
            </a>
          </div>

          {/* Annual — highlighted */}
          <div className="bg-amber-600 rounded-2xl p-6 text-white text-left relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-3 py-1 rounded-full">Most Popular</span>
            <p className="text-sm font-semibold uppercase tracking-wide mb-2 text-amber-100">Annual</p>
            <p className="text-4xl font-bold mb-1">$79.99<span className="text-xl font-normal">/yr</span></p>
            <p className="text-amber-200 text-sm mb-1"><s>$199/yr</s> — save 60%</p>
            <p className="text-amber-100 text-xs mb-6">$6.67/month billed annually</p>
            <a href="/signup" className="block w-full py-3 bg-white text-amber-700 rounded-xl text-center text-sm font-semibold hover:bg-amber-50 transition">
              Start Annual Plan
            </a>
          </div>

          {/* Lifetime */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 text-left">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Lifetime</p>
            <p className="text-4xl font-bold text-stone-800 mb-1">$149</p>
            <p className="text-stone-400 text-sm mb-6">One-time payment, forever</p>
            <a href="/signup" className="block w-full py-3 bg-stone-800 text-white rounded-xl text-center text-sm font-semibold hover:bg-stone-900 transition">
              Get Lifetime Access
            </a>
          </div>
        </div>
      </section>

      {/* Feature table */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-serif text-stone-800 text-center mb-8">What's Included</h2>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left p-4 font-semibold text-stone-700 w-1/2">Feature</th>
                <th className="p-4 font-semibold text-stone-700 text-center">Free</th>
                <th className="p-4 font-semibold text-amber-700 text-center">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.name} className={i % 2 === 0 ? 'bg-stone-50/50' : ''}>
                  <td className="p-4 text-stone-700">{f.name}</td>
                  <td className="p-4 text-center"><Cell value={f.free} /></td>
                  <td className="p-4 text-center"><Cell value={f.paid} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-serif text-stone-800 text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {[
            { q: 'Is the free tier really free forever?', a: 'Yes. No credit card required. You can read the Bible in 17 translations and use limited AI features at no cost, forever.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from Settings → Subscription. You keep premium access until your current period ends.' },
            { q: 'What happens to my data if I cancel?', a: 'Your data is never deleted. Your notes, highlights, and reading progress are preserved. Cloud sync pauses — data stays local.' },
            { q: 'Does Lifetime include all future features?', a: 'Yes. Lifetime access covers all features added to Scripture Stream in the future.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl p-5 border border-stone-200">
              <p className="font-semibold text-stone-800 mb-2">{q}</p>
              <p className="text-stone-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(marketing)/pricing/page.tsx
git commit -m "feat: implement full pricing page with feature comparison table"
```

---

### Task 7: Settings Page

**Files:**
- Create: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Create settings page**

```typescript
// app/(app)/settings/page.tsx
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { SettingsClient } from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles').select('full_name, avatar_url').eq('id', user!.id).single();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, stripe_customer_id')
    .eq('user_id', user!.id).single();

  const paid = isPremium(sub ? {
    id: '', userId: user!.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null,
    stripeCustomerId: sub.stripe_customer_id ?? null, stripeSubscriptionId: null,
  } : null);

  return (
    <SettingsClient
      user={{ id: user!.id, email: user!.email ?? '', fullName: profile?.full_name ?? '' }}
      plan={sub?.plan ?? 'free'}
      isPaid={paid}
      currentPeriodEnd={sub?.current_period_end ?? null}
      hasStripeCustomer={!!sub?.stripe_customer_id}
    />
  );
}
```

- [ ] **Step 2: Create `components/settings/settings-client.tsx`**

```typescript
// components/settings/settings-client.tsx
'use client';
import { useState } from 'react';

interface Props {
  user: { id: string; email: string; fullName: string };
  plan: string;
  isPaid: boolean;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
}

export function SettingsClient({ user, plan, isPaid, currentPeriodEnd, hasStripeCustomer }: Props) {
  const [tab, setTab] = useState<'account' | 'subscription' | 'data'>('account');
  const [fullName, setFullName] = useState(user.fullName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Saved!' : 'Error saving profile.');
    setTimeout(() => setMessage(''), 3000);
  }

  async function openPortal() {
    setPortalLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url, error } = await res.json();
    if (url) window.location.href = url;
    else { alert(error || 'Unable to open billing portal.'); setPortalLoading(false); }
  }

  async function exportData() {
    setExportLoading(true);
    const res = await fetch('/api/export/data');
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `scripture-stream-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
    } else { alert('Export failed. Please try again.'); }
    setExportLoading(false);
  }

  const planLabel: Record<string, string> = {
    free: 'Free', monthly: 'Premium Monthly', annual: 'Premium Annual', lifetime: 'Premium Lifetime',
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-serif text-stone-800 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-stone-200">
        {(['account', 'subscription', 'data'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition ${tab === t ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Account */}
      {tab === 'account' && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input value={user.email} disabled className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-400 bg-stone-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {message && <p className="text-sm text-stone-500">{message}</p>}
          </div>
        </div>
      )}

      {/* Subscription */}
      {tab === 'subscription' && (
        <div className="space-y-5">
          <div className="bg-stone-50 rounded-xl p-5 border border-stone-200">
            <p className="text-sm text-stone-500 mb-1">Current plan</p>
            <p className="text-xl font-bold text-stone-800">{planLabel[plan] ?? plan}</p>
            {currentPeriodEnd && plan !== 'lifetime' && (
              <p className="text-sm text-stone-400 mt-1">
                Renews {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>

          {!isPaid && (
            <a href="/pricing" className="block w-full py-3 bg-amber-600 text-white text-center rounded-xl font-semibold hover:bg-amber-700 transition">
              Upgrade to Premium
            </a>
          )}

          {isPaid && plan !== 'lifetime' && hasStripeCustomer && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="w-full py-3 border border-stone-300 rounded-xl text-sm font-semibold hover:bg-stone-50 transition disabled:opacity-50"
            >
              {portalLoading ? 'Opening…' : 'Manage Subscription'}
            </button>
          )}
        </div>
      )}

      {/* Data */}
      {tab === 'data' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-1">Export Your Data</h3>
            <p className="text-sm text-stone-400 mb-3">Download all your notes, highlights, bookmarks, and reading progress as a JSON file.</p>
            <button
              onClick={exportData}
              disabled={exportLoading || !isPaid}
              className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium hover:bg-stone-50 transition disabled:opacity-50"
            >
              {exportLoading ? 'Exporting…' : 'Export Data (JSON)'}
            </button>
            {!isPaid && <p className="text-xs text-stone-400 mt-2">Data export is a Premium feature.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create profile update API route**

```typescript
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fullName } = await req.json() as { fullName: string };
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(app)/settings/ components/settings/ app/api/profile/
git commit -m "feat: add settings page with account, subscription, and data export tabs"
```

---

### Task 8: Update Panel Tools with working upgrade modal

**Files:**
- Modify: `components/reader/panel-tools.tsx`

- [ ] **Step 1: Update panel-tools to use upgrade modal and subscription context**

```typescript
// components/reader/panel-tools.tsx
'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { localStore } from '@/lib/storage/local';
import { UserPreferences } from '@/types';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface PanelToolsProps {
  book: string;
  chapter: number;
}

const LOCKED_FEATURES = [
  { label: 'Cross References', description: 'See related passages across the Bible' },
  { label: 'Translation Compare', description: 'Compare up to 5 translations side by side' },
  { label: 'Original Language', description: "Hebrew & Greek with Strong's numbers" },
];

export function PanelTools({ book, chapter }: PanelToolsProps) {
  const { prefs, setPrefs } = useTheme();
  const { isPaid } = useSubscription();
  const [isRead, setIsRead] = useState(() => localStore.isRead(book, chapter));
  const [totalRead, setTotalRead] = useState(() => localStore.getProgress().length);
  const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; description: string } | null>(null);

  function toggleRead() {
    if (isRead) {
      localStore.unmarkAsRead(book, chapter);
      setIsRead(false);
    } else {
      localStore.markAsRead(book, chapter);
      setIsRead(true);
    }
    setTotalRead(localStore.getProgress().length);
  }

  useEffect(() => {
    setIsRead(localStore.isRead(book, chapter));
    setTotalRead(localStore.getProgress().length);
  }, [book, chapter]);

  return (
    <>
      <div className="space-y-5">
        {/* Appearance */}
        <section>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Appearance</p>
          <div className="mb-4">
            <p className="text-xs text-stone-500 mb-2">Theme</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'sepia'] as UserPreferences['theme'][]).map(t => (
                <button
                  key={t}
                  onClick={() => setPrefs({ theme: t })}
                  className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                    prefs.theme === t ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-stone-500">Font Size</p>
              <span className="text-xs font-medium text-stone-700">{prefs.fontSize}px</span>
            </div>
            <input
              type="range" min={14} max={28} step={1} value={prefs.fontSize}
              onChange={e => setPrefs({ fontSize: Number(e.target.value) })}
              className="w-full accent-amber-600" aria-label="Font size"
            />
          </div>
          <div>
            <p className="text-xs text-stone-500 mb-2">Font</p>
            <div className="flex gap-2">
              {(['serif', 'sans'] as UserPreferences['fontFamily'][]).map(f => (
                <button
                  key={f}
                  onClick={() => setPrefs({ fontFamily: f })}
                  className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                    prefs.fontFamily === f ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {f === 'serif' ? 'Serif' : 'Sans-serif'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-stone-100" />

        {/* Reading Progress */}
        <section>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Reading Progress</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isRead} onChange={toggleRead} className="w-4 h-4 accent-amber-600 rounded" />
            <span className="text-sm text-stone-700">Mark {book} {chapter} as complete</span>
          </label>
          <p className="mt-2 text-xs text-stone-400">{totalRead} chapter{totalRead !== 1 ? 's' : ''} completed total</p>
        </section>

        <div className="border-t border-stone-100" />

        {/* Premium features */}
        <section>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
            {isPaid ? 'Study Tools' : 'Premium Features'}
          </p>
          {LOCKED_FEATURES.map(item => (
            <button
              key={item.label}
              onClick={() => !isPaid && setUpgradeFeature({ name: item.label, description: item.description })}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border mb-2 text-left transition ${
                isPaid ? 'bg-stone-50 border-stone-100 hover:bg-amber-50 hover:border-amber-200 opacity-60 cursor-not-allowed' : 'bg-stone-50 border-stone-100 opacity-70 hover:opacity-90'
              }`}
            >
              <span className="text-base mt-0.5">🔒</span>
              <div>
                <p className="text-sm font-medium text-stone-700">{item.label}</p>
                <p className="text-xs text-stone-400">{item.description}</p>
              </div>
            </button>
          ))}
          {!isPaid && (
            <button
              onClick={() => setUpgradeFeature({ name: 'Premium', description: 'Unlock all premium study tools.' })}
              className="mt-1 w-full py-2 border border-amber-500 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition"
            >
              Upgrade to Premium
            </button>
          )}
        </section>
      </div>

      {upgradeFeature && (
        <UpgradeModal
          featureName={upgradeFeature.name}
          featureDescription={upgradeFeature.description}
          onClose={() => setUpgradeFeature(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/panel-tools.tsx
git commit -m "feat: wire upgrade modal into panel tools for locked features"
```

---

## Phase 2: Premium AI Features

---

### Task 9: Extend Gemini service with premium AI methods

**Files:**
- Modify: `lib/gemini/service.ts`

- [ ] **Step 1: Add new methods to geminiService**

Add these methods to the existing `geminiService` object in `lib/gemini/service.ts` (after `generateSpeech`):

```typescript
  async studyAssistant(
    messages: { role: 'user' | 'assistant'; content: string }[],
    book: string,
    chapter: number,
    selectedVerse: string | null,
  ): Promise<string> {
    const ai = getClient();
    const systemContext = `You are a biblical study assistant. The user is reading ${book} chapter ${chapter}${selectedVerse ? `, currently looking at: "${selectedVerse}"` : ''}. Provide insightful, theologically grounded answers. When citing scripture, use the format Book Chapter:Verse.`;
    const contents = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemContext}\n\n${contents}\nAssistant:`,
      config: { temperature: 0.7, maxOutputTokens: 1200 },
    });
    return response.text ?? 'Unable to generate response.';
  },

  async generateMorningCard(
    verseText: string,
    reference: string,
    style: string,
  ): Promise<{ devotional: string; prayer: string; imageBase64: string | null }> {
    const ai = getClient();
    const stylePrompts: Record<string, string> = {
      Ethereal: 'ethereal, peaceful, soft light, heavenly atmosphere, soft watercolor',
      Ancient: 'ancient parchment textures, warm earthy tones, historical oil painting',
      Nature: 'beautiful serene nature landscape, morning sun, mountains or quiet waters',
      Modern: 'minimalist abstract gradient, clean lines, contemporary spiritual art',
    };
    const [textRes, imageRes] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a 3-sentence morning devotional reflection for "${verseText}" (${reference}). Then write a short one-sentence prayer. Format as JSON: {"devotional": "...", "prayer": "..."}`,
        config: { temperature: 0.8, maxOutputTokens: 400 },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Beautiful inspirational background for: "${verseText}". Style: ${stylePrompts[style] ?? stylePrompts.Ethereal}. NO TEXT.` }] },
        config: { imageConfig: { aspectRatio: '1:1' } },
      }),
    ]);
    let devotional = '', prayer = '';
    try {
      const raw = textRes.text?.replace(/```json\n?|\n?```/g, '') ?? '{}';
      const parsed = JSON.parse(raw);
      devotional = parsed.devotional ?? ''; prayer = parsed.prayer ?? '';
    } catch { devotional = textRes.text ?? ''; }
    let imageBase64: string | null = null;
    for (const part of imageRes.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) { imageBase64 = `data:image/png;base64,${part.inlineData.data}`; break; }
    }
    return { devotional, prayer, imageBase64 };
  },

  async generateDevotional(verseText: string, reference: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a 300-word devotional based on "${verseText}" (${reference}). Include: opening reflection, life application, and closing encouragement.`,
      config: { temperature: 0.8, maxOutputTokens: 600 },
    });
    return response.text ?? 'Unable to generate devotional.';
  },

  async generateSermonOutline(verseText: string, reference: string, theme: string): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a 3-point sermon outline for "${verseText}" (${reference}) on the theme of "${theme}". Include: title, introduction hook, 3 main points with sub-points, illustrations for each point, and conclusion call to action.`,
      config: { temperature: 0.7, maxOutputTokens: 1000 },
    });
    return response.text ?? 'Unable to generate sermon outline.';
  },

  async generateDiscussionQuestions(book: string, chapter: number, verseText?: string): Promise<string[]> {
    const ai = getClient();
    const context = verseText ? `"${verseText}" and ` : '';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 6 thought-provoking small group discussion questions for ${context}${book} chapter ${chapter}. Make them practical and suitable for diverse groups. Return as a JSON array of strings.`,
      config: { temperature: 0.7, maxOutputTokens: 600 },
    });
    try {
      const raw = response.text?.replace(/```json\n?|\n?```/g, '') ?? '[]';
      return JSON.parse(raw);
    } catch {
      return (response.text ?? '').split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, ''));
    }
  },

  async generatePrayer(verseText: string, reference: string, prayerType: 'gratitude' | 'intercession' | 'confession' | 'praise'): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a heartfelt ${prayerType} prayer (150-200 words) inspired by "${verseText}" (${reference}).`,
      config: { temperature: 0.8, maxOutputTokens: 400 },
    });
    return response.text ?? 'Unable to generate prayer.';
  },

  async generateReadingPlan(
    goal: string,
    durationDays: number,
    currentBook?: string,
  ): Promise<{ title: string; description: string; days: { day: number; book: string; chapters: string }[] }> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a ${durationDays}-day Bible reading plan for someone who wants to: "${goal}"${currentBook ? ` (currently reading ${currentBook})` : ''}. Return as JSON: {"title": "...", "description": "...", "days": [{"day": 1, "book": "John", "chapters": "1-3"}, ...]}. Keep it achievable (1-3 chapters per day).`,
      config: { temperature: 0.7, maxOutputTokens: 2000 },
    });
    try {
      const raw = response.text?.replace(/```json\n?|\n?```/g, '') ?? '{}';
      return JSON.parse(raw);
    } catch {
      return { title: 'Custom Reading Plan', description: goal, days: [] };
    }
  },
```

- [ ] **Step 2: Commit**

```bash
git add lib/gemini/service.ts
git commit -m "feat: add premium AI methods to gemini service"
```

---

### Task 10: Premium AI API routes

**Files:**
- Create: `app/api/ai/assistant/route.ts`
- Create: `app/api/ai/devotional/route.ts`
- Create: `app/api/ai/sermon-outline/route.ts`
- Create: `app/api/ai/discussion-questions/route.ts`
- Create: `app/api/ai/prayer/route.ts`
- Create: `app/api/ai/reading-plan/route.ts`

- [ ] **Step 1: Create a shared premium auth helper**

```typescript
// lib/auth/require-premium.ts
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

type PremiumCheckResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function requirePremium(): Promise<PremiumCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id).single();

  const paid = isPremium(sub ? {
    id: '', userId: user.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null,
  } : null);

  if (!paid) return { ok: false, response: NextResponse.json({ error: 'Premium subscription required.' }, { status: 403 }) };

  return { ok: true, user };
}
```

- [ ] **Step 2: Create Study Assistant route**

```typescript
// app/api/ai/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { messages, book, chapter, selectedVerse, sessionId } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    book: string;
    chapter: number;
    selectedVerse: string | null;
    sessionId: string | null;
  };

  if (!messages?.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

  const supabase = await createClient();

  // Persist session + messages
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const { data: session } = await supabase
      .from('chat_sessions').insert({ user_id: check.user.id, book, chapter }).select('id').single();
    activeSessionId = session?.id ?? null;
  }

  if (activeSessionId) {
    const lastMsg = messages[messages.length - 1];
    await supabase.from('chat_messages').insert({
      session_id: activeSessionId, role: lastMsg.role, content: lastMsg.content,
    });
  }

  const reply = await geminiService.studyAssistant(messages, book, chapter, selectedVerse);

  if (activeSessionId) {
    await supabase.from('chat_messages').insert({
      session_id: activeSessionId, role: 'assistant', content: reply,
    });
  }

  return NextResponse.json({ reply, sessionId: activeSessionId });
}
```

- [ ] **Step 3: Create devotional route**

```typescript
// app/api/ai/devotional/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference } = await req.json() as { verseText: string; reference: string };
  if (!verseText || !reference) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const devotional = await geminiService.generateDevotional(verseText, reference);
  return NextResponse.json({ devotional });
}
```

- [ ] **Step 4: Create sermon outline route**

```typescript
// app/api/ai/sermon-outline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, theme } = await req.json() as {
    verseText: string; reference: string; theme: string;
  };
  if (!verseText || !reference || !theme) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const outline = await geminiService.generateSermonOutline(verseText, reference, theme);
  return NextResponse.json({ outline });
}
```

- [ ] **Step 5: Create discussion questions route**

```typescript
// app/api/ai/discussion-questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { book, chapter, verseText } = await req.json() as {
    book: string; chapter: number; verseText?: string;
  };
  if (!book || !chapter) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const questions = await geminiService.generateDiscussionQuestions(book, chapter, verseText);
  return NextResponse.json({ questions });
}
```

- [ ] **Step 6: Create prayer route**

```typescript
// app/api/ai/prayer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, prayerType } = await req.json() as {
    verseText: string; reference: string;
    prayerType: 'gratitude' | 'intercession' | 'confession' | 'praise';
  };
  if (!verseText || !reference || !prayerType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const prayer = await geminiService.generatePrayer(verseText, reference, prayerType);
  return NextResponse.json({ prayer });
}
```

- [ ] **Step 7: Create reading plan route**

```typescript
// app/api/ai/reading-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { goal, durationDays, currentBook } = await req.json() as {
    goal: string; durationDays: number; currentBook?: string;
  };
  if (!goal || !durationDays) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const plan = await geminiService.generateReadingPlan(goal, durationDays, currentBook);
  return NextResponse.json({ plan });
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/auth/ app/api/ai/assistant/ app/api/ai/devotional/ app/api/ai/sermon-outline/ app/api/ai/discussion-questions/ app/api/ai/prayer/ app/api/ai/reading-plan/
git commit -m "feat: add premium AI routes (assistant, devotional, sermon, discussion, prayer, reading-plan)"
```

---

### Task 11: Morning Card API route

**Files:**
- Create: `app/api/ai/morning-card/route.ts`

- [ ] **Step 1: Create morning card route**

```typescript
// app/api/ai/morning-card/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, book, chapter, verse, style } = await req.json() as {
    verseText: string; reference: string; book: string; chapter: number; verse: number; style: string;
  };
  if (!verseText || !reference || !style) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { devotional, prayer, imageBase64 } = await geminiService.generateMorningCard(verseText, reference, style);

  // Save to morning_cards table
  const supabase = await createClient();
  await supabase.from('morning_cards').insert({
    user_id: check.user.id,
    book, chapter, verse,
    devotional_text: devotional,
    image_url: imageBase64 ? 'generated' : null,
  });

  return NextResponse.json({ devotional, prayer, imageBase64 });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/ai/morning-card/
git commit -m "feat: add morning card API route"
```

---

### Task 12: AI Study Assistant Panel Component

**Files:**
- Create: `components/reader/panel-study-assistant.tsx`
- Modify: `components/reader/right-panel.tsx`

- [ ] **Step 1: Create study assistant panel**

```typescript
// components/reader/panel-study-assistant.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { Verse } from '@/types';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props {
  book: string;
  chapter: number;
  selectedVerse: Verse | null;
}

const STARTER_QUESTIONS = [
  'What is the main theme of this chapter?',
  'What does this teach about prayer?',
  'How should I apply this today?',
];

export function PanelStudyAssistant({ book, chapter, selectedVerse }: Props) {
  const { isPaid } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          book, chapter,
          selectedVerse: selectedVerse?.text ?? null,
          sessionId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.sessionId) setSessionId(data.sessionId);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    }
    setLoading(false);
  }

  if (!isPaid) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-4">
          <span className="text-4xl">🤖</span>
          <div>
            <p className="font-semibold text-stone-800 mb-1">AI Study Assistant</p>
            <p className="text-sm text-stone-500">Ask anything about the Bible. Context-aware, theologically grounded.</p>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
          >
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && (
          <UpgradeModal
            featureName="AI Study Assistant"
            featureDescription="Ask anything about the Bible. Context-aware answers that know what you're reading."
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 mb-3">Reading {book} {chapter} — ask anything:</p>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left text-xs p-3 rounded-lg bg-stone-50 border border-stone-200 hover:bg-amber-50 hover:border-amber-200 transition text-stone-700"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm rounded-xl p-3 ${msg.role === 'user' ? 'bg-amber-50 text-amber-900 ml-4' : 'bg-stone-100 text-stone-800 mr-4'}`}>
            <p className="text-xs font-semibold mb-1 opacity-60">{msg.role === 'user' ? 'You' : 'Assistant'}</p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bg-stone-100 rounded-xl p-3 mr-4 text-sm text-stone-500 animate-pulse">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2 pt-3 border-t border-stone-100">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about this passage…"
          className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update right panel to add Study Assistant tab**

```typescript
// components/reader/right-panel.tsx
'use client';
import { Verse, Note, Highlight } from '@/types';
import { PanelAI } from './panel-ai';
import { PanelNotes } from './panel-notes';
import { PanelTools } from './panel-tools';
import { PanelStudyAssistant } from './panel-study-assistant';
import { useTheme } from '@/components/providers/theme-provider';

export type PanelTab = 'ai' | 'notes' | 'tools' | 'study';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  selectedVerse: Verse | null;
  verses: Verse[];
  book: string;
  chapter: number;
  highlights: Highlight[];
  notes: Note[];
  onHighlight: (verse: Verse, color: string) => void;
  onSaveNote: (verse: Verse, content: string) => void;
  onDeleteNote: (verseId: string) => void;
  onEditNote: (verseId: string) => void;
}

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: 'ai', label: 'AI', icon: '✦' },
  { id: 'study', label: 'Chat', icon: '💬' },
  { id: 'notes', label: 'Notes', icon: '✎' },
  { id: 'tools', label: 'Tools', icon: '⚙' },
];

export function RightPanel({
  isOpen, onToggle, activeTab, onTabChange,
  selectedVerse, verses, book, chapter,
  highlights, notes, onHighlight, onSaveNote, onDeleteNote, onEditNote,
}: RightPanelProps) {
  const { prefs } = useTheme();
  return (
    <aside
      className={`relative flex-shrink-0 border-l border-stone-200 transition-all duration-200 flex flex-col ${
        isOpen ? 'w-80' : 'w-10'
      } ${prefs.theme === 'dark' ? 'bg-zinc-900' : prefs.theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}
    >
      <button
        onClick={onToggle}
        className="absolute -left-3 top-6 z-10 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-stone-50 transition text-stone-500"
        aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {isOpen ? '‹' : '›'}
      </button>

      {!isOpen && (
        <div className="flex flex-col items-center pt-14 gap-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); onToggle(); }}
              title={tab.label}
              aria-label={tab.label}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 transition text-sm"
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <>
          <div className="flex border-b border-stone-200 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                  activeTab === tab.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'ai' && <PanelAI selectedVerse={selectedVerse} book={book} chapter={chapter} />}
            {activeTab === 'study' && <PanelStudyAssistant book={book} chapter={chapter} selectedVerse={selectedVerse} />}
            {activeTab === 'notes' && (
              <PanelNotes
                selectedVerse={selectedVerse} verses={verses}
                highlights={highlights} notes={notes}
                onHighlight={onHighlight} onSaveNote={onSaveNote}
                onDeleteNote={onDeleteNote} onEditNote={onEditNote}
              />
            )}
            {activeTab === 'tools' && <PanelTools book={book} chapter={chapter} />}
          </div>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/reader/panel-study-assistant.tsx components/reader/right-panel.tsx
git commit -m "feat: add Study Assistant chat panel to right panel"
```

---

### Task 13: Morning Card Studio

**Files:**
- Create: `components/morning-card/card-studio.tsx`
- Create: `app/(app)/morning-card/page.tsx`

- [ ] **Step 1: Create card studio component**

```typescript
// components/morning-card/card-studio.tsx
'use client';
import { useState } from 'react';

const STYLES = ['Ethereal', 'Ancient', 'Nature', 'Modern'] as const;
type CardStyle = typeof STYLES[number];

interface CardData {
  verseText: string;
  reference: string;
  devotional: string;
  prayer: string;
  imageBase64: string | null;
  style: CardStyle;
}

export function CardStudio({ book, chapter, verse }: { book: string; chapter: number; verse: number }) {
  const [verseText, setVerseText] = useState('');
  const [reference, setReference] = useState(`${book} ${chapter}:${verse}`);
  const [style, setStyle] = useState<CardStyle>('Ethereal');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!verseText.trim()) { setError('Please enter verse text first.'); return; }
    setLoading(true); setError(''); setCard(null);
    try {
      const res = await fetch('/api/ai/morning-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseText, reference, book, chapter, verse, style }),
      });
      const data = await res.json();
      if (res.ok) {
        setCard({ verseText, reference, devotional: data.devotional, prayer: data.prayer, imageBase64: data.imageBase64, style });
      } else { setError(data.error || 'Generation failed.'); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  function downloadCard(format: 'square' | 'story' | 'whatsapp') {
    if (!card) return;
    const canvas = document.createElement('canvas');
    const sizes = { square: [1080, 1080], story: [1080, 1920], whatsapp: [800, 800] };
    const [w, h] = sizes[format];
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const drawCard = () => {
      // Background
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h);

      if (card.imageBase64) {
        const img = new Image(); img.src = card.imageBase64;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h);
          // Overlay
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, w, h);
          drawText(); finishDownload();
        };
      } else { drawText(); finishDownload(); }
    };

    const drawText = () => {
      const pad = w * 0.08;
      ctx.textAlign = 'center';
      // Verse
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${w * 0.045}px Georgia, serif`;
      const words = card.verseText.split(' ');
      let line = ''; const lines: string[] = []; const maxW = w - pad * 2;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
        else { line = test; }
      }
      if (line) lines.push(line.trim());
      const lineH = w * 0.055; const startY = h * 0.38 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH));
      // Reference
      ctx.fillStyle = '#f4d03f'; ctx.font = `${w * 0.032}px Georgia, serif`;
      ctx.fillText(`— ${card.reference}`, w / 2, startY + lines.length * lineH + w * 0.03);
      // Devotional
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `${w * 0.026}px Arial, sans-serif`;
      ctx.fillText(card.devotional.slice(0, 120) + '…', w / 2, h * 0.72);
    };

    const finishDownload = () => {
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = `morning-card-${format}.png`; a.click();
    };

    drawCard();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Controls */}
      <div className="lg:w-80 flex-shrink-0 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Verse Text</label>
          <textarea
            value={verseText}
            onChange={e => setVerseText(e.target.value)}
            placeholder="Paste or type the verse…"
            rows={4}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Reference</label>
          <input
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Background Style</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`py-2 text-sm rounded-lg border transition ${style === s ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 hover:border-amber-400'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          {loading ? '✦ Generating…' : '✦ Generate Card'}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="flex-1">
        {!card && !loading && (
          <div className="h-64 lg:h-full border-2 border-dashed border-stone-200 rounded-2xl flex items-center justify-center text-stone-400 text-sm">
            Your morning card will appear here
          </div>
        )}
        {loading && (
          <div className="h-64 lg:h-full border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 gap-3">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Creating your card…</p>
          </div>
        )}
        {card && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-square relative bg-stone-900">
              {card.imageBase64 && (
                <img src={card.imageBase64} alt="Card background" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-white font-serif text-lg leading-relaxed mb-3">"{card.verseText}"</p>
                <p className="text-amber-300 text-sm font-medium">— {card.reference}</p>
                {card.devotional && <p className="text-white/70 text-xs mt-4 leading-relaxed">{card.devotional.slice(0, 100)}…</p>}
              </div>
            </div>
            {card.prayer && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Prayer</p>
                <p className="text-sm text-amber-900">{card.prayer}</p>
              </div>
            )}
            <div className="flex gap-2">
              {(['square', 'story', 'whatsapp'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => downloadCard(f)}
                  className="flex-1 py-2 border border-stone-300 rounded-lg text-xs font-medium hover:bg-stone-50 transition capitalize"
                >
                  ↓ {f === 'story' ? 'Story' : f === 'square' ? 'Instagram' : 'WhatsApp'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Morning Card page**

```typescript
// app/(app)/morning-card/page.tsx
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { redirect } from 'next/navigation';
import { CardStudio } from '@/components/morning-card/card-studio';

export default async function MorningCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).single();

  const paid = isPremium(sub ? {
    id: '', userId: user.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null,
  } : null);

  if (!paid) redirect('/pricing?feature=morning-card');

  return (
    <div className="max-w-5xl mx-auto p-8 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-serif text-stone-800">Good Morning Card Studio</h1>
        <p className="text-stone-500 text-sm">Create beautiful scripture cards to share and inspire</p>
      </div>
      <div className="flex-1 min-h-0">
        <CardStudio book="Psalms" chapter={23} verse={1} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/morning-card/ app/(app)/morning-card/
git commit -m "feat: add Morning Card Studio page and card generator component"
```

---

## Phase 3: Study Tools

---

### Task 14: SOAP Journal API and component

**Files:**
- Create: `app/api/soap/route.ts`
- Create: `components/study/soap-journal.tsx`
- Test: `__tests__/api/soap.test.ts`

- [ ] **Step 1: Write failing SOAP API test**

```typescript
// __tests__/api/soap.test.ts
// Test the SOAP route auth guard
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

describe('SOAP route', () => {
  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('@/app/api/soap/route');
    const req = new NextRequest('http://localhost/api/soap?book=John&chapter=3');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="soap" --no-coverage
```

Expected: FAIL — module not found

- [ ] **Step 3: Create SOAP API route**

```typescript
// app/api/soap/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book');
  const chapter = searchParams.get('chapter');

  let query = supabase.from('soap_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (book) query = query.eq('book', book);
  if (chapter) query = query.eq('chapter', Number(chapter));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    book: string; chapter: number; verse?: number;
    scripture: string; observation?: string; application?: string; prayer?: string;
  };
  if (!body.book || !body.chapter || !body.scripture) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase.from('soap_entries').insert({
    user_id: user.id,
    book: body.book, chapter: body.chapter, verse: body.verse ?? null,
    scripture: body.scripture,
    observation: body.observation ?? '',
    application: body.application ?? '',
    prayer: body.prayer ?? '',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...updates } = await req.json() as {
    id: string; observation?: string; application?: string; prayer?: string;
  };
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await supabase.from('soap_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).eq('user_id', user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('soap_entries').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="soap" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create SOAP journal component**

```typescript
// components/study/soap-journal.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface SoapEntry {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  scripture: string;
  observation: string;
  application: string;
  prayer: string;
  created_at: string;
}

interface Props {
  book: string;
  chapter: number;
  verse?: number;
  verseText?: string;
}

export function SoapJournal({ book, chapter, verse, verseText }: Props) {
  const { isPaid } = useSubscription();
  const [entries, setEntries] = useState<SoapEntry[]>([]);
  const [form, setForm] = useState({ scripture: verseText ?? '', observation: '', application: '', prayer: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isPaid) return;
    setLoading(true);
    fetch(`/api/soap?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [book, chapter, isPaid]);

  async function save() {
    if (!form.scripture.trim()) return;
    setSaving(true);
    const method = editingId ? 'PATCH' : 'POST';
    const body = editingId ? { id: editingId, ...form } : { book, chapter, verse, ...form };
    const res = await fetch('/api/soap', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const { entry } = await res.json();
      if (editingId) {
        setEntries(prev => prev.map(e => e.id === editingId ? entry : e));
      } else {
        setEntries(prev => [entry, ...prev]);
      }
      setForm({ scripture: '', observation: '', application: '', prayer: '' });
      setEditingId(null);
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/soap?id=${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function aiPreFill() {
    if (!form.scripture) return;
    setAiLoading(true);
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: form.scripture, reference: `${book} ${chapter}${verse ? ':' + verse : ''}` }),
    });
    const { explanation } = await res.json();
    if (explanation) setForm(f => ({ ...f, observation: explanation }));
    setAiLoading(false);
  }

  if (!isPaid) {
    return (
      <>
        <div className="text-center p-6 space-y-3">
          <span className="text-3xl">📖</span>
          <p className="font-semibold text-stone-800">SOAP Journaling</p>
          <p className="text-sm text-stone-500">Scripture · Observation · Application · Prayer</p>
          <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && <UpgradeModal featureName="SOAP Journaling" featureDescription="A structured journaling method to deepen your daily Bible study." onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">New Journal Entry</h3>
        {[
          { key: 'scripture', label: 'S — Scripture', placeholder: 'The verse or passage…', rows: 3 },
          { key: 'observation', label: 'O — Observation', placeholder: 'What does it say?', rows: 3 },
          { key: 'application', label: 'A — Application', placeholder: 'How does it apply to my life?', rows: 3 },
          { key: 'prayer', label: 'P — Prayer', placeholder: 'My prayer in response…', rows: 3 },
        ].map(field => (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">{field.label}</label>
              {field.key === 'observation' && (
                <button onClick={aiPreFill} disabled={aiLoading} className="text-xs text-amber-600 hover:underline disabled:opacity-50">
                  {aiLoading ? 'Loading…' : '✦ AI pre-fill'}
                </button>
              )}
            </div>
            <textarea
              value={form[field.key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              rows={field.rows}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={saving || !form.scripture.trim()}
          className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>

      {/* Past entries */}
      {loading ? <p className="text-sm text-stone-400">Loading entries…</p> : entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Past Entries — {book} {chapter}</h3>
          {entries.map(entry => (
            <div key={entry.id} className="border border-stone-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-xs text-stone-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ scripture: entry.scripture, observation: entry.observation, application: entry.application, prayer: entry.prayer }); setEditingId(entry.id); }} className="text-xs text-amber-600 hover:underline">Edit</button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                </div>
              </div>
              <p className="text-stone-700 italic">"{entry.scripture}"</p>
              {entry.observation && <p className="text-stone-600"><span className="font-semibold">O:</span> {entry.observation}</p>}
              {entry.application && <p className="text-stone-600"><span className="font-semibold">A:</span> {entry.application}</p>}
              {entry.prayer && <p className="text-stone-600"><span className="font-semibold">P:</span> {entry.prayer}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/soap/ components/study/soap-journal.tsx __tests__/api/soap.test.ts
git commit -m "feat: add SOAP journaling API and component"
```

---

### Task 15: Scripture Memory API and Flashcard component

**Files:**
- Create: `app/api/memory/route.ts`
- Create: `components/study/memory-flashcard.tsx`
- Test: `__tests__/api/memory.test.ts`

- [ ] **Step 1: Write failing SM-2 test**

```typescript
// __tests__/api/memory.test.ts
import { sm2 } from '@/lib/sm2';

describe('SM-2 algorithm', () => {
  it('easy answer: increases interval and ease_factor', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 1 }, 5);
    expect(result.intervalDays).toBeGreaterThan(1);
    expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it('hard answer (quality=1): resets interval to 1', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 10 }, 1);
    expect(result.intervalDays).toBe(1);
  });

  it('ease_factor never goes below 1.3', () => {
    let state = { easeFactor: 2.5, intervalDays: 1 };
    for (let i = 0; i < 20; i++) { state = sm2(state, 0); }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('quality=3: minimal passing grade passes', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 1 }, 3);
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="memory" --no-coverage
```

Expected: FAIL — `@/lib/sm2` not found

- [ ] **Step 3: Create SM-2 algorithm library**

```typescript
// lib/sm2.ts
/** SM-2 spaced repetition algorithm.
 * quality: 0-5 (0=blackout, 3=correct with difficulty, 5=perfect recall)
 * Returns updated ease_factor and interval_days.
 */
export function sm2(
  state: { easeFactor: number; intervalDays: number },
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): { easeFactor: number; intervalDays: number } {
  let { easeFactor, intervalDays } = state;

  if (quality >= 3) {
    // Passed
    if (intervalDays === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    easeFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  } else {
    // Failed — reset
    intervalDays = 1;
  }

  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, intervalDays };
}

export function nextReviewDate(intervalDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().split('T')[0];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="memory" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create memory API route**

```typescript
// app/api/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { sm2, nextReviewDate } from '@/lib/sm2';

// GET /api/memory — list due cards (or all cards if ?all=true)
export async function GET(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true';
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('memory_verses').select('*').eq('user_id', check.user.id).order('next_review');
  if (!all) query = query.lte('next_review', today);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verses: data });
}

// POST /api/memory — add verse to memory
export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { book, chapter, verse, verseText, translation } = await req.json() as {
    book: string; chapter: number; verse: number; verseText: string; translation: string;
  };
  if (!book || !chapter || !verse || !verseText) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  // Check for duplicate
  const { data: existing } = await supabase
    .from('memory_verses').select('id').eq('user_id', check.user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse).single();
  if (existing) return NextResponse.json({ error: 'Verse already in memory list' }, { status: 409 });

  const { data, error } = await supabase.from('memory_verses').insert({
    user_id: check.user.id, book, chapter, verse, verse_text: verseText, translation,
    ease_factor: 2.5, interval_days: 1, next_review: new Date().toISOString().split('T')[0],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data }, { status: 201 });
}

// PATCH /api/memory — submit a review (SM-2)
export async function PATCH(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { id, quality } = await req.json() as { id: string; quality: 0 | 1 | 2 | 3 | 4 | 5 };
  if (!id || quality === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: existing } = await supabase
    .from('memory_verses').select('ease_factor, interval_days, total_reviews').eq('id', id).eq('user_id', check.user.id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { easeFactor, intervalDays } = sm2(
    { easeFactor: existing.ease_factor, intervalDays: existing.interval_days },
    quality,
  );

  const { data, error } = await supabase.from('memory_verses').update({
    ease_factor: easeFactor,
    interval_days: intervalDays,
    next_review: nextReviewDate(intervalDays),
    total_reviews: (existing.total_reviews ?? 0) + 1,
  }).eq('id', id).eq('user_id', check.user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data });
}

// DELETE /api/memory?id=...
export async function DELETE(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('memory_verses').delete().eq('id', id).eq('user_id', check.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Create memory flashcard component**

```typescript
// components/study/memory-flashcard.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface MemoryVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  verse_text: string;
  translation: string;
  next_review: string;
  total_reviews: number;
  interval_days: number;
}

export function MemoryFlashcards() {
  const { isPaid } = useSubscription();
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isPaid) return;
    setLoading(true);
    fetch('/api/memory').then(r => r.json()).then(d => { setVerses(d.verses ?? []); setLoading(false); });
  }, [isPaid]);

  const current = verses[currentIdx];

  async function submitReview(quality: 0 | 1 | 2 | 3 | 4 | 5) {
    if (!current || reviewing) return;
    setReviewing(true);
    await fetch('/api/memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id, quality }),
    });
    setFlipped(false);
    setReviewing(false);
    if (currentIdx + 1 >= verses.length) { setDone(true); }
    else { setCurrentIdx(i => i + 1); }
  }

  if (!isPaid) {
    return (
      <>
        <div className="text-center p-6 space-y-3">
          <span className="text-3xl">🧠</span>
          <p className="font-semibold text-stone-800">Scripture Memory</p>
          <p className="text-sm text-stone-500">Memorize Bible verses with spaced repetition. Add any verse and review cards daily.</p>
          <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && <UpgradeModal featureName="Scripture Memory" featureDescription="Memorize Bible verses effortlessly with daily spaced repetition flashcards." onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  if (loading) return <p className="text-sm text-stone-400 p-4">Loading cards…</p>;

  if (verses.length === 0) {
    return (
      <div className="text-center p-8 space-y-2">
        <span className="text-3xl">📚</span>
        <p className="font-semibold text-stone-700">No cards due for review</p>
        <p className="text-sm text-stone-400">Add verses using the "Memory" button on any verse in the reader.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center p-8 space-y-3">
        <span className="text-4xl">🎉</span>
        <p className="font-bold text-stone-800 text-lg">Session complete!</p>
        <p className="text-sm text-stone-500">Reviewed {verses.length} verse{verses.length !== 1 ? 's' : ''}. Great work!</p>
        <button onClick={() => { setCurrentIdx(0); setDone(false); setFlipped(false); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
          Review Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs text-stone-400">
        <span>{currentIdx + 1} / {verses.length} due today</span>
        <span>{current.total_reviews} review{current.total_reviews !== 1 ? 's' : ''} total</span>
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[200px] rounded-2xl border-2 border-stone-200 p-6 text-center flex flex-col items-center justify-center gap-3 hover:border-amber-300 transition cursor-pointer bg-stone-50"
      >
        {!flipped ? (
          <>
            <p className="text-sm font-semibold text-amber-700">{current.book} {current.chapter}:{current.verse}</p>
            <p className="text-xs text-stone-400 mt-2">Tap to reveal the verse</p>
          </>
        ) : (
          <>
            <p className="text-stone-800 leading-relaxed text-sm">"{current.verse_text}"</p>
            <p className="text-xs text-stone-400">{current.translation}</p>
          </>
        )}
      </button>

      {/* Review buttons */}
      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Again', quality: 1, color: 'border-red-300 text-red-600 hover:bg-red-50' },
            { label: 'Hard', quality: 3, color: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
            { label: 'Easy', quality: 5, color: 'border-green-300 text-green-600 hover:bg-green-50' },
          ] as const).map(btn => (
            <button
              key={btn.label}
              onClick={() => submitReview(btn.quality as 0 | 1 | 2 | 3 | 4 | 5)}
              disabled={reviewing}
              className={`py-2 border-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/sm2.ts app/api/memory/ components/study/memory-flashcard.tsx __tests__/api/memory.test.ts
git commit -m "feat: add scripture memory with SM-2 spaced repetition"
```

---

### Task 16: Reading Analytics API and Component

**Files:**
- Create: `app/api/analytics/route.ts`
- Create: `components/dashboard/analytics-widget.tsx`

- [ ] **Step 1: Create analytics API route**

```typescript
// app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [progressRes, highlightRes, notesRes] = await Promise.all([
    supabase.from('reading_progress').select('book, chapter, completed_at').eq('user_id', user.id),
    supabase.from('highlights').select('book').eq('user_id', user.id),
    supabase.from('notes').select('book').eq('user_id', user.id),
  ]);

  const progress = progressRes.data ?? [];
  const highlights = highlightRes.data ?? [];
  const notes = notesRes.data ?? [];

  // Build last-90-days calendar
  const today = new Date();
  const calendarMap: Record<string, number> = {};
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    calendarMap[d.toISOString().split('T')[0]] = 0;
  }
  for (const p of progress) {
    const day = p.completed_at?.split('T')[0];
    if (day && calendarMap[day] !== undefined) calendarMap[day]++;
  }

  // Streak
  let streak = 0;
  const sortedDays = Object.keys(calendarMap).sort().reverse();
  for (const day of sortedDays) {
    if (calendarMap[day] > 0) streak++;
    else break;
  }

  // Book counts
  const bookCounts: Record<string, number> = {};
  for (const p of progress) {
    bookCounts[p.book] = (bookCounts[p.book] ?? 0) + 1;
  }
  const topBooks = Object.entries(bookCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([book, chapters]) => ({ book, chapters }));

  return NextResponse.json({
    totalChapters: progress.length,
    totalHighlights: highlights.length,
    totalNotes: notes.length,
    streak,
    calendar: calendarMap,
    topBooks,
  });
}
```

- [ ] **Step 2: Create analytics widget component**

```typescript
// components/dashboard/analytics-widget.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';

interface AnalyticsData {
  totalChapters: number;
  totalHighlights: number;
  totalNotes: number;
  streak: number;
  calendar: Record<string, number>;
  topBooks: { book: string; chapters: number }[];
}

export function AnalyticsWidget() {
  const { isPaid } = useSubscription();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-stone-100 rounded-xl" />;
  if (!data) return null;

  const calDays = Object.entries(data.calendar);
  const maxCount = Math.max(...calDays.map(([, v]) => v), 1);

  function getColor(count: number): string {
    if (count === 0) return 'bg-stone-100';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.33) return 'bg-amber-200';
    if (intensity < 0.66) return 'bg-amber-400';
    return 'bg-amber-600';
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Chapters', value: data.totalChapters },
          { label: 'Day Streak', value: data.streak },
          { label: 'Highlights', value: data.totalHighlights },
          { label: 'Notes', value: data.totalNotes },
        ].map(s => (
          <div key={s.label} className="bg-stone-50 rounded-xl p-3 text-center border border-stone-200">
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Streak calendar — last 90 days */}
      {isPaid && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Reading Activity (90 days)</p>
          <div className="flex flex-wrap gap-1">
            {calDays.map(([date, count]) => (
              <div
                key={date}
                title={`${date}: ${count} chapter${count !== 1 ? 's' : ''}`}
                className={`w-3 h-3 rounded-sm ${getColor(count)}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top books */}
      {data.topBooks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Most Read Books</p>
          <div className="space-y-2">
            {data.topBooks.map(({ book, chapters }) => (
              <div key={book} className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-24 truncate">{book}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(chapters / (data.topBooks[0]?.chapters ?? 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-stone-400">{chapters} ch</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/analytics/ components/dashboard/analytics-widget.tsx
git commit -m "feat: add reading analytics API and dashboard widget"
```

---

### Task 17: PDF Export API route

**Files:**
- Create: `app/api/export/route.ts`
- Create: `app/api/export/data/route.ts`

- [ ] **Step 1: Install react-pdf**

```bash
npm install @react-pdf/renderer
```

Expected: `added N packages`

- [ ] **Step 2: Create PDF export route**

```typescript
// app/api/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { createClient } from '@/lib/supabase/server';
import { bibleService } from '@/lib/bible/service';

// Generates a simple text-based PDF of a chapter with notes
export async function GET(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book') ?? 'John';
  const chapter = Number(searchParams.get('chapter') ?? '1');
  const translation = searchParams.get('translation') ?? 'web';

  const supabase = await createClient();
  const [verses, notesRes] = await Promise.all([
    bibleService.getChapter(book, chapter, translation),
    supabase.from('notes').select('verse, content').eq('user_id', check.user.id).eq('book', book).eq('chapter', chapter),
  ]);

  const notes = notesRes.data ?? [];
  const noteMap: Record<number, string> = {};
  for (const n of notes) { if (n.verse) noteMap[n.verse] = n.content; }

  // Build plain-text PDF content (no external lib needed for simple text)
  // Using @react-pdf/renderer
  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Times-Roman', fontSize: 11, color: '#1a1a1a' },
    title: { fontSize: 20, fontFamily: 'Times-Bold', marginBottom: 4 },
    translation: { fontSize: 9, color: '#888', marginBottom: 20 },
    verseRow: { flexDirection: 'row', marginBottom: 8 },
    verseNum: { width: 24, fontSize: 9, color: '#888', paddingTop: 1 },
    verseText: { flex: 1, lineHeight: 1.6 },
    noteText: { marginLeft: 24, marginTop: 2, marginBottom: 6, fontSize: 9, color: '#7c6432', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#d97706', paddingLeft: 6 },
  });

  const doc = (
    // @ts-expect-error — react-pdf JSX
    <Document>
      {/* @ts-expect-error */}
      <Page style={styles.page}>
        {/* @ts-expect-error */}
        <Text style={styles.title}>{book} {chapter}</Text>
        {/* @ts-expect-error */}
        <Text style={styles.translation}>{translation.toUpperCase()} Translation · Exported from Scripture Stream</Text>
        {verses.map(v => (
          // @ts-expect-error
          <View key={v.id}>
            {/* @ts-expect-error */}
            <View style={styles.verseRow}>
              {/* @ts-expect-error */}
              <Text style={styles.verseNum}>{v.number}</Text>
              {/* @ts-expect-error */}
              <Text style={styles.verseText}>{v.text}</Text>
            </View>
            {noteMap[v.number] && (
              // @ts-expect-error
              <Text style={styles.noteText}>✎ {noteMap[v.number]}</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${book}-${chapter}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Create data export route (JSON backup)**

```typescript
// app/api/export/data/route.ts
import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const uid = check.user.id;

  const [bookmarks, highlights, notes, progress, soap, memory] = await Promise.all([
    supabase.from('bookmarks').select('*').eq('user_id', uid),
    supabase.from('highlights').select('*').eq('user_id', uid),
    supabase.from('notes').select('*').eq('user_id', uid),
    supabase.from('reading_progress').select('*').eq('user_id', uid),
    supabase.from('soap_entries').select('*').eq('user_id', uid),
    supabase.from('memory_verses').select('*').eq('user_id', uid),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      bookmarks: bookmarks.data ?? [],
      highlights: highlights.data ?? [],
      notes: notes.data ?? [],
      readingProgress: progress.data ?? [],
      soapEntries: soap.data ?? [],
      memoryVerses: memory.data ?? [],
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scripture-stream-backup-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/export/ package.json package-lock.json
git commit -m "feat: add PDF chapter export and JSON data backup routes"
```

---

### Task 18: Cloud Sync for Paid Users

**Files:**
- Create: `lib/storage/cloud.ts`
- Modify: `components/reader/reader-view.tsx`

- [ ] **Step 1: Create cloud storage service**

```typescript
// lib/storage/cloud.ts
// CLIENT-SIDE Supabase operations for paid users' notes/highlights/bookmarks
import { createBrowserClient } from '@supabase/ssr';
import { Note, Highlight } from '@/types';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const cloudStore = {
  async getNotes(book: string, chapter: number): Promise<Note[]> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('notes').select('verse, content, updated_at').eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
    return (data ?? []).map(n => ({
      id: `cloud-${book}-${chapter}-${n.verse}`,
      verseId: `${book.toLowerCase()}-${chapter}-${n.verse}`,
      content: n.content,
      lastUpdated: new Date(n.updated_at).getTime(),
    }));
  },

  async saveNote(book: string, chapter: number, verse: number, content: string): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    if (!content.trim()) {
      await sb.from('notes').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse);
      return;
    }
    await sb.from('notes').upsert({ user_id: user.id, book, chapter, verse, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter,verse' });
  },

  async getHighlights(book: string, chapter: number): Promise<Highlight[]> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('highlights').select('verse, color').eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
    return (data ?? []).map(h => ({
      id: `cloud-${book}-${chapter}-${h.verse}`,
      verseId: `${book.toLowerCase()}-${chapter}-${h.verse}`,
      color: h.color,
    }));
  },

  async saveHighlight(book: string, chapter: number, verse: number, color: string): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    if (!color) {
      await sb.from('highlights').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse);
      return;
    }
    await sb.from('highlights').upsert({ user_id: user.id, book, chapter, verse, color }, { onConflict: 'user_id,book,chapter,verse' });
  },

  async markRead(book: string, chapter: number): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('reading_progress').upsert({ user_id: user.id, book, chapter, completed_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter' });
  },

  async unmarkRead(book: string, chapter: number): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('reading_progress').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
  },
};
```

- [ ] **Step 2: Update reader-view.tsx to accept isPremium and use cloud sync**

Replace the `ReaderViewProps` interface and update the file top section:

```typescript
// components/reader/reader-view.tsx — full replacement
'use client';
import { useState, useEffect } from 'react';
import { Verse, Highlight, Note, Translation } from '@/types';
import { bibleService } from '@/lib/bible/service';
import { localStore } from '@/lib/storage/local';
import { cloudStore } from '@/lib/storage/cloud';
import { DEFAULT_TRANSLATION } from '@/lib/constants';
import { ReaderHeader } from './reader-header';
import { Sidebar } from './sidebar';
import { LiveConversation } from './live-conversation';
import { RightPanel, PanelTab } from './right-panel';

interface ReaderViewProps {
  initialBook: string;
  initialChapter: number;
  isPremium: boolean;
}

export function ReaderView({ initialBook, initialChapter, isPremium }: ReaderViewProps) {
  const [book, setBook] = useState(initialBook);
  const [chapter, setChapter] = useState(initialChapter);
  const [translation, setTranslation] = useState<Translation>(DEFAULT_TRANSLATION);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLiveConvo, setShowLiveConvo] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>('ai');

  // Load notes and highlights for current chapter
  useEffect(() => {
    async function loadData() {
      if (isPremium) {
        const [n, h] = await Promise.all([
          cloudStore.getNotes(book, chapter),
          cloudStore.getHighlights(book, chapter),
        ]);
        setNotes(n); setHighlights(h);
      } else {
        setNotes(localStore.getNotes());
        setHighlights(localStore.getHighlights());
      }
    }
    loadData();
  }, [book, chapter, isPremium]);

  useEffect(() => {
    setLoading(true); setError(''); setSelectedVerse(null);
    bibleService.getChapter(book, chapter, translation)
      .then(v => { setVerses(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [book, chapter, translation]);

  async function handleHighlight(verse: Verse, color: string) {
    const verseNum = verse.number;
    const existing = highlights.find(h => h.verseId === verse.id);
    if (!color || (existing && existing.color === color)) {
      if (isPremium) { await cloudStore.saveHighlight(book, chapter, verseNum, ''); }
      else { localStore.removeHighlight(verse.id); }
    } else {
      if (isPremium) { await cloudStore.saveHighlight(book, chapter, verseNum, color); }
      else {
        if (existing) localStore.removeHighlight(verse.id);
        localStore.saveHighlight({ id: `hl-${verse.id}`, verseId: verse.id, color });
      }
    }
    if (isPremium) {
      const h = await cloudStore.getHighlights(book, chapter);
      setHighlights(h);
    } else {
      setHighlights(localStore.getHighlights());
    }
  }

  async function handleSaveNote(verse: Verse, content: string) {
    if (!content.trim()) return;
    if (isPremium) {
      await cloudStore.saveNote(book, chapter, verse.number, content);
      const n = await cloudStore.getNotes(book, chapter);
      setNotes(n);
    } else {
      localStore.saveNote({ id: `note-${verse.id}`, verseId: verse.id, content, lastUpdated: Date.now() });
      setNotes(localStore.getNotes());
    }
  }

  async function handleDeleteNote(verseId: string) {
    if (isPremium) {
      const verseNum = parseInt(verseId.split('-').pop() ?? '0');
      await cloudStore.saveNote(book, chapter, verseNum, '');
      const n = await cloudStore.getNotes(book, chapter);
      setNotes(n);
    } else {
      localStore.saveNote({ id: `note-${verseId}`, verseId, content: '', lastUpdated: Date.now() });
      setNotes(localStore.getNotes());
    }
  }

  function handleEditNote(verseId: string) {
    const verse = verses.find(v => v.id === verseId);
    if (verse) { setSelectedVerse(verse); setActiveTab('notes'); setPanelOpen(true); }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} currentBook={book} currentChapter={chapter} currentTranslation={translation} onTranslationChange={setTranslation} />

      <div className="flex flex-col flex-1 min-w-0">
        <ReaderHeader onMenuToggle={() => setSidebarOpen(o => !o)} onLiveStudy={() => setShowLiveConvo(true)} />
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">{book} {chapter}</h2>
            <div className="flex gap-2">
              <button onClick={() => setChapter(c => Math.max(1, c - 1))} className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition">← Prev</button>
              <button onClick={() => setChapter(c => c + 1)} className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition">Next →</button>
            </div>
          </div>

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
                {note?.content && (
                  <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{note.content}</p>
                )}
                {selectedVerse?.id === verse.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={e => { e.stopPropagation(); setActiveTab('ai'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition">✦ Explain</button>
                    <button onClick={e => { e.stopPropagation(); setActiveTab('notes'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition">✎ Note</button>
                    {isPremium && (
                      <button onClick={e => {
                        e.stopPropagation();
                        fetch('/api/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ book, chapter, verse: verse.number, verseText: verse.text, translation }) })
                          .then(r => r.json())
                          .then(d => { if (d.error) alert(d.error); else alert('Added to memory!'); });
                      }} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition">🧠 Memory</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      <RightPanel
        isOpen={panelOpen} onToggle={() => setPanelOpen(o => !o)}
        activeTab={activeTab} onTabChange={setActiveTab}
        selectedVerse={selectedVerse} verses={verses}
        book={book} chapter={chapter}
        highlights={highlights} notes={notes}
        onHighlight={handleHighlight} onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote} onEditNote={handleEditNote}
      />

      {showLiveConvo && (
        <LiveConversation currentBook={book} currentChapter={chapter} selectedVerse={selectedVerse ?? undefined} onClose={() => setShowLiveConvo(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update reader page to pass isPremium**

```typescript
// app/(app)/read/[book]/[chapter]/page.tsx — add isPremium prop
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { ReaderView } from '@/components/reader/reader-view';
import { notFound } from 'next/navigation';
import { BIBLE_BOOKS } from '@/lib/constants';

interface Props { params: Promise<{ book: string; chapter: string }> }

export default async function ReaderPage({ params }: Props) {
  const { book, chapter } = await params;
  const chapterNum = Number(chapter);
  if (isNaN(chapterNum) || chapterNum < 1) notFound();

  const decodedBook = decodeURIComponent(book);
  const bookDef = BIBLE_BOOKS.find(b => b.name.toLowerCase() === decodedBook.toLowerCase());
  if (!bookDef) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let paid = false;
  if (user) {
    const { data: sub } = await supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).single();
    paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);
  }

  return <ReaderView initialBook={bookDef.name} initialChapter={chapterNum} isPremium={paid} />;
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/storage/cloud.ts components/reader/reader-view.tsx app/(app)/read/
git commit -m "feat: add cloud sync for paid users in reader"
```

---

### Task 19: Study Page

**Files:**
- Create: `app/(app)/study/page.tsx`

- [ ] **Step 1: Create study page**

```typescript
// app/(app)/study/page.tsx
'use client';
import { useState } from 'react';
import { SoapJournal } from '@/components/study/soap-journal';
import { MemoryFlashcards } from '@/components/study/memory-flashcard';

type Tab = 'soap' | 'memory';

export default function StudyPage() {
  const [tab, setTab] = useState<Tab>('soap');

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-serif text-stone-800 mb-2">Study Tools</h1>
      <p className="text-stone-500 text-sm mb-6">Deepen your Bible study with journaling and scripture memorization.</p>

      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          { id: 'soap', label: '📖 SOAP Journal' },
          { id: 'memory', label: '🧠 Memory Cards' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'soap' && <SoapJournal book="John" chapter={3} />}
      {tab === 'memory' && <MemoryFlashcards />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/study/
git commit -m "feat: add study page with SOAP and memory tabs"
```

---

### Task 20: Dashboard Update

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update dashboard with analytics and quick actions**

```typescript
// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { AnalyticsWidget } from '@/components/dashboard/analytics-widget';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single();
  const { data: sub } = await supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user!.id).single();

  const paid = isPremium(sub ? {
    id: '', userId: user!.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null,
  } : null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif text-stone-800">
            {greeting}{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Continue your Bible study journey.</p>
        </div>
        {!paid && (
          <a href="/pricing" className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition">
            Upgrade →
          </a>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Reader', href: '/read/john/3', icon: '📖' },
          { label: 'Study Tools', href: '/study', icon: '✏️' },
          { label: 'Morning Card', href: paid ? '/morning-card' : '/pricing?feature=morning-card', icon: '🌅', premium: !paid },
          { label: 'Settings', href: '/settings', icon: '⚙️' },
        ].map(action => (
          <a
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-stone-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition text-center"
          >
            <span className="text-2xl">{action.icon}</span>
            <span className="text-sm font-medium text-stone-700">{action.label}</span>
            {action.premium && <span className="text-xs text-amber-600">🔒 Premium</span>}
          </a>
        ))}
      </div>

      {/* Analytics */}
      <div>
        <h2 className="text-lg font-serif text-stone-800 mb-4">Your Reading Stats</h2>
        <AnalyticsWidget />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/dashboard/page.tsx
git commit -m "feat: update dashboard with analytics widget and quick action cards"
```

---

### Task 21: Navigation links in header/sidebar

**Files:**
- Modify: `components/reader/reader-header.tsx`

- [ ] **Step 1: Read current reader-header**

Check current content of `components/reader/reader-header.tsx` and add navigation links for Dashboard, Study, Morning Card, Settings.

- [ ] **Step 2: Update reader-header to include nav links**

```typescript
// components/reader/reader-header.tsx — replace current content
'use client';
import { useTheme } from '@/components/providers/theme-provider';
import { useSubscription } from '@/components/providers/subscription-provider';

interface ReaderHeaderProps {
  onMenuToggle: () => void;
  onLiveStudy: () => void;
}

export function ReaderHeader({ onMenuToggle, onLiveStudy }: ReaderHeaderProps) {
  const { prefs } = useTheme();
  const { isPaid } = useSubscription();

  const bg = prefs.theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : prefs.theme === 'sepia' ? 'bg-[#f4ecd8] border-[#d4b896]' : 'bg-white border-stone-200';
  const text = prefs.theme === 'dark' ? 'text-zinc-100' : 'text-stone-700';

  return (
    <header className={`flex items-center gap-3 px-4 py-2.5 border-b ${bg} flex-shrink-0`}>
      <button onClick={onMenuToggle} className={`p-1.5 rounded-lg hover:bg-stone-100 transition ${text}`} aria-label="Toggle sidebar">☰</button>

      <a href="/dashboard" className="text-amber-700 font-bold font-serif text-sm tracking-tight">Scripture Stream</a>

      <div className="flex-1" />

      <nav className="hidden md:flex items-center gap-1">
        <a href="/dashboard" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Dashboard</a>
        <a href="/study" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Study</a>
        <a href={isPaid ? '/morning-card' : '/pricing?feature=morning-card'} className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text} ${!isPaid ? 'opacity-60' : ''}`}>
          🌅 {!isPaid && '🔒'}
        </a>
        <a href="/settings" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Settings</a>
      </nav>

      <button
        onClick={onLiveStudy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
      >
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        Live
      </button>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/reader/reader-header.tsx
git commit -m "feat: add navigation links to reader header"
```

---

### Task 22: Run all tests and verify

- [ ] **Step 1: Run full test suite**

```bash
cd "C:/Users/dell/OneDrive/Desktop/Scripture Stream/scripture-stream"
npm test -- --no-coverage --passWithNoTests
```

Expected: All existing tests pass. New tests (stripe-helpers, soap, memory SM-2) pass.

- [ ] **Step 2: Build to check for TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds. Fix any TypeScript errors before proceeding.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Scripture Stream premium feature set for public launch"
```

---

## Environment Variables Checklist

Before going live, set these in Railway (or your deployment environment):

```env
# Already working (Supabase + Gemini)
NEXT_PUBLIC_SUPABASE_URL=           ✅ set
NEXT_PUBLIC_SUPABASE_ANON_KEY=      ✅ set
SUPABASE_SERVICE_ROLE_KEY=          ✅ set
GEMINI_API_KEY=                     ✅ set
NEXT_PUBLIC_APP_URL=                ✅ set

# Add when Stripe is ready
STRIPE_SECRET_KEY=                  ⏳ add after Stripe setup
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= ⏳ add after Stripe setup
STRIPE_WEBHOOK_SECRET=              ⏳ add after Stripe setup
STRIPE_PRICE_MONTHLY=               ⏳ add after creating Stripe products
STRIPE_PRICE_ANNUAL=                ⏳ add after creating Stripe products
STRIPE_PRICE_LIFETIME=              ⏳ add after creating Stripe products
```

The app runs correctly without Stripe keys — the checkout button shows an error message instead of redirecting, but all other features work.

---

## Supabase Schema Note

The database tables referenced (soap_entries, memory_verses, chat_sessions, chat_messages, morning_cards, bookmarks, highlights, notes, reading_progress, preferences) are already defined in `supabase/migrations/001_initial_schema.sql`. Ensure this migration has been applied to your Supabase project before testing.

To apply: run the SQL in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor or CLI.
