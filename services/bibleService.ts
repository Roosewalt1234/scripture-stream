
import { BIBLE_BOOK_ID_BY_NAME, DEFAULT_TRANSLATION } from '../constants';
import { Translation, Verse } from '../types';

type BibleApiVerse = {
  book_id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

type BibleApiChapterResponse = {
  verses: BibleApiVerse[];
};

const BIBLE_API_BASE = 'https://bible-api.com/data';
const chapterCache = new Map<string, Verse[]>();

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

/**
 * BibleService retrieves Bible text from bible-api.com (public domain / freely-licensed translations).
 * This keeps scripture reading available without requiring an LLM API key in the browser.
 */
export const bibleService = {
  getChapter: async (book: string, chapter: number, translation: Translation): Promise<Verse[]> => {
    const translationId = asNonEmptyString(translation) ?? DEFAULT_TRANSLATION;
    const bookId = BIBLE_BOOK_ID_BY_NAME[book];
    if (!bookId) {
      throw new Error(`Unknown book: ${book}`);
    }

    const cacheKey = `${translationId}:${bookId}:${chapter}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) return cached;

    const url = `${BIBLE_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Not found for ${translationId}: ${book} ${chapter}.`);
        }
        if (res.status === 429) {
          throw new Error('Rate limited by the scripture source. Please try again in a moment.');
        }
        throw new Error(`Scripture source error (${res.status}).`);
      }

      const data = (await res.json()) as BibleApiChapterResponse;
      const verses: Verse[] = (data.verses || []).map((v) => ({
        id: `${translationId}-${book}-${chapter}-${v.verse}`,
        number: v.verse,
        text: (v.text || '').trim(),
        book,
        chapter,
        translation: translationId,
      }));

      chapterCache.set(cacheKey, verses);
      return verses;
    } catch (error) {
      console.error('Error fetching scripture:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to load ${book} ${chapter}. Please check your connection.`);
    }
  },
};
