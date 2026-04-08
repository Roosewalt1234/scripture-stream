'use client';
import { useState } from 'react';
import { Verse } from '@/types';

interface SummaryData {
  summary: string;
  keyThemes: string[];
  reflectionQuestions: string[];
}

interface Props {
  book: string;
  chapter: number;
  verses: Verse[];
  onClose: () => void;
}

export function ChapterSummaryModal({ book, chapter, verses, onClose }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/chapter-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book, chapter,
          verseTexts: verses.map(v => v.text),
        }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error ?? 'Failed to generate');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  // Auto-generate on mount
  useState(() => { generate(); });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-800">{book} {chapter}</h2>
            <p className="text-xs text-stone-400">AI Chapter Summary</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-stone-400">Generating summary…</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={generate} className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg">Retry</button>
            </div>
          )}

          {data && (
            <>
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Summary</h3>
                <p className="text-sm text-stone-700 leading-relaxed">{data.summary}</p>
              </div>

              {data.keyThemes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Key Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.keyThemes.map((theme, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.reflectionQuestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Reflect & Apply</h3>
                  <ul className="space-y-2">
                    {data.reflectionQuestions.map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-500 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                        <p className="text-sm text-stone-700">{q}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
