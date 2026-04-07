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
