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
