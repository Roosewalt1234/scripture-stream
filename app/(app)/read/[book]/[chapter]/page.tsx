import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { ReaderView } from '@/components/reader/reader-view';
import { notFound } from 'next/navigation';
import { BIBLE_BOOKS } from '@/lib/constants';

interface Props { params: Promise<{ book: string; chapter: string }> }

export default async function ReaderPage({ params }: Props) {
  const { book, chapter } = await params;
  const chapterNum = Number(chapter);
  if (isNaN(chapterNum) || chapterNum < 1) notFound();

  const decodedBook = decodeURIComponent(book).replace(/-/g, ' ');
  const bookDef = BIBLE_BOOKS.find(b => b.name.toLowerCase() === decodedBook.toLowerCase());
  if (!bookDef) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let paid = false;
  if (user) {
    const { data: sub } = await supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).single();
    paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);
  }

  return <ReaderView initialBook={bookDef.name} initialChapter={chapterNum} isPremium={paid} />;
}

export async function generateMetadata({ params }: Props) {
  const { book, chapter } = await params;
  return {
    title: `${decodeURIComponent(book)} ${chapter} — Scripture Stream`,
  };
}
