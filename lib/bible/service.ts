import { BIBLE_BOOK_ID_BY_NAME, DEFAULT_TRANSLATION } from '@/lib/constants';
import { Translation, Verse } from '@/types';

const BIBLE_API_BASE = 'https://bible-api.com/data';
const chapterCache = new Map<string, Verse[]>();

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export const bibleService = {
  getChapter: async (book: string, chapter: number, translation: Translation): Promise<Verse[]> => {
    const translationId = asNonEmptyString(translation) ?? DEFAULT_TRANSLATION;
    const bookId = BIBLE_BOOK_ID_BY_NAME[book];
    if (!bookId) throw new Error(`Unknown book: ${book}`);

    const cacheKey = `${translationId}:${bookId}:${chapter}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) return cached;

    const url = `${BIBLE_API_BASE}/${encodeURIComponent(translationId)}/${encodeURIComponent(bookId)}/${chapter}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Not found for ${translationId}: ${book} ${chapter}.`);
      if (res.status === 429) throw new Error('Rate limited. Please try again in a moment.');
      throw new Error(`Scripture source error (${res.status}).`);
    }

    const data = await res.json() as { verses: { book_id: string; book: string; chapter: number; verse: number; text: string }[] };
    const verses: Verse[] = (data.verses || []).map(v => ({
      id: `${translationId}-${book}-${chapter}-${v.verse}`,
      number: v.verse,
      text: (v.text || '').trim(),
      book,
      chapter,
      translation: translationId,
    }));

    chapterCache.set(cacheKey, verses);
    return verses;
  },
};
