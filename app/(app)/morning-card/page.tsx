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
