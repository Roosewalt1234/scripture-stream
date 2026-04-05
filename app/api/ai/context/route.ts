import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { book, chapter } = await req.json() as { book: string; chapter: number };
  if (!book || !chapter) return NextResponse.json({ error: 'Missing book or chapter' }, { status: 400 });

  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();
  const paid = isPremium(sub ? { ...sub, id: '', userId: user.id, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('context_count').eq('user_id', user.id).eq('date', today).single();
    const count = usage?.context_count ?? 0;
    if (count >= AI_FREE_LIMITS.context) {
      return NextResponse.json({ error: 'Daily limit reached. Upgrade to Premium.' }, { status: 429 });
    }
    await service.from('ai_usage').upsert({ user_id: user.id, date: today, context_count: count + 1 }, { onConflict: 'user_id,date' });
  }

  const context = await geminiService.getHistoricalContext(book, chapter);
  return NextResponse.json({ context });
}
