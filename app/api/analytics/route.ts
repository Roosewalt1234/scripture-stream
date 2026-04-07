import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [progressRes, highlightRes, notesRes] = await Promise.all([
    supabase.from('reading_progress').select('book, chapter, completed_at').eq('user_id', user.id),
    supabase.from('highlights').select('book').eq('user_id', user.id),
    supabase.from('notes').select('book').eq('user_id', user.id),
  ]);

  const progress = progressRes.data ?? [];
  const highlights = highlightRes.data ?? [];
  const notes = notesRes.data ?? [];

  // Build last-90-days calendar
  const today = new Date();
  const calendarMap: Record<string, number> = {};
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    calendarMap[d.toISOString().split('T')[0]] = 0;
  }
  for (const p of progress) {
    const day = p.completed_at?.split('T')[0];
    if (day && calendarMap[day] !== undefined) calendarMap[day]++;
  }

  // Streak
  let streak = 0;
  const sortedDays = Object.keys(calendarMap).sort().reverse();
  for (const day of sortedDays) {
    if (calendarMap[day] > 0) streak++;
    else break;
  }

  // Book counts
  const bookCounts: Record<string, number> = {};
  for (const p of progress) {
    bookCounts[p.book] = (bookCounts[p.book] ?? 0) + 1;
  }
  const topBooks = Object.entries(bookCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([book, chapters]) => ({ book, chapters }));

  return NextResponse.json({
    totalChapters: progress.length,
    totalHighlights: highlights.length,
    totalNotes: notes.length,
    streak,
    calendar: calendarMap,
    topBooks,
  });
}
