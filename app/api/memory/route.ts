import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { sm2, nextReviewDate } from '@/lib/sm2';

// GET /api/memory — list due cards (or all cards if ?all=true)
export async function GET(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === 'true';
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('memory_verses').select('*').eq('user_id', check.user.id).order('next_review');
  if (!all) query = query.lte('next_review', today);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verses: data });
}

// POST /api/memory — add verse to memory
export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { book, chapter, verse, verseText, translation } = await req.json() as {
    book: string; chapter: number; verse: number; verseText: string; translation: string;
  };
  if (!book || !chapter || !verse || !verseText) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: existing } = await supabase
    .from('memory_verses').select('id').eq('user_id', check.user.id).eq('book', book).eq('chapter', chapter).eq('verse', verse).single();
  if (existing) return NextResponse.json({ error: 'Verse already in memory list' }, { status: 409 });

  const { data, error } = await supabase.from('memory_verses').insert({
    user_id: check.user.id, book, chapter, verse, verse_text: verseText, translation,
    ease_factor: 2.5, interval_days: 1, next_review: new Date().toISOString().split('T')[0],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data }, { status: 201 });
}

// PATCH /api/memory — submit a review (SM-2)
export async function PATCH(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { id, quality } = await req.json() as { id: string; quality: 0 | 1 | 2 | 3 | 4 | 5 };
  if (!id || quality === undefined) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { data: existing } = await supabase
    .from('memory_verses').select('ease_factor, interval_days, total_reviews').eq('id', id).eq('user_id', check.user.id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { easeFactor, intervalDays } = sm2(
    { easeFactor: existing.ease_factor, intervalDays: existing.interval_days },
    quality,
  );

  const { data, error } = await supabase.from('memory_verses').update({
    ease_factor: easeFactor,
    interval_days: intervalDays,
    next_review: nextReviewDate(intervalDays),
    total_reviews: (existing.total_reviews ?? 0) + 1,
  }).eq('id', id).eq('user_id', check.user.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data });
}

// DELETE /api/memory?id=...
export async function DELETE(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { error } = await supabase.from('memory_verses').delete().eq('id', id).eq('user_id', check.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
