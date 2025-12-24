
export enum Translation {
  NIV = 'NIV',
  KJV = 'KJV',
  ESV = 'ESV',
  NLT = 'NLT',
  NKJV = 'NKJV'
}

export interface Verse {
  id: string;
  number: number;
  text: string;
  book: string;
  chapter: number;
  translation: Translation;
}

export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  translation: Translation;
  createdAt: number;
}

export interface Note {
  id: string;
  verseId: string;
  content: string;
  lastUpdated: number;
}

export interface Highlight {
  id: string;
  verseId: string;
  color: string;
}

export interface ReadingProgress {
  book: string;
  chapter: number;
  completedAt: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans';
}

export interface BibleBook {
  name: string;
  chapters: number;
  category: 'Old Testament' | 'New Testament';
}
