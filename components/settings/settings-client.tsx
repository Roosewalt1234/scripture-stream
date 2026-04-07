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
