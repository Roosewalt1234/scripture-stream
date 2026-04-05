'use client';
import { Bookmark, Note, Highlight, ReadingProgress } from '@/types';

// localStorage keys
const KEYS = {
  bookmarks: 'ss_bookmarks',
  notes: 'ss_notes',
  highlights: 'ss_highlights',
  progress: 'ss_progress',
} as const;

function get<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function set<T>(key: string, value: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const localStore = {
  // Bookmarks
  getBookmarks: (): Bookmark[] => get(KEYS.bookmarks),
  saveBookmark: (b: Bookmark) => set(KEYS.bookmarks, [...get<Bookmark>(KEYS.bookmarks), b]),
  removeBookmark: (id: string) => set(KEYS.bookmarks, get<Bookmark>(KEYS.bookmarks).filter(b => b.id !== id)),

  // Notes
  getNotes: (): Note[] => get(KEYS.notes),
  saveNote: (n: Note) => {
    const notes = get<Note>(KEYS.notes);
    const idx = notes.findIndex(x => x.verseId === n.verseId);
    if (idx > -1) { notes[idx] = n; set(KEYS.notes, notes); }
    else set(KEYS.notes, [...notes, n]);
  },

  // Highlights
  getHighlights: (): Highlight[] => get(KEYS.highlights),
  saveHighlight: (h: Highlight) => set(KEYS.highlights, [...get<Highlight>(KEYS.highlights), h]),
  removeHighlight: (verseId: string) => set(KEYS.highlights, get<Highlight>(KEYS.highlights).filter(h => h.verseId !== verseId)),

  // Reading progress
  getProgress: (): ReadingProgress[] => get(KEYS.progress),
  markAsRead: (book: string, chapter: number) => {
    const progress = get<ReadingProgress>(KEYS.progress);
    if (!progress.some(p => p.book === book && p.chapter === chapter)) {
      set(KEYS.progress, [...progress, { book, chapter, completedAt: Date.now() }]);
    }
  },
  unmarkAsRead: (book: string, chapter: number) =>
    set(KEYS.progress, get<ReadingProgress>(KEYS.progress).filter(p => !(p.book === book && p.chapter === chapter))),
  isRead: (book: string, chapter: number): boolean =>
    get<ReadingProgress>(KEYS.progress).some(p => p.book === book && p.chapter === chapter),
};
