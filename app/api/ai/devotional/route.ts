import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference } = await req.json() as { verseText: string; reference: string };
  if (!verseText || !reference) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const devotional = await geminiService.generateDevotional(verseText, reference);
  return NextResponse.json({ devotional });
}
