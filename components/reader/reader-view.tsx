'use client';
import { useState, useEffect } from 'react';
import { Verse, Highlight, Note, Translation } from '@/types';
import { bibleService } from '@/lib/bible/service';
import { localStore } from '@/lib/storage/local';
import { cloudStore } from '@/lib/storage/cloud';
import { DEFAULT_TRANSLATION, TRANSLATIONS } from '@/lib/constants';
import { ReaderHeader } from './reader-header';
import { Sidebar } from './sidebar';
import { LiveConversation } from './live-conversation';
import { RightPanel, PanelTab } from './right-panel';

interface ReaderViewProps {
  initialBook: string;
  initialChapter: number;
  isPremium: boolean;
}

export function ReaderView({ initialBook, initialChapter, isPremium }: ReaderViewProps) {
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
  const [parallelTranslation, setParallelTranslation] = useState<Translation | null>(null);
  const [parallelVerses, setParallelVerses] = useState<Verse[]>([]);
  const [parallelLoading, setParallelLoading] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [collectionVerse, setCollectionVerse] = useState<Verse | null>(null);
  const [showVerseCard, setShowVerseCard] = useState(false);
  const [verseCardVerse, setVerseCardVerse] = useState<Verse | null>(null);
  const [wordStudyVerse, setWordStudyVerse] = useState<Verse | null>(null);
  const [showWordStudy, setShowWordStudy] = useState(false);
  const [showChapterSummary, setShowChapterSummary] = useState(false);

  // Load notes and highlights for current chapter
  useEffect(() => {
    async function loadData() {
      if (isPremium) {
        const [n, h] = await Promise.all([
          cloudStore.getNotes(book, chapter),
          cloudStore.getHighlights(book, chapter),
        ]);
        setNotes(n); setHighlights(h);
      } else {
        setNotes(localStore.getNotes());
        setHighlights(localStore.getHighlights());
      }
    }
    loadData();
  }, [book, chapter, isPremium]);

  useEffect(() => {
    setLoading(true); setError(''); setSelectedVerse(null);
    bibleService.getChapter(book, chapter, translation)
      .then(v => { setVerses(v); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [book, chapter, translation]);

  useEffect(() => {
    if (!parallelTranslation) { setParallelVerses([]); return; }
    setParallelLoading(true);
    bibleService.getChapter(book, chapter, parallelTranslation)
      .then(v => { setParallelVerses(v); setParallelLoading(false); })
      .catch(() => setParallelLoading(false));
  }, [book, chapter, parallelTranslation]);

  async function handleHighlight(verse: Verse, color: string) {
    const verseNum = verse.number;
    const existing = highlights.find(h => h.verseId === verse.id);
    if (!color || (existing && existing.color === color)) {
      if (isPremium) { await cloudStore.saveHighlight(book, chapter, verseNum, ''); }
      else { localStore.removeHighlight(verse.id); }
    } else {
      if (isPremium) { await cloudStore.saveHighlight(book, chapter, verseNum, color); }
      else {
        if (existing) localStore.removeHighlight(verse.id);
        localStore.saveHighlight({ id: `hl-${verse.id}`, verseId: verse.id, color });
      }
    }
    if (isPremium) {
      const h = await cloudStore.getHighlights(book, chapter);
      setHighlights(h);
    } else {
      setHighlights(localStore.getHighlights());
    }
  }

  async function handleSaveNote(verse: Verse, content: string) {
    if (!content.trim()) return;
    if (isPremium) {
      await cloudStore.saveNote(book, chapter, verse.number, content);
      const n = await cloudStore.getNotes(book, chapter);
      setNotes(n);
    } else {
      localStore.saveNote({ id: `note-${verse.id}`, verseId: verse.id, content, lastUpdated: Date.now() });
      setNotes(localStore.getNotes());
    }
  }

  async function handleDeleteNote(verseId: string) {
    if (isPremium) {
      const verseNum = parseInt(verseId.split('-').pop() ?? '0');
      await cloudStore.saveNote(book, chapter, verseNum, '');
      const n = await cloudStore.getNotes(book, chapter);
      setNotes(n);
    } else {
      localStore.saveNote({ id: `note-${verseId}`, verseId, content: '', lastUpdated: Date.now() });
      setNotes(localStore.getNotes());
    }
  }

  function handleEditNote(verseId: string) {
    const verse = verses.find(v => v.id === verseId);
    if (verse) { setSelectedVerse(verse); setActiveTab('notes'); setPanelOpen(true); }
  }

  function handleAddToMemory(verse: Verse) {
    fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book, chapter, verse: verse.number, verseText: verse.text, translation }),
    }).then(r => r.json()).then(d => { if (d.error) alert(d.error); else alert('Added to memory!'); });
  }

  function handleWordStudyVerse(verse: Verse) {
    setWordStudyVerse(verse);
    setShowWordStudy(true);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} currentBook={book} currentChapter={chapter} currentTranslation={translation} onTranslationChange={setTranslation} />

      <div className="flex flex-col flex-1 min-w-0">
        <ReaderHeader onMenuToggle={() => setSidebarOpen(o => !o)} onLiveStudy={() => setShowLiveConvo(true)} />
        <main className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-serif">{book} {chapter}</h2>
            <div className="flex gap-2">
              <button onClick={() => setChapter(c => Math.max(1, c - 1))} className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition">← Prev</button>
              <button onClick={() => setChapter(c => c + 1)} className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm hover:bg-stone-200 transition">Next →</button>
            </div>
          </div>

          {/* Parallel Bible — premium only */}
          {isPremium && (
            <div className="flex items-center gap-2 mb-4 p-2 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-xs text-stone-500 font-medium">Parallel:</span>
              <select
                value={parallelTranslation ?? ''}
                onChange={e => setParallelTranslation((e.target.value as Translation) || null)}
                className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 flex-1"
              >
                <option value="">— Off —</option>
                {TRANSLATIONS.filter(t => t.id !== translation).map(t => (
                  <option key={t.id} value={t.id}>{t.id.toUpperCase()} — {t.name}</option>
                ))}
              </select>
            </div>
          )}

          {isPremium && verses.length > 0 && (
            <button
              onClick={() => setShowChapterSummary(true)}
              className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition mb-4"
            >
              ✦ Chapter Summary
            </button>
          )}

          {loading && <p className="text-stone-400">Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}

          {!loading && !error && verses.map(verse => {
            const hl = highlights.find(h => h.verseId === verse.id);
            const note = notes.find(n => n.verseId === verse.id);
            const pVerse = parallelVerses.find(v => v.number === verse.number);
            return (
              <div
                key={verse.id}
                className={`group mb-3 p-3 rounded-lg cursor-pointer transition ${selectedVerse?.id === verse.id ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'}`}
                style={hl ? { backgroundColor: hl.color + '55' } : {}}
                onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
              >
                <span className="text-xs text-stone-400 mr-2 select-none">{verse.number}</span>
                {parallelTranslation && pVerse ? (
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <p className="text-xs text-stone-400 mb-1 font-medium uppercase">{translation}</p>
                      <span className="text-stone-800">{verse.text}</span>
                    </div>
                    <div className="border-l border-stone-200 pl-3">
                      <p className="text-xs text-amber-600 mb-1 font-medium uppercase">{parallelTranslation}</p>
                      <span className="text-stone-700">{parallelLoading ? '…' : pVerse.text}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-stone-800">{verse.text}</span>
                )}
                {note?.content && (
                  <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{note.content}</p>
                )}
                {selectedVerse?.id === verse.id && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={e => { e.stopPropagation(); setActiveTab('ai'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition">✦ Explain</button>
                    <button onClick={e => { e.stopPropagation(); setActiveTab('notes'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition">✎ Note</button>
                    {isPremium && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleAddToMemory(verse); }} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition">🧠 Memory</button>
                        <button onClick={e => { e.stopPropagation(); setCollectionVerse(verse); setShowCollectionPicker(true); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition">📚 Save</button>
                        <button onClick={e => { e.stopPropagation(); setVerseCardVerse(verse); setShowVerseCard(true); }} className="text-xs px-2 py-1 bg-pink-100 text-pink-800 rounded hover:bg-pink-200 transition">🖼 Card</button>
                        <button onClick={e => { e.stopPropagation(); handleWordStudyVerse(verse); }} className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded hover:bg-teal-200 transition">📖 Words</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>

      <RightPanel
        isOpen={panelOpen} onToggle={() => setPanelOpen(o => !o)}
        activeTab={activeTab} onTabChange={setActiveTab}
        selectedVerse={selectedVerse} verses={verses}
        book={book} chapter={chapter}
        highlights={highlights} notes={notes}
        isPremium={isPremium}
        onHighlight={handleHighlight} onSaveNote={handleSaveNote}
        onDeleteNote={handleDeleteNote} onEditNote={handleEditNote}
      />

      {showLiveConvo && (
        <LiveConversation currentBook={book} currentChapter={chapter} selectedVerse={selectedVerse ?? undefined} onClose={() => setShowLiveConvo(false)} />
      )}
    </div>
  );
}
