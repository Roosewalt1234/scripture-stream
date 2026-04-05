import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';
import { AI_FREE_LIMITS, isPremium } from '@/types';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Parse body
  const { verseText, reference } = await req.json() as { verseText: string; reference: string };
  if (!verseText || !reference) {
    return NextResponse.json({ error: 'Missing verseText or reference' }, { status: 400 });
  }

  // 3. Check subscription
  const { data: sub } = await supabase
    .from('subscriptions').select('plan, status, current_period_end')
    .eq('user_id', user.id).single();

  const paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);

  // 4. Rate limit free users
  if (!paid) {
    const service = createServiceClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: usage } = await service
      .from('ai_usage').select('explanation_count').eq('user_id', user.id).eq('date', today).single();

    const count = usage?.explanation_count ?? 0;
    if (count >= AI_FREE_LIMITS.explanation) {
      return NextResponse.json(
        { error: 'Daily limit reached. Upgrade to Premium for unlimited explanations.' },
        { status: 429 }
      );
    }

    // Increment usage
    await service.from('ai_usage').upsert({
      user_id: user.id, date: today,
      explanation_count: count + 1,
    }, { onConflict: 'user_id,date' });
  }

  // 5. Generate explanation
  const explanation = await geminiService.explainVerse(verseText, reference);
  return NextResponse.json({ explanation });
}
