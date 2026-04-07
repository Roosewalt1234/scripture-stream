import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, book, chapter, verse, style } = await req.json() as {
    verseText: string; reference: string; book: string; chapter: number; verse: number; style: string;
  };
  if (!verseText || !reference || !style) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const { devotional, prayer, imageBase64 } = await geminiService.generateMorningCard(verseText, reference, style);

  // Save to morning_cards table
  const supabase = await createClient();
  await supabase.from('morning_cards').insert({
    user_id: check.user.id,
    book, chapter, verse,
    devotional_text: devotional,
    image_url: imageBase64 ? 'generated' : null,
  });

  return NextResponse.json({ devotional, prayer, imageBase64 });
}
