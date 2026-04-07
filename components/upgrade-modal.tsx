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
