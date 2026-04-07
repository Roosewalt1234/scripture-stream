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
