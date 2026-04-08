import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { word, verseText, reference } = await req.json() as {
    word: string; verseText: string; reference: string;
  };
  if (!word || !verseText || !reference) {
    return NextResponse.json({ error: 'Missing word, verseText, or reference' }, { status: 400 });
  }

  const result = await geminiService.getWordStudy(word.replace(/[^a-zA-Z']/g, ''), verseText, reference);
  return NextResponse.json(result);
}
