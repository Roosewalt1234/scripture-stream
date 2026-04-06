'use client';
import { useState, useEffect, useMemo } from 'react';
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
  onEditNote: (verseId: string) => void;
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
  onEditNote,
}: PanelNotesProps) {
  const [noteText, setNoteText] = useState('');

  // Pre-fill textarea when a verse with an existing note is selected
  useEffect(() => {
    if (!selectedVerse) { setNoteText(''); return; }
    const existing = notes.find(n => n.verseId === selectedVerse.id);
    setNoteText(existing?.content ?? '');
  }, [selectedVerse?.id, notes]);

  // Notes and highlights scoped to the current chapter's verses
  const verseIds = useMemo(() => new Set(verses.map(v => v.id)), [verses]);
  const chapterNotes = useMemo(() => notes.filter(n => verseIds.has(n.verseId)), [notes, verseIds]);
  const chapterHighlights = useMemo(() => highlights.filter(h => verseIds.has(h.verseId)), [highlights, verseIds]);
  const visibleNotes = useMemo(() => chapterNotes.filter(n => n.content), [chapterNotes]);

  function verseLabel(verseId: string) {
    const v = verses.find(v => v.id === verseId);
    return v ? `v${v.number}` : verseId;
  }

  function handleSave() {
    if (!selectedVerse || !noteText.trim()) return;
    onSaveNote(selectedVerse, noteText.trim());
  }

  function handleDeleteNote(verseId: string) {
    onDeleteNote(verseId);
  }

  return (
    <div className="space-y-5">
      {/* Add / Edit Note */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          {selectedVerse
            ? `Note for ${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}`
            : 'Select a verse'}
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

      {/* Chapter Notes List */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Notes in this chapter
        </p>
        {visibleNotes.length === 0 ? (
          <p className="text-sm text-stone-400 italic">No notes yet for this chapter.</p>
        ) : (
          <ul className="space-y-3">
            {visibleNotes.map(note => (
              <li key={note.id} className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-700">
                    {verseLabel(note.verseId)}
                  </span>
                  <div className="flex items-center">
                    <button
                      onClick={() => onEditNote(note.verseId)}
                      className="text-stone-400 hover:text-amber-600 transition"
                      aria-label="Edit note"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.verseId)}
                      className="text-stone-400 hover:text-red-500 transition"
                      aria-label="Delete note"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-stone-100" />

      {/* Highlights */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
          Highlights
        </p>
        <p className={`text-sm mb-2 ${selectedVerse ? 'text-stone-600' : 'text-stone-400'}`}>
          Highlight selected verse
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
    </div>
  );
}
