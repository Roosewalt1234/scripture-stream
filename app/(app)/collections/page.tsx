import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'My Collections — Scripture Stream' };

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase.from('subscriptions')
    .select('plan, status, current_period_end').eq('user_id', user.id).single();
  const paid = isPremium(sub ? {
    id: '', userId: user.id, plan: sub.plan, status: sub.status,
    currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null,
  } : null);
  if (!paid) redirect('/pricing?feature=collections');

  const { data: collections } = await supabase
    .from('verse_collections')
    .select('id, name, color, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">My Collections</h1>
          <p className="text-sm text-stone-500 mt-1">Curated verse collections by topic or theme</p>
        </div>
        <Link href="/read/john/3" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
          + Add Verses
        </Link>
      </div>

      {(!collections || collections.length === 0) ? (
        <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-xl">
          <p className="text-stone-400 mb-2">No collections yet</p>
          <p className="text-sm text-stone-400">Select a verse in the reader and click 📚 Save to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map(col => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="border border-stone-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition">{col.name}</h3>
              </div>
              {col.description && <p className="text-xs text-stone-500">{col.description}</p>}
              <p className="text-xs text-stone-400 mt-2">{new Date(col.created_at).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
