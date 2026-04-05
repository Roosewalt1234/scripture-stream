import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { verseText, style } = await req.json() as { verseText: string; style: string };

  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();
  const paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('image_count').eq('user_id', user.id).eq('date', today).single();
    const count = usage?.image_count ?? 0;
    if (count >= AI_FREE_LIMITS.image) {
      return NextResponse.json({ error: 'Daily limit reached. Upgrade to Premium.' }, { status: 429 });
    }
    await service.from('ai_usage').upsert({ user_id: user.id, date: today, image_count: count + 1 }, { onConflict: 'user_id,date' });
  }

  const imageData = await geminiService.generateVerseArt(verseText, style ?? 'Ethereal');
  return NextResponse.json({ imageData });
}
