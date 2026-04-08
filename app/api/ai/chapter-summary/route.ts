import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { book, chapter, verseTexts } = await req.json() as {
    book: string; chapter: number; verseTexts: string[];
  };
  if (!book || !chapter || !Array.isArray(verseTexts) || verseTexts.length === 0) {
    return NextResponse.json({ error: 'Missing book, chapter, or verseTexts' }, { status: 400 });
  }

  const result = await geminiService.generateChapterSummary(book, chapter, verseTexts);
  return NextResponse.json(result);
}
