import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, theme } = await req.json() as {
    verseText: string; reference: string; theme: string;
  };
  if (!verseText || !reference || !theme) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const outline = await geminiService.generateSermonOutline(verseText, reference, theme);
  return NextResponse.json({ outline });
}
