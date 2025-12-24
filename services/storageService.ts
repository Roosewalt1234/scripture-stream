
import { Bookmark, Note, Highlight, ReadingProgress } from '../types';

export const storageService = {
  getBookmarks: (): Bookmark[] => JSON.parse(localStorage.getItem('ss_bookmarks') || '[]'),
  saveBookmark: (b: Bookmark) => {
    const bs = storageService.getBookmarks();
    localStorage.setItem('ss_bookmarks', JSON.stringify([...bs, b]));
  },
  removeBookmark: (id: string) => {
    const bs = storageService.getBookmarks();
    localStorage.setItem('ss_bookmarks', JSON.stringify(bs.filter(b => b.id !== id)));
  },

  getNotes: (): Note[] => JSON.parse(localStorage.getItem('ss_notes') || '[]'),
  saveNote: (n: Note) => {
    const ns = storageService.getNotes();
    const existingIndex = ns.findIndex(x => x.verseId === n.verseId);
    if (existingIndex > -1) {
      ns[existingIndex] = n;
      localStorage.setItem('ss_notes', JSON.stringify(ns));
    } else {
      localStorage.setItem('ss_notes', JSON.stringify([...ns, n]));
    }
  },

  getHighlights: (): Highlight[] => JSON.parse(localStorage.getItem('ss_highlights') || '[]'),
  saveHighlight: (h: Highlight) => {
    const hs = storageService.getHighlights();
    localStorage.setItem('ss_highlights', JSON.stringify([...hs, h]));
  },
  removeHighlight: (verseId: string) => {
    const hs = storageService.getHighlights();
    localStorage.setItem('ss_highlights', JSON.stringify(hs.filter(h => h.verseId !== verseId)));
  },

  getReadingProgress: (): ReadingProgress[] => JSON.parse(localStorage.getItem('ss_progress') || '[]'),
  markAsRead: (book: string, chapter: number) => {
    const progress = storageService.getReadingProgress();
    if (!progress.some(p => p.book === book && p.chapter === chapter)) {
      const newProgress: ReadingProgress = { book, chapter, completedAt: Date.now() };
      localStorage.setItem('ss_progress', JSON.stringify([...progress, newProgress]));
    }
  },
  unmarkAsRead: (book: string, chapter: number) => {
    const progress = storageService.getReadingProgress();
    localStorage.setItem('ss_progress', JSON.stringify(progress.filter(p => !(p.book === book && p.chapter === chapter))));
  },
  isChapterRead: (book: string, chapter: number): boolean => {
    const progress = storageService.getReadingProgress();
    return progress.some(p => p.book === book && p.chapter === chapter);
  }
};
