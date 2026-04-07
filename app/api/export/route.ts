import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { createClient } from '@/lib/supabase/server';
import { bibleService } from '@/lib/bible/service';

// Generates a PDF of a chapter with inline notes
export async function GET(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { searchParams } = new URL(req.url);
  const book = searchParams.get('book') ?? 'John';
  const chapter = Number(searchParams.get('chapter') ?? '1');
  const translation = searchParams.get('translation') ?? 'web';

  const supabase = await createClient();
  const [verses, notesRes] = await Promise.all([
    bibleService.getChapter(book, chapter, translation),
    supabase.from('notes').select('verse, content').eq('user_id', check.user.id).eq('book', book).eq('chapter', chapter),
  ]);

  const notes = notesRes.data ?? [];
  const noteMap: Record<number, string> = {};
  for (const n of notes) { if (n.verse) noteMap[n.verse] = n.content; }

  const { renderToBuffer, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');

  const styles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Times-Roman', fontSize: 11, color: '#1a1a1a' },
    title: { fontSize: 20, fontFamily: 'Times-Bold', marginBottom: 4 },
    translation: { fontSize: 9, color: '#888', marginBottom: 20 },
    verseRow: { flexDirection: 'row', marginBottom: 8 },
    verseNum: { width: 24, fontSize: 9, color: '#888', paddingTop: 1 },
    verseText: { flex: 1, lineHeight: 1.6 },
    noteText: { marginLeft: 24, marginTop: 2, marginBottom: 6, fontSize: 9, color: '#7c6432', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#d97706', paddingLeft: 6 },
  });

  const doc = (
    // @ts-expect-error — react-pdf JSX
    <Document>
      {/* @ts-expect-error */}
      <Page style={styles.page}>
        {/* @ts-expect-error */}
        <Text style={styles.title}>{book} {chapter}</Text>
        {/* @ts-expect-error */}
        <Text style={styles.translation}>{translation.toUpperCase()} Translation · Exported from Scripture Stream</Text>
        {verses.map(v => (
          // @ts-expect-error
          <View key={v.id}>
            {/* @ts-expect-error */}
            <View style={styles.verseRow}>
              {/* @ts-expect-error */}
              <Text style={styles.verseNum}>{v.number}</Text>
              {/* @ts-expect-error */}
              <Text style={styles.verseText}>{v.text}</Text>
            </View>
            {noteMap[v.number] && (
              // @ts-expect-error
              <Text style={styles.noteText}>✎ {noteMap[v.number]}</Text>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${book}-${chapter}.pdf"`,
    },
  });
}
