import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Scripture Stream',
  description: 'Upgrade to Premium for unlimited AI, cloud sync, and powerful study tools.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">Simple, Honest Pricing</h1>
        <p className="text-stone-500 text-lg mb-8">Pricing plans coming soon. Sign up free to get started.</p>
        <a href="/signup" className="bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-amber-700 transition inline-block">
          Start Free
        </a>
      </div>
    </main>
  );
}
