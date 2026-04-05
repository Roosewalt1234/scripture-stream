import { ReaderView } from '@/components/reader/reader-view';
import { BIBLE_BOOKS } from '@/lib/constants';

// Decode URL book slug (e.g. "1-samuel" → "1 Samuel")
function decodeBookSlug(slug: string): string {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  const match = BIBLE_BOOKS.find(b => b.name.toLowerCase() === decoded.toLowerCase());
  return match?.name ?? decoded;
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const book = decodeBookSlug(bookSlug);
  const chapter = parseInt(chapterStr, 10) || 1;

  return <ReaderView initialBook={book} initialChapter={chapter} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ book: string; chapter: string }>;
}) {
  const { book, chapter } = await params;
  return {
    title: `${decodeURIComponent(book)} ${chapter} — Scripture Stream`,
  };
}
