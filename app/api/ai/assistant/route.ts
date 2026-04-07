import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { messages, book, chapter, selectedVerse, sessionId } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    book: string;
    chapter: number;
    selectedVerse: string | null;
    sessionId: string | null;
  };

  if (!messages?.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

  const supabase = await createClient();

  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const { data: session } = await supabase
      .from('chat_sessions').insert({ user_id: check.user.id, book, chapter }).select('id').single();
    activeSessionId = session?.id ?? null;
  }

  if (activeSessionId) {
    const lastMsg = messages[messages.length - 1];
    await supabase.from('chat_messages').insert({
      session_id: activeSessionId, role: lastMsg.role, content: lastMsg.content,
    });
  }

  const reply = await geminiService.studyAssistant(messages, book, chapter, selectedVerse);

  if (activeSessionId) {
    await supabase.from('chat_messages').insert({
      session_id: activeSessionId, role: 'assistant', content: reply,
    });
  }

  return NextResponse.json({ reply, sessionId: activeSessionId });
}
