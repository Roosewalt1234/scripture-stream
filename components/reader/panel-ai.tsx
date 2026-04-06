'use client';
import { useState, useEffect } from 'react';
import { Verse } from '@/types';

interface PanelAIProps {
  selectedVerse: Verse | null;
  book: string;
  chapter: number;
}

const AI_STYLE = 'Ethereal';

export function PanelAI({ selectedVerse, book, chapter }: PanelAIProps) {
  const [explanation, setExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [historicalContext, setHistoricalContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [verseArt, setVerseArt] = useState<string | null>(null);
  const [artLoading, setArtLoading] = useState(false);

  // Clear explanation and art when selected verse changes
  useEffect(() => {
    setExplanation('');
    setVerseArt(null);
  }, [selectedVerse?.id]);

  // Clear context when chapter changes
  useEffect(() => {
    setHistoricalContext('');
  }, [book, chapter]);

  async function handleExplain() {
    if (!selectedVerse) return;
    setExplanationLoading(true);
    setExplanation('');
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verseText: selectedVerse.text,
        reference: `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}`,
      }),
    });
    const data = await res.json();
    setExplanation(res.ok ? data.explanation : data.error);
    setExplanationLoading(false);
  }

  async function handleContext() {
    setContextLoading(true);
    setHistoricalContext('');
    const res = await fetch('/api/ai/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, chapter }),
    });
    const data = await res.json();
    setHistoricalContext(res.ok ? data.context : data.error);
    setContextLoading(false);
  }

  async function handleArt() {
    if (!selectedVerse) return;
    setArtLoading(true);
    setVerseArt(null);
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: selectedVerse.text, style: AI_STYLE }),
    });
    const data = await res.json();
    if (res.ok) setVerseArt(data.imageData);
    setArtLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Verse Explanation */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Verse Explanation
        </p>
        {!selectedVerse ? (
          <p className="text-sm text-stone-400 italic">Select a verse to explain it.</p>
        ) : (
          <>
            <p className="text-xs text-amber-700 font-medium mb-2">
              {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.number}
            </p>
            <button
              onClick={handleExplain}
              disabled={explanationLoading}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm rounded-lg transition"
            >
              {explanationLoading ? 'Explaining…' : 'Explain this verse'}
            </button>
            {explanation && (
              <p className="mt-3 text-sm text-stone-700 leading-relaxed">{explanation}</p>
            )}
          </>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Historical Context */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Historical Context
        </p>
        <button
          onClick={handleContext}
          disabled={contextLoading}
          className="w-full py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 text-sm rounded-lg transition"
        >
          {contextLoading ? 'Loading…' : `Context for ${book} ${chapter}`}
        </button>
        {historicalContext && (
          <p className="mt-3 text-sm text-stone-700 leading-relaxed">{historicalContext}</p>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Verse Art */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Verse Art
        </p>
        {!selectedVerse ? (
          <p className="text-sm text-stone-400 italic">Select a verse to generate art.</p>
        ) : (
          <>
            <button
              onClick={handleArt}
              disabled={artLoading}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 text-sm rounded-lg transition"
            >
              {artLoading ? 'Generating…' : 'Generate Verse Art'}
            </button>
            {verseArt && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={verseArt} alt="Verse art" className="mt-3 w-full rounded-lg" />
            )}
          </>
        )}
      </section>
    </div>
  );
}
