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

export async function getUserIdByCustomer(stripeCustomerId: string): Promise<string | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .single();
  return data?.user_id ?? null;
}
