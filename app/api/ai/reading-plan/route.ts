import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { goal, durationDays, currentBook } = await req.json() as {
    goal: string; durationDays: number; currentBook?: string;
  };
  if (!goal || !durationDays) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const plan = await geminiService.generateReadingPlan(goal, durationDays, currentBook);
  return NextResponse.json({ plan });
}
