import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text, voiceName } = await req.json() as { text: string; voiceName?: string };
  const audioData = await geminiService.generateSpeech(text, voiceName);
  return NextResponse.json({ audioData });
}
