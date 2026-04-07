'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface MemoryVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  verse_text: string;
  translation: string;
  next_review: string;
  total_reviews: number;
  interval_days: number;
}

export function MemoryFlashcards() {
  const { isPaid } = useSubscription();
  const [verses, setVerses] = useState<MemoryVerse[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isPaid) return;
    setLoading(true);
    fetch('/api/memory').then(r => r.json()).then(d => { setVerses(d.verses ?? []); setLoading(false); });
  }, [isPaid]);

  const current = verses[currentIdx];

  async function submitReview(quality: 0 | 1 | 2 | 3 | 4 | 5) {
    if (!current || reviewing) return;
    setReviewing(true);
    await fetch('/api/memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: current.id, quality }),
    });
    setFlipped(false);
    setReviewing(false);
    if (currentIdx + 1 >= verses.length) { setDone(true); }
    else { setCurrentIdx(i => i + 1); }
  }

  if (!isPaid) {
    return (
      <>
        <div className="text-center p-6 space-y-3">
          <span className="text-3xl">🧠</span>
          <p className="font-semibold text-stone-800">Scripture Memory</p>
          <p className="text-sm text-stone-500">Memorize Bible verses with spaced repetition. Add any verse and review cards daily.</p>
          <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && <UpgradeModal featureName="Scripture Memory" featureDescription="Memorize Bible verses effortlessly with daily spaced repetition flashcards." onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  if (loading) return <p className="text-sm text-stone-400 p-4">Loading cards…</p>;

  if (verses.length === 0) {
    return (
      <div className="text-center p-8 space-y-2">
        <span className="text-3xl">📚</span>
        <p className="font-semibold text-stone-700">No cards due for review</p>
        <p className="text-sm text-stone-400">Add verses using the "Memory" button on any verse in the reader.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center p-8 space-y-3">
        <span className="text-4xl">🎉</span>
        <p className="font-bold text-stone-800 text-lg">Session complete!</p>
        <p className="text-sm text-stone-500">Reviewed {verses.length} verse{verses.length !== 1 ? 's' : ''}. Great work!</p>
        <button onClick={() => { setCurrentIdx(0); setDone(false); setFlipped(false); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
          Review Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs text-stone-400">
        <span>{currentIdx + 1} / {verses.length} due today</span>
        <span>{current.total_reviews} review{current.total_reviews !== 1 ? 's' : ''} total</span>
      </div>

      {/* Card */}
      <button
        onClick={() => setFlipped(f => !f)}
        className="w-full min-h-[200px] rounded-2xl border-2 border-stone-200 p-6 text-center flex flex-col items-center justify-center gap-3 hover:border-amber-300 transition cursor-pointer bg-stone-50"
      >
        {!flipped ? (
          <>
            <p className="text-sm font-semibold text-amber-700">{current.book} {current.chapter}:{current.verse}</p>
            <p className="text-xs text-stone-400 mt-2">Tap to reveal the verse</p>
          </>
        ) : (
          <>
            <p className="text-stone-800 leading-relaxed text-sm">"{current.verse_text}"</p>
            <p className="text-xs text-stone-400">{current.translation}</p>
          </>
        )}
      </button>

      {/* Review buttons */}
      {flipped && (
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Again', quality: 1, color: 'border-red-300 text-red-600 hover:bg-red-50' },
            { label: 'Hard', quality: 3, color: 'border-orange-300 text-orange-600 hover:bg-orange-50' },
            { label: 'Easy', quality: 5, color: 'border-green-300 text-green-600 hover:bg-green-50' },
          ] as const).map(btn => (
            <button
              key={btn.label}
              onClick={() => submitReview(btn.quality as 0 | 1 | 2 | 3 | 4 | 5)}
              disabled={reviewing}
              className={`py-2 border-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
