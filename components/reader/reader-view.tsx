'use client';
import { useState, useEffect } from 'react';
import { Verse, Highlight, Note, Translation } from '@/types';
import { bibleService } from '@/lib/bible/service';
import { localStore } from '@/lib/storage/local';
import { DEFAULT_TRANSLATION } from '@/lib/constants';
import { ReaderHeader } from './reader-header';
import { Sidebar } from './sidebar';
import { LiveConversation } from './live-conversation';
import { RightPanel, PanelTab } from './right-panel';

interface ReaderViewProps {
  initialBook: string;
  initialChapter: number;
}

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
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>('ai');

  useEffect(() => {
    setNotes(localStore.getNotes());
    setHighlights(localStore.getHighlights());
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectedVerse(null);
    bibleService.getChapter(book, chapter, translation)
      .then(v => { setVerses(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [book, chapter, translation]);

  function handleHighlight(verse: Verse, color: string) {
    const existing = highlights.find(h => h.verseId === verse.id);
    if (!color || (existing && existing.color === color)) {
      localStore.removeHighlight(verse.id);
    } else {
      if (existing) localStore.removeHighlight(verse.id);
      localStore.saveHighlight({ id: `hl-${verse.id}`, verseId: verse.id, color });
    }
    setHighlights(localStore.getHighlights());
  }

  function handleSaveNote(verse: Verse, content: string) {
    if (!content.trim()) return;
    localStore.saveNote({ id: `note-${verse.id}`, verseId: verse.id, content, lastUpdated: Date.now() });
    setNotes(localStore.getNotes());
  }

  function handleDeleteNote(verseId: string) {
    localStore.saveNote({ id: `note-${verseId}`, verseId, content: '', lastUpdated: Date.now() });
    setNotes(localStore.getNotes());
  }

  function handleEditNote(verseId: string) {
    const verse = verses.find(v => v.id === verseId);
    if (verse) {
      setSelectedVerse(verse);
      setActiveTab('notes');
      setPanelOpen(true);
    }
  }

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
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
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

          {loading && <p className="text-stone-400">Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && verses.map(verse => {
            const hl = highlights.find(h => h.verseId === verse.id);
            const note = notes.find(n => n.verseId === verse.id);
            return (
              <div
                key={verse.id}
                className={`group mb-3 p-3 rounded-lg cursor-pointer transition ${
                  selectedVerse?.id === verse.id
                    ? 'bg-amber-50 ring-1 ring-amber-300'
                    : 'hover:bg-stone-50'
                }`}
                style={hl ? { backgroundColor: hl.color + '55' } : {}}
                onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
              >
                <span className="text-xs text-stone-400 mr-2 select-none">{verse.number}</span>
                <span className="text-stone-800">{verse.text}</span>
                {note?.content && (
                  <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">
                    {note.content}
                  </p>
                )}
                {/* Verse action shortcuts */}
                {selectedVerse?.id === verse.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTab('ai');
                        setPanelOpen(true);
                      }}
                      className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition"
                    >
                      ✦ Explain
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTab('notes');
                        setPanelOpen(true);
                      }}
                      className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition"
                    >
                      ✎ Note
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      <RightPanel
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(o => !o)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedVerse={selectedVerse}
        verses={verses}
        book={book}
        chapter={chapter}
        highlights={highlights}
        notes={notes}
        onHighlight={handleHighlight}
        onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote}
        onEditNote={handleEditNote}
      />

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
