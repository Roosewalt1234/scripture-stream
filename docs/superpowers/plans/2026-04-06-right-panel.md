# Right Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible right-side panel to the Bible reader with three tabs — AI, Notes, and Tools — replacing scattered inline AI results, highlight swatches, and note snippets.

**Architecture:** Four new components (`right-panel.tsx`, `panel-ai.tsx`, `panel-notes.tsx`, `panel-tools.tsx`) slot into the existing flex layout in `reader-view.tsx`. AI state moves out of `reader-view.tsx` into `panel-ai.tsx`. The panel shell owns tab and collapse state, persisted in localStorage. `reader-view.tsx` owns `panelOpen` and `activeTab` so the "Explain" verse shortcut can switch the panel programmatically.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, TypeScript, `localStore` (localStorage wrapper at `lib/storage/local.ts`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/reader/panel-ai.tsx` | AI tab: explain verse, chapter context, verse art |
| Create | `components/reader/panel-notes.tsx` | Notes tab: add/edit notes, highlights list |
| Create | `components/reader/panel-tools.tsx` | Tools tab: font size, theme, reading progress, locked premium stubs |
| Create | `components/reader/right-panel.tsx` | Panel shell: tab bar, collapse toggle, renders the three tab components |
| Modify | `components/reader/reader-view.tsx` | Remove inline AI/art/context blocks; add `panelOpen`/`activeTab` state; mount RightPanel |
| Modify | `components/reader/reader-header.tsx` | Remove theme switcher (moves to Tools tab) |
| Create | `__tests__/components/reader/right-panel.test.tsx` | Smoke + tab-switching tests |

---

## Task 1 — PanelAI component

**Files:**
- Create: `components/reader/panel-ai.tsx`

- [ ] **Step 1: Create `components/reader/panel-ai.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/panel-ai.tsx
git commit -m "feat: add PanelAI component (AI tab for right panel)"
```

---

## Task 2 — PanelNotes component

**Files:**
- Create: `components/reader/panel-notes.tsx`

- [ ] **Step 1: Create `components/reader/panel-notes.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { Verse, Note, Highlight } from '@/types';
import { localStore } from '@/lib/storage/local';

interface PanelNotesProps {
  selectedVerse: Verse | null;
  verses: Verse[];
  highlights: Highlight[];
  notes: Note[];
  onHighlight: (verse: Verse, color: string) => void;
  onSaveNote: (verse: Verse, content: string) => void;
  onDeleteNote: (verseId: string) => void;
}

const HIGHLIGHT_COLORS = ['#FEF08A', '#93C5FD', '#86EFAC', '#FDA4AF', '#FCA5A1'] as const;

export function PanelNotes({
  selectedVerse,
  verses,
  highlights,
  notes,
  onHighlight,
  onSaveNote,
  onDeleteNote,
}: PanelNotesProps) {
  const [noteText, setNoteText] = useState('');

  // Pre-fill textarea when a verse with an existing note is selected
  useEffect(() => {
    if (!selectedVerse) { setNoteText(''); return; }
    const existing = notes.find(n => n.verseId === selectedVerse.id);
    setNoteText(existing?.content ?? '');
  }, [selectedVerse?.id, notes]);

  // Notes and highlights scoped to the current chapter's verses
  const verseIds = new Set(verses.map(v => v.id));
  const chapterNotes = notes.filter(n => verseIds.has(n.verseId));
  const chapterHighlights = highlights.filter(h => verseIds.has(h.verseId));

  function verseLabel(verseId: string) {
    const v = verses.find(v => v.id === verseId);
    return v ? `v${v.number}` : verseId;
  }

  function handleSave() {
    if (!selectedVerse || !noteText.trim()) return;
    onSaveNote(selectedVerse, noteText.trim());
  }

  function handleDeleteNote(verseId: string) {
    localStore.saveNote({ id: `note-${verseId}`, verseId, content: '', lastUpdated: Date.now() });
    onDeleteNote(verseId);
  }

  return (
    <div className="space-y-5">
      {/* Add / Edit Note */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          {selectedVerse
            ? `Note for ${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}`
            : 'Add Note'}
        </p>
        {!selectedVerse ? (
          <p className="text-sm text-stone-400 italic">Select a verse to add a note.</p>
        ) : (
          <>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={4}
              placeholder="Write your note…"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              onClick={handleSave}
              disabled={!noteText.trim()}
              className="mt-2 w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm rounded-lg transition"
            >
              Save Note
            </button>
          </>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Highlights */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Highlights
        </p>
        {!selectedVerse ? (
          <p className="text-sm text-stone-400 italic">Select a verse to highlight it.</p>
        ) : (
          <div className="flex gap-2 mb-3">
            {HIGHLIGHT_COLORS.map(color => {
              const active = highlights.find(h => h.verseId === selectedVerse.id)?.color === color;
              return (
                <button
                  key={color}
                  onClick={() => onHighlight(selectedVerse, color)}
                  className={`w-7 h-7 rounded-full border-2 transition ${active ? 'border-stone-600 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Highlight ${color}`}
                />
              );
            })}
          </div>
        )}
        {chapterHighlights.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No highlights in this chapter.</p>
        ) : (
          <ul className="space-y-1">
            {chapterHighlights.map(h => (
              <li key={h.id} className="flex items-center gap-2 text-sm text-stone-700">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: h.color }}
                />
                <span className="text-stone-500 text-xs w-6 flex-shrink-0">{verseLabel(h.verseId)}</span>
                <button
                  onClick={() => {
                    localStore.removeHighlight(h.verseId);
                    const v = verses.find(v => v.id === h.verseId);
                    if (v) onHighlight(v, '');
                  }}
                  className="ml-auto text-xs text-stone-400 hover:text-red-500 transition"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Chapter Notes List */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Notes in this chapter
        </p>
        {chapterNotes.filter(n => n.content).length === 0 ? (
          <p className="text-sm text-stone-400 italic">No notes yet for this chapter.</p>
        ) : (
          <ul className="space-y-3">
            {chapterNotes.filter(n => n.content).map(note => (
              <li key={note.id} className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-700">
                    {verseLabel(note.verseId)}
                  </span>
                  <button
                    onClick={() => handleDeleteNote(note.verseId)}
                    className="text-xs text-stone-400 hover:text-red-500 transition"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/panel-notes.tsx
git commit -m "feat: add PanelNotes component (Notes tab for right panel)"
```

---

## Task 3 — PanelTools component

**Files:**
- Create: `components/reader/panel-tools.tsx`

- [ ] **Step 1: Create `components/reader/panel-tools.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { localStore } from '@/lib/storage/local';
import { UserPreferences } from '@/types';

interface PanelToolsProps {
  book: string;
  chapter: number;
}

export function PanelTools({ book, chapter }: PanelToolsProps) {
  const { prefs, setPrefs } = useTheme();
  const [isRead, setIsRead] = useState(() => localStore.isRead(book, chapter));
  const [totalRead, setTotalRead] = useState(() => localStore.getProgress().length);

  function toggleRead() {
    if (isRead) {
      localStore.unmarkAsRead(book, chapter);
      setIsRead(false);
    } else {
      localStore.markAsRead(book, chapter);
      setIsRead(true);
    }
    setTotalRead(localStore.getProgress().length);
  }

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Appearance
        </p>

        {/* Theme */}
        <div className="mb-4">
          <p className="text-xs text-stone-500 mb-2">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'sepia'] as UserPreferences['theme'][]).map(t => (
              <button
                key={t}
                onClick={() => setPrefs({ theme: t })}
                className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                  prefs.theme === t
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-stone-500">Font Size</p>
            <span className="text-xs font-medium text-stone-700">{prefs.fontSize}px</span>
          </div>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={prefs.fontSize}
            onChange={e => setPrefs({ fontSize: Number(e.target.value) })}
            className="w-full accent-amber-600"
          />
        </div>

        {/* Font family */}
        <div>
          <p className="text-xs text-stone-500 mb-2">Font</p>
          <div className="flex gap-2">
            {(['serif', 'sans'] as UserPreferences['fontFamily'][]).map(f => (
              <button
                key={f}
                onClick={() => setPrefs({ fontFamily: f })}
                className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                  prefs.fontFamily === f
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {f === 'serif' ? 'Serif' : 'Sans-serif'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-stone-100" />

      {/* Reading Progress */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Reading Progress
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRead}
            onChange={toggleRead}
            className="w-4 h-4 accent-amber-600 rounded"
          />
          <span className="text-sm text-stone-700">
            Mark {book} {chapter} as complete
          </span>
        </label>
        <p className="mt-2 text-xs text-stone-400">{totalRead} chapter{totalRead !== 1 ? 's' : ''} completed total</p>
      </section>

      <div className="border-t border-stone-100" />

      {/* Premium locked items */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Study Tools
        </p>
        {[
          { label: 'Cross References', description: 'See related passages across the Bible' },
          { label: 'Translation Compare', description: 'Compare up to 5 translations side by side' },
          { label: 'Original Language', description: 'Hebrew & Greek with Strong\'s numbers' },
        ].map(item => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100 mb-2 opacity-70"
          >
            <span className="text-base mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-medium text-stone-700">{item.label}</p>
              <p className="text-xs text-stone-400">{item.description}</p>
            </div>
          </div>
        ))}
        <button className="mt-1 w-full py-2 border border-amber-500 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition">
          Upgrade to Premium
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/panel-tools.tsx
git commit -m "feat: add PanelTools component (Tools tab for right panel)"
```

---

## Task 4 — RightPanel shell

**Files:**
- Create: `components/reader/right-panel.tsx`

- [ ] **Step 1: Create `components/reader/right-panel.tsx`**

```tsx
'use client';
import { Verse, Note, Highlight } from '@/types';
import { PanelAI } from './panel-ai';
import { PanelNotes } from './panel-notes';
import { PanelTools } from './panel-tools';

export type PanelTab = 'ai' | 'notes' | 'tools';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  selectedVerse: Verse | null;
  verses: Verse[];
  book: string;
  chapter: number;
  highlights: Highlight[];
  notes: Note[];
  onHighlight: (verse: Verse, color: string) => void;
  onSaveNote: (verse: Verse, content: string) => void;
  onDeleteNote: (verseId: string) => void;
}

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: 'ai', label: 'AI', icon: '✦' },
  { id: 'notes', label: 'Notes', icon: '✎' },
  { id: 'tools', label: 'Tools', icon: '⚙' },
];

export function RightPanel({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  selectedVerse,
  verses,
  book,
  chapter,
  highlights,
  notes,
  onHighlight,
  onSaveNote,
  onDeleteNote,
}: RightPanelProps) {
  return (
    <aside
      className={`relative flex-shrink-0 border-l border-stone-200 bg-white transition-all duration-200 flex flex-col ${
        isOpen ? 'w-80' : 'w-10'
      }`}
    >
      {/* Toggle chevron */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-6 z-10 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-stone-50 transition text-stone-500"
        aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {isOpen ? '›' : '‹'}
      </button>

      {/* Collapsed: vertical icon strip */}
      {!isOpen && (
        <div className="flex flex-col items-center pt-14 gap-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); onToggle(); }}
              title={tab.label}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 transition text-sm"
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      {/* Expanded: tab bar + content */}
      {isOpen && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-stone-200 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                  activeTab === tab.id
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'ai' && (
              <PanelAI
                selectedVerse={selectedVerse}
                book={book}
                chapter={chapter}
              />
            )}
            {activeTab === 'notes' && (
              <PanelNotes
                selectedVerse={selectedVerse}
                verses={verses}
                highlights={highlights}
                notes={notes}
                onHighlight={onHighlight}
                onSaveNote={onSaveNote}
                onDeleteNote={onDeleteNote}
              />
            )}
            {activeTab === 'tools' && (
              <PanelTools book={book} chapter={chapter} />
            )}
          </div>
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/right-panel.tsx
git commit -m "feat: add RightPanel shell (tabs + collapse toggle)"
```

---

## Task 5 — Update reader-view.tsx

**Files:**
- Modify: `components/reader/reader-view.tsx`

- [ ] **Step 1: Replace `components/reader/reader-view.tsx` with the updated version**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/reader-view.tsx
git commit -m "feat: integrate RightPanel into reader, remove inline AI/art/context blocks"
```

---

## Task 6 — Update reader-header.tsx

**Files:**
- Modify: `components/reader/reader-header.tsx`

- [ ] **Step 1: Remove the three theme circle buttons from the header** (they now live in Tools tab)

Replace the entire file content:

```tsx
'use client';
import Link from 'next/link';

interface ReaderHeaderProps {
  onMenuToggle: () => void;
  onLiveStudy: () => void;
}

export function ReaderHeader({ onMenuToggle, onLiveStudy }: ReaderHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-stone-100 transition"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="font-serif text-lg font-semibold text-stone-800">
          Scripture Stream
        </Link>
      </div>
      <button
        onClick={onLiveStudy}
        className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition"
      >
        Live Study
      </button>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/reader-header.tsx
git commit -m "feat: remove theme switcher from header (moved to Tools tab)"
```

---

## Task 7 — Smoke tests

**Files:**
- Create: `__tests__/components/reader/right-panel.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightPanel } from '@/components/reader/right-panel';

// Mock sub-components to isolate right-panel logic
jest.mock('@/components/reader/panel-ai', () => ({
  PanelAI: () => <div data-testid="panel-ai" />,
}));
jest.mock('@/components/reader/panel-notes', () => ({
  PanelNotes: () => <div data-testid="panel-notes" />,
}));
jest.mock('@/components/reader/panel-tools', () => ({
  PanelTools: () => <div data-testid="panel-tools" />,
}));
jest.mock('@/lib/storage/local', () => ({
  localStore: {
    getNotes: () => [],
    getHighlights: () => [],
    getProgress: () => [],
    isRead: () => false,
  },
}));

const baseProps = {
  isOpen: true,
  onToggle: jest.fn(),
  activeTab: 'ai' as const,
  onTabChange: jest.fn(),
  selectedVerse: null,
  verses: [],
  book: 'John',
  chapter: 3,
  highlights: [],
  notes: [],
  onHighlight: jest.fn(),
  onSaveNote: jest.fn(),
};

describe('RightPanel', () => {
  it('renders AI tab content when activeTab is ai', () => {
    render(<RightPanel {...baseProps} activeTab="ai" />);
    expect(screen.getByTestId('panel-ai')).toBeInTheDocument();
  });

  it('renders Notes tab content when activeTab is notes', () => {
    render(<RightPanel {...baseProps} activeTab="notes" />);
    expect(screen.getByTestId('panel-notes')).toBeInTheDocument();
  });

  it('renders Tools tab content when activeTab is tools', () => {
    render(<RightPanel {...baseProps} activeTab="tools" />);
    expect(screen.getByTestId('panel-tools')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab button is clicked', () => {
    const onTabChange = jest.fn();
    render(<RightPanel {...baseProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Notes'));
    expect(onTabChange).toHaveBeenCalledWith('notes');
  });

  it('calls onToggle when chevron button is clicked', () => {
    const onToggle = jest.fn();
    render(<RightPanel {...baseProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText('Collapse panel'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows icon strip and not tab content when collapsed', () => {
    render(<RightPanel {...baseProps} isOpen={false} />);
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-ai')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd "c:/Users/dell/OneDrive/Desktop/Scripture Stream/scripture-stream"
npm test -- __tests__/components/reader/right-panel.test.tsx --no-coverage
```

Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/reader/right-panel.test.tsx
git commit -m "test: add RightPanel smoke tests"
```

---

## Task 8 — Deploy to Railway

- [ ] **Step 1: Deploy**

```bash
cd "c:/Users/dell/OneDrive/Desktop/Scripture Stream/scripture-stream"
railway up --detach -m "feat: add right panel with AI / Notes / Tools tabs"
```

- [ ] **Step 2: Verify deployment succeeds**

```bash
railway logs --lines 20
```

Expected output contains:
```
✓ Ready in ...ms
▲ Next.js 15...
```

- [ ] **Step 3: Manual smoke test checklist**
  - Open the reader (`/read/john/3`)
  - Right panel is visible on the right side with AI / Notes / Tools tabs
  - Click "AI" tab → select a verse → click "Explain" → explanation appears in panel (not inline)
  - Click "Historical Context" button → context appears in panel
  - Click "Notes" tab → select a verse → type a note → click Save → note appears in the list below
  - Click a highlight color → verse text gets tinted
  - Click "Tools" tab → move font size slider → text in reader resizes
  - Switch theme to Dark/Sepia → reader background changes
  - Check "Mark as complete" → chapter count increments
  - Click the chevron → panel collapses to icon strip
  - Click an icon in the strip → panel expands to that tab
  - Click "✦ Explain" shortcut on a verse → panel opens on AI tab
  - Click "✎ Note" shortcut on a verse → panel opens on Notes tab
