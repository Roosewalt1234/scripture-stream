'use client';
import { useState, useEffect } from 'react';
import { Verse, Highlight, Note, Translation } from '@/types';
import { bibleService } from '@/lib/bible/service';
import { localStore } from '@/lib/storage/local';
import { DEFAULT_TRANSLATION } from '@/lib/constants';
import { ReaderHeader } from './reader-header';
import { Sidebar } from './sidebar';
import { LiveConversation } from './live-conversation';

interface ReaderViewProps {
  initialBook: string;
  initialChapter: number;
}

const HIGHLIGHT_COLORS = ['#FEF08A', '#93C5FD', '#86EFAC', '#FDA4AF', '#FCA5A1'] as const;

export function ReaderView({ initialBook, initialChapter }: ReaderViewProps) {
  const [book, setBook] = useState(initialBook);
  const [chapter, setChapter] = useState(initialChapter);
  const [translation, setTranslation] = useState<Translation>(DEFAULT_TRANSLATION);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLiveConvo, setShowLiveConvo] = useState(false);
  // AI state
  const [explanation, setExplanation] = useState('');
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [historicalContext, setHistoricalContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [verseArt, setVerseArt] = useState<string | null>(null);
  const [artLoading, setArtLoading] = useState(false);
  const [artStyle] = useState('Ethereal');

  // Load localStorage data client-side only
  useEffect(() => {
    setNotes(localStore.getNotes());
    setHighlights(localStore.getHighlights());
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedVerse(null);
    setExplanation('');
    setHistoricalContext('');
    bibleService.getChapter(book, chapter, translation)
      .then(v => { setVerses(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [book, chapter, translation]);

  async function handleExplainVerse(verse: Verse) {
    setSelectedVerse(verse);
    setExplanationLoading(true);
    setExplanation('');
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: verse.text, reference: `${verse.book} ${verse.chapter}:${verse.number}` }),
    });
    const data = await res.json();
    setExplanation(res.ok ? data.explanation : data.error);
    setExplanationLoading(false);
  }

  async function handleHistoricalContext() {
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

  async function handleGenerateArt(verse: Verse) {
    setArtLoading(true);
    setVerseArt(null);
    const res = await fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: verse.text, style: artStyle }),
    });
    const data = await res.json();
    if (res.ok) setVerseArt(data.imageData);
    setArtLoading(false);
  }

  function handleHighlight(verse: Verse, color: string) {
    const existing = highlights.find(h => h.verseId === verse.id);
    if (existing && existing.color === color) {
      localStore.removeHighlight(verse.id);
    } else {
      if (existing) localStore.removeHighlight(verse.id);
      localStore.saveHighlight({ id: `hl-${verse.id}`, verseId: verse.id, color });
    }
    setHighlights(localStore.getHighlights());
  }

  function handleSaveNote(verse: Verse, content: string) {
    localStore.saveNote({ id: `note-${verse.id}`, verseId: verse.id, content, lastUpdated: Date.now() });
    setNotes(localStore.getNotes());
  }

  void handleSaveNote; // suppress unused warning — used in future expansion

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        currentBook={book}
        currentChapter={chapter}
        currentTranslation={translation}
        onTranslationChange={setTranslation}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <ReaderHeader
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onLiveStudy={() => setShowLiveConvo(true)}
        />
        <main className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          {/* Chapter navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">{book} {chapter}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setChapter(c => Math.max(1, c - 1))}
                className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition"
              >← Prev</button>
              <button
                onClick={() => setChapter(c => c + 1)}
                className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition"
              >Next →</button>
            </div>
          </div>

          {/* Historical context button */}
          <button
            onClick={handleHistoricalContext}
            className="mb-4 text-sm text-amber-700 hover:text-amber-900 underline"
          >
            {contextLoading ? 'Loading context…' : 'View Historical Context'}
          </button>
          {historicalContext && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              {historicalContext}
            </div>
          )}

          {/* Verse art */}
          {verseArt && (
            <div className="mb-6 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={verseArt} alt="Verse art" className="w-full" />
            </div>
          )}

          {/* Loading/error state */}
          {loading && <p className="text-stone-400">Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}

          {/* Art loading indicator */}
          {artLoading && <p className="text-stone-400 text-sm mb-4">Generating verse art…</p>}

          {/* Verses */}
          {!loading && !error && verses.map(verse => {
            const hl = highlights.find(h => h.verseId === verse.id);
            const note = notes.find(n => n.verseId === verse.id);
            return (
              <div
                key={verse.id}
                className={`group mb-3 p-3 rounded-lg cursor-pointer transition ${selectedVerse?.id === verse.id ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'}`}
                style={hl ? { backgroundColor: hl.color + '55' } : {}}
                onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
              >
                <span className="text-xs text-stone-400 mr-2 select-none">{verse.number}</span>
                <span className="text-stone-800">{verse.text}</span>
                {note && (
                  <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{note.content}</p>
                )}
                {/* Actions shown on selection */}
                {selectedVerse?.id === verse.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {HIGHLIGHT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={e => { e.stopPropagation(); handleHighlight(verse, color); }}
                        className={`w-5 h-5 rounded-full border-2 ${hl?.color === color ? 'border-stone-600 scale-110' : 'border-transparent'} transition`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      onClick={e => { e.stopPropagation(); handleExplainVerse(verse); }}
                      className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      Explain
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleGenerateArt(verse); }}
                      className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      Art
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Explanation panel */}
          {(explanation || explanationLoading) && (
            <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-xl">
              <h3 className="font-semibold text-stone-700 mb-2">
                {selectedVerse ? `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}` : ''} — Explanation
              </h3>
              {explanationLoading
                ? <p className="text-stone-400 text-sm animate-pulse">Generating…</p>
                : <p className="text-stone-700 text-sm leading-relaxed">{explanation}</p>
              }
            </div>
          )}
        </main>
      </div>
      {showLiveConvo && (
        <LiveConversation
          currentBook={book}
          currentChapter={chapter}
          selectedVerse={selectedVerse ?? undefined}
          onClose={() => setShowLiveConvo(false)}
        />
      )}
    </div>
  );
}
