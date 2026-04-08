import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Verse Card Creator — Scripture Stream' };

export default async function VerseCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase.from('subscriptions')
    .select('plan, status, current_period_end').eq('user_id', user.id).single();
  const paid = isPremium(sub ? {
    id: '', userId: user.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null,
  } : null);
  if (!paid) redirect('/pricing?feature=verse-card');

  return (
    <main className="max-w-2xl mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">Verse Card Creator</h1>
      <p className="text-stone-500 mb-8">Select any verse in the Bible reader and tap <strong>🖼 Card</strong> to create a shareable verse image.</p>
      <a
        href="/read/john/3"
        className="inline-block px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition"
      >
        Open Bible Reader →
      </a>
    </main>
  );
}
