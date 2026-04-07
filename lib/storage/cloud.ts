// CLIENT-SIDE Supabase operations for paid users' notes/highlights/bookmarks
import { createBrowserClient } from '@supabase/ssr';
import { Note, Highlight } from '@/types';

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const cloudStore = {
  async getNotes(book: string, chapter: number): Promise<Note[]> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('notes').select('verse, content, updated_at').eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
    return (data ?? []).map(n => ({
      id: `cloud-${book}-${chapter}-${n.verse}`,
      verseId: `${book.toLowerCase()}-${chapter}-${n.verse}`,
      content: n.content,
      lastUpdated: new Date(n.updated_at).getTime(),
    }));
  },

  async saveNote(book: string, chapter: number, verse: number, content: string): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    if (!content.trim()) {
      await sb.from('notes').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse);
      return;
    }
    await sb.from('notes').upsert({ user_id: user.id, book, chapter, verse, content, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter,verse' });
  },

  async getHighlights(book: string, chapter: number): Promise<Highlight[]> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];
    const { data } = await sb.from('highlights').select('verse, color').eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
    return (data ?? []).map(h => ({
      id: `cloud-${book}-${chapter}-${h.verse}`,
      verseId: `${book.toLowerCase()}-${chapter}-${h.verse}`,
      color: h.color,
    }));
  },

  async saveHighlight(book: string, chapter: number, verse: number, color: string): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    if (!color) {
      await sb.from('highlights').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse);
      return;
    }
    await sb.from('highlights').upsert({ user_id: user.id, book, chapter, verse, color }, { onConflict: 'user_id,book,chapter,verse' });
  },

  async markRead(book: string, chapter: number): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('reading_progress').upsert({ user_id: user.id, book, chapter, completed_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter' });
  },

  async unmarkRead(book: string, chapter: number): Promise<void> {
    const sb = getClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from('reading_progress').delete().eq('user_id', user.id).eq('book', book).eq('chapter', chapter);
  },
};
