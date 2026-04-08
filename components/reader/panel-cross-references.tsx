'use client';
import { useState } from 'react';
import { Verse } from '@/types';
import { useRouter } from 'next/navigation';

interface CrossRef {
  reference: string;
  text: string;
  connection: string;
}

interface Props {
  selectedVerse: Verse | null;
  isPremium: boolean;
}

export function PanelCrossReferences({ selectedVerse, isPremium }: Props) {
  const router = useRouter();
  const [refs, setRefs] = useState<CrossRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastVerseId, setLastVerseId] = useState('');

  async function fetchRefs() {
    if (!selectedVerse || !isPremium) return;
    setLoading(true); setError(''); setRefs([]);
    setLastVerseId(selectedVerse.id);
    try {
      const res = await fetch('/api/ai/cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: selectedVerse.text,
          reference: `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}`,
        }),
      });
      const data = await res.json();
      if (res.ok) setRefs(data.references ?? []);
      else setError(data.error ?? 'Failed to load references');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  function navigateToRef(reference: string) {
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return;
    const [, book, chapter] = match;
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
  }

  if (!isPremium) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-stone-500 mb-3">Cross-references are a premium feature.</p>
        <a href="/pricing" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">Upgrade</a>
      </div>
    );
  }

  if (!selectedVerse) {
    return <p className="p-4 text-sm text-stone-400">Select a verse to find cross-references.</p>;
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-2 italic">
        &ldquo;{selectedVerse.text.slice(0, 80)}{selectedVerse.text.length > 80 ? '…' : ''}&rdquo;
        <span className="block mt-1 font-medium not-italic text-stone-700">
          {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.number}
        </span>
      </div>

      {lastVerseId !== selectedVerse.id && (
        <button
          onClick={fetchRefs}
          disabled={loading}
          className="w-full py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 transition"
        >
          {loading ? 'Finding references…' : '🔗 Find Cross-References'}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {refs.map((ref, i) => (
        <div key={i} className="border border-stone-100 rounded-lg p-2.5 hover:border-amber-200 transition">
          <button
            onClick={() => navigateToRef(ref.reference)}
            className="text-xs font-bold text-amber-700 hover:underline block mb-1"
          >
            {ref.reference} →
          </button>
          <p className="text-xs text-stone-700 mb-1">&ldquo;{ref.text}&rdquo;</p>
          <p className="text-xs text-stone-400 italic">{ref.connection}</p>
        </div>
      ))}

      {refs.length > 0 && (
        <button
          onClick={fetchRefs}
          className="w-full py-1.5 text-xs text-stone-400 hover:text-stone-600 transition"
        >
          ↺ Refresh
        </button>
      )}
    </div>
  );
}
