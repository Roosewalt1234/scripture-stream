'use client';
import { useState, useEffect } from 'react';
import { Verse } from '@/types';
import { useRouter } from 'next/navigation';

interface WordStudyData {
  word: string;
  original: string;
  language: string;
  transliteration: string;
  definition: string;
  extendedMeaning: string;
  relatedVerses: string[];
}

interface Props {
  verse: Verse | null;
  clickedWord: string;
  onClose: () => void;
}

export function WordStudyPopover({ verse, clickedWord, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<WordStudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!verse || !clickedWord) return;
    setData(null); setLoading(true); setError('');
    fetch('/api/ai/word-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: clickedWord,
        verseText: verse.text,
        reference: `${verse.book} ${verse.chapter}:${verse.number}`,
      }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [verse, clickedWord]);

  function navigateTo(ref: string) {
    const match = ref.match(/^(.+?)\s+(\d+):/);
    if (!match) return;
    const [, book, chapter] = match;
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
    onClose();
  }

  if (!verse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 shadow-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-stone-800 text-lg">&ldquo;{clickedWord}&rdquo;</h3>
            <p className="text-xs text-stone-400">{verse.book} {verse.chapter}:{verse.number} — Word Study</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {loading && (
          <div className="py-8 text-center">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-stone-400">Studying original languages…</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {data && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-2xl font-serif text-amber-800 mb-0.5">{data.original}</p>
              <p className="text-sm text-stone-500">{data.transliteration} · {data.language}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Definition</h4>
              <p className="text-sm text-stone-700">{data.definition}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Theological Meaning</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{data.extendedMeaning}</p>
            </div>

            {data.relatedVerses.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Same Word Elsewhere</h4>
                <div className="flex flex-wrap gap-2">
                  {data.relatedVerses.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => navigateTo(ref)}
                      className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full hover:bg-amber-100 hover:text-amber-700 transition"
                    >
                      {ref} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
