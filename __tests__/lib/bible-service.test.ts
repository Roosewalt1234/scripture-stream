import { bibleService } from '@/lib/bible/service';

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => jest.clearAllMocks());

test('getChapter returns verses from API', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      verses: [
        { book_id: 'jhn', book: 'John', chapter: 3, verse: 16, text: 'For God so loved...' }
      ]
    })
  });

  const verses = await bibleService.getChapter('John', 3, 'web');
  expect(verses).toHaveLength(1);
  expect(verses[0].text).toBe('For God so loved...');
  expect(verses[0].id).toBe('web-John-3-16');
});

test('getChapter throws on 404', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 404 });
  await expect(bibleService.getChapter('John', 99, 'web')).rejects.toThrow('Not found');
});

test('getChapter uses cache on second call', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ verses: [{ book_id: 'jhn', book: 'John', chapter: 1, verse: 1, text: 'In the beginning' }] })
  });

  await bibleService.getChapter('John', 1, 'web');
  await bibleService.getChapter('John', 1, 'web');
  expect(fetch).toHaveBeenCalledTimes(1); // second call hits cache
});
