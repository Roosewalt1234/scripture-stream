'use client';
import { useState, useRef, useEffect } from 'react';
import { Verse } from '@/types';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface Message { role: 'user' | 'assistant'; content: string; }

interface Props {
  book: string;
  chapter: number;
  selectedVerse: Verse | null;
}

const STARTER_QUESTIONS = [
  'What is the main theme of this chapter?',
  'What does this teach about prayer?',
  'How should I apply this today?',
];

export function PanelStudyAssistant({ book, chapter, selectedVerse }: Props) {
  const { isPaid } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          book, chapter,
          selectedVerse: selectedVerse?.text ?? null,
          sessionId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.sessionId) setSessionId(data.sessionId);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    }
    setLoading(false);
  }

  if (!isPaid) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full text-center p-4 gap-4">
          <span className="text-4xl">🤖</span>
          <div>
            <p className="font-semibold text-stone-800 mb-1">AI Study Assistant</p>
            <p className="text-sm text-stone-500">Ask anything about the Bible. Context-aware, theologically grounded.</p>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
          >
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && (
          <UpgradeModal
            featureName="AI Study Assistant"
            featureDescription="Ask anything about the Bible. Context-aware answers that know what you're reading."
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-stone-400 mb-3">Reading {book} {chapter} — ask anything:</p>
            {STARTER_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="w-full text-left text-xs p-3 rounded-lg bg-stone-50 border border-stone-200 hover:bg-amber-50 hover:border-amber-200 transition text-stone-700"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm rounded-xl p-3 ${msg.role === 'user' ? 'bg-amber-50 text-amber-900 ml-4' : 'bg-stone-100 text-stone-800 mr-4'}`}>
            <p className="text-xs font-semibold mb-1 opacity-60">{msg.role === 'user' ? 'You' : 'Assistant'}</p>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bg-stone-100 rounded-xl p-3 mr-4 text-sm text-stone-500 animate-pulse">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2 pt-3 border-t border-stone-100">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
          placeholder="Ask about this passage…"
          className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
