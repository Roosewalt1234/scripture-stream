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
