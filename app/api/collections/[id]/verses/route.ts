import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: verses, error } = await supabase
    .from('collection_verses')
    .select('id, verse_id, verse_text, reference, book, chapter, verse_number, translation, added_at')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .order('added_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verses: verses ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collection_id } = await params;
  const { verse_id, verse_text, reference, book, chapter, verse_number, translation } =
    await req.json() as {
      verse_id: string; verse_text: string; reference: string;
      book: string; chapter: number; verse_number: number; translation: string;
    };

  const { data: col } = await supabase
    .from('verse_collections')
    .select('id')
    .eq('id', collection_id)
    .eq('user_id', user.id)
    .single();
  if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('collection_verses')
    .insert({ collection_id, user_id: user.id, verse_id, verse_text, reference, book, chapter, verse_number, translation })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collection_id } = await params;
  const { verse_id } = await req.json() as { verse_id: string };

  const { error } = await supabase
    .from('collection_verses')
    .delete()
    .eq('collection_id', collection_id)
    .eq('verse_id', verse_id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
