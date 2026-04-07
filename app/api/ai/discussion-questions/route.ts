import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { book, chapter, verseText } = await req.json() as {
    book: string; chapter: number; verseText?: string;
  };
  if (!book || !chapter) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const questions = await geminiService.generateDiscussionQuestions(book, chapter, verseText);
  return NextResponse.json({ questions });
}
