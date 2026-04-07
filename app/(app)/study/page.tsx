'use client';
import { useState } from 'react';
import { SoapJournal } from '@/components/study/soap-journal';
import { MemoryFlashcards } from '@/components/study/memory-flashcard';

type Tab = 'soap' | 'memory';

export default function StudyPage() {
  const [tab, setTab] = useState<Tab>('soap');

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-serif text-stone-800 mb-2">Study Tools</h1>
      <p className="text-stone-500 text-sm mb-6">Deepen your Bible study with journaling and scripture memorization.</p>

      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {([
          { id: 'soap', label: '📖 SOAP Journal' },
          { id: 'memory', label: '🧠 Memory Cards' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'soap' && <SoapJournal book="John" chapter={3} />}
      {tab === 'memory' && <MemoryFlashcards />}
    </div>
  );
}
