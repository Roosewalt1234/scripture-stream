import { NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const uid = check.user.id;

  const [bookmarks, highlights, notes, progress, soap, memory] = await Promise.all([
    supabase.from('bookmarks').select('*').eq('user_id', uid),
    supabase.from('highlights').select('*').eq('user_id', uid),
    supabase.from('notes').select('*').eq('user_id', uid),
    supabase.from('reading_progress').select('*').eq('user_id', uid),
    supabase.from('soap_entries').select('*').eq('user_id', uid),
    supabase.from('memory_verses').select('*').eq('user_id', uid),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      bookmarks: bookmarks.data ?? [],
      highlights: highlights.data ?? [],
      notes: notes.data ?? [],
      readingProgress: progress.data ?? [],
      soapEntries: soap.data ?? [],
      memoryVerses: memory.data ?? [],
    },
  };

  const json = JSON.stringify(exportData, null, 2);
  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="scripture-stream-backup-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
