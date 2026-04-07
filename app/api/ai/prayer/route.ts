import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference, prayerType } = await req.json() as {
    verseText: string; reference: string;
    prayerType: 'gratitude' | 'intercession' | 'confession' | 'praise';
  };
  if (!verseText || !reference || !prayerType) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const prayer = await geminiService.generatePrayer(verseText, reference, prayerType);
  return NextResponse.json({ prayer });
}
