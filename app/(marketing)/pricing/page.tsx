import type { Metadata } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://scripturestream.app';

export const metadata: Metadata = {
  title: 'Pricing — Scripture Stream',
  description: 'Upgrade to Premium for unlimited AI, cloud sync, and powerful study tools.',
  alternates: { canonical: `${APP_URL}/pricing` },
};

const FEATURES = [
  { name: 'Bible reading (17 translations)', free: true, paid: true },
  { name: 'Highlights, bookmarks & notes', free: 'Local only', paid: 'Cloud synced' },
  { name: 'Verse explanation (AI)', free: '5/day', paid: 'Unlimited' },
  { name: 'Historical context (AI)', free: '3/day', paid: 'Unlimited' },
  { name: 'Verse art generation', free: '2/day', paid: 'Unlimited' },
  { name: 'AI Study Assistant chat', free: false, paid: true },
  { name: 'Morning Card Studio', free: false, paid: true },
  { name: 'Sermon / teaching outline AI', free: false, paid: true },
  { name: 'AI devotional writer', free: false, paid: true },
  { name: 'AI discussion questions', free: false, paid: true },
  { name: 'AI prayer generator', free: false, paid: true },
  { name: 'Translation compare (5 columns)', free: false, paid: true },
  { name: 'Original language interlinear', free: false, paid: true },
  { name: 'Commentary access', free: false, paid: true },
  { name: 'SOAP journaling', free: false, paid: true },
  { name: 'Scripture memory (flashcards)', free: false, paid: true },
  { name: 'Reading analytics & streak', free: 'Basic', paid: 'Full dashboard' },
  { name: 'PDF export', free: false, paid: true },
  { name: 'Cloud sync across devices', free: false, paid: true },
  { name: 'Data backup & export', free: false, paid: true },
  { name: 'Reading plans', free: '3 plans', paid: '1000+ plans' },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-amber-600 font-bold">✓</span>;
  if (value === false) return <span className="text-stone-300">–</span>;
  return <span className="text-sm text-stone-600">{value}</span>;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-stone-50">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">Simple, Honest Pricing</h1>
        <p className="text-stone-500 text-lg mb-12">Start free forever. Upgrade when you&apos;re ready for more.</p>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Free */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 text-left">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Free</p>
            <p className="text-4xl font-bold text-stone-800 mb-1">$0</p>
            <p className="text-stone-400 text-sm mb-6">Forever</p>
            <a href="/signup" className="block w-full py-3 border border-stone-300 rounded-xl text-center text-sm font-semibold hover:bg-stone-50 transition">
              Get Started Free
            </a>
          </div>

          {/* Annual — highlighted */}
          <div className="bg-amber-600 rounded-2xl p-6 text-white text-left relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-xs px-3 py-1 rounded-full">Most Popular</span>
            <p className="text-sm font-semibold uppercase tracking-wide mb-2 text-amber-100">Annual</p>
            <p className="text-4xl font-bold mb-1">$79.99<span className="text-xl font-normal">/yr</span></p>
            <p className="text-amber-200 text-sm mb-1"><s>$199/yr</s> — save 60%</p>
            <p className="text-amber-100 text-xs mb-6">$6.67/month billed annually</p>
            <a href="/signup" className="block w-full py-3 bg-white text-amber-700 rounded-xl text-center text-sm font-semibold hover:bg-amber-50 transition">
              Start Annual Plan
            </a>
          </div>

          {/* Lifetime */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 text-left">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">Lifetime</p>
            <p className="text-4xl font-bold text-stone-800 mb-1">$149</p>
            <p className="text-stone-400 text-sm mb-6">One-time payment, forever</p>
            <a href="/signup" className="block w-full py-3 bg-stone-800 text-white rounded-xl text-center text-sm font-semibold hover:bg-stone-900 transition">
              Get Lifetime Access
            </a>
          </div>
        </div>
      </section>

      {/* Feature table */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-serif text-stone-800 text-center mb-8">What&apos;s Included</h2>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left p-4 font-semibold text-stone-700 w-1/2">Feature</th>
                <th className="p-4 font-semibold text-stone-700 text-center">Free</th>
                <th className="p-4 font-semibold text-amber-700 text-center">Premium</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={f.name} className={i % 2 === 0 ? 'bg-stone-50/50' : ''}>
                  <td className="p-4 text-stone-700">{f.name}</td>
                  <td className="p-4 text-center"><Cell value={f.free} /></td>
                  <td className="p-4 text-center"><Cell value={f.paid} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-serif text-stone-800 text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {[
            { q: 'Is the free tier really free forever?', a: 'Yes. No credit card required. You can read the Bible in 17 translations and use limited AI features at no cost, forever.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel anytime from Settings → Subscription. You keep premium access until your current period ends.' },
            { q: 'What happens to my data if I cancel?', a: 'Your data is never deleted. Your notes, highlights, and reading progress are preserved. Cloud sync pauses — data stays local.' },
            { q: 'Does Lifetime include all future features?', a: 'Yes. Lifetime access covers all features added to Scripture Stream in the future.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white rounded-xl p-5 border border-stone-200">
              <p className="font-semibold text-stone-800 mb-2">{q}</p>
              <p className="text-stone-500 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
