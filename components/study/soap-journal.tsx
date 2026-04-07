'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';
import { UpgradeModal } from '@/components/upgrade-modal';

interface SoapEntry {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  scripture: string;
  observation: string;
  application: string;
  prayer: string;
  created_at: string;
}

interface Props {
  book: string;
  chapter: number;
  verse?: number;
  verseText?: string;
}

export function SoapJournal({ book, chapter, verse, verseText }: Props) {
  const { isPaid } = useSubscription();
  const [entries, setEntries] = useState<SoapEntry[]>([]);
  const [form, setForm] = useState({ scripture: verseText ?? '', observation: '', application: '', prayer: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isPaid) return;
    setLoading(true);
    fetch(`/api/soap?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, [book, chapter, isPaid]);

  async function save() {
    if (!form.scripture.trim()) return;
    setSaving(true);
    const method = editingId ? 'PATCH' : 'POST';
    const body = editingId ? { id: editingId, ...form } : { book, chapter, verse, ...form };
    const res = await fetch('/api/soap', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const { entry } = await res.json();
      if (editingId) {
        setEntries(prev => prev.map(e => e.id === editingId ? entry : e));
      } else {
        setEntries(prev => [entry, ...prev]);
      }
      setForm({ scripture: '', observation: '', application: '', prayer: '' });
      setEditingId(null);
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/soap?id=${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function aiPreFill() {
    if (!form.scripture) return;
    setAiLoading(true);
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verseText: form.scripture, reference: `${book} ${chapter}${verse ? ':' + verse : ''}` }),
    });
    const { explanation } = await res.json();
    if (explanation) setForm(f => ({ ...f, observation: explanation }));
    setAiLoading(false);
  }

  if (!isPaid) {
    return (
      <>
        <div className="text-center p-6 space-y-3">
          <span className="text-3xl">📖</span>
          <p className="font-semibold text-stone-800">SOAP Journaling</p>
          <p className="text-sm text-stone-500">Scripture · Observation · Application · Prayer</p>
          <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition">
            Unlock with Premium
          </button>
        </div>
        {showUpgrade && <UpgradeModal featureName="SOAP Journaling" featureDescription="A structured journaling method to deepen your daily Bible study." onClose={() => setShowUpgrade(false)} />}
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">New Journal Entry</h3>
        {[
          { key: 'scripture', label: 'S — Scripture', placeholder: 'The verse or passage…', rows: 3 },
          { key: 'observation', label: 'O — Observation', placeholder: 'What does it say?', rows: 3 },
          { key: 'application', label: 'A — Application', placeholder: 'How does it apply to my life?', rows: 3 },
          { key: 'prayer', label: 'P — Prayer', placeholder: 'My prayer in response…', rows: 3 },
        ].map(field => (
          <div key={field.key}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-600">{field.label}</label>
              {field.key === 'observation' && (
                <button onClick={aiPreFill} disabled={aiLoading} className="text-xs text-amber-600 hover:underline disabled:opacity-50">
                  {aiLoading ? 'Loading…' : '✦ AI pre-fill'}
                </button>
              )}
            </div>
            <textarea
              value={form[field.key as keyof typeof form]}
              onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              rows={field.rows}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={saving || !form.scripture.trim()}
          className="w-full py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>

      {/* Past entries */}
      {loading ? <p className="text-sm text-stone-400">Loading entries…</p> : entries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Past Entries — {book} {chapter}</h3>
          {entries.map(entry => (
            <div key={entry.id} className="border border-stone-200 rounded-xl p-4 text-sm space-y-2">
              <div className="flex justify-between items-start">
                <p className="text-xs text-stone-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ scripture: entry.scripture, observation: entry.observation, application: entry.application, prayer: entry.prayer }); setEditingId(entry.id); }} className="text-xs text-amber-600 hover:underline">Edit</button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                </div>
              </div>
              <p className="text-stone-700 italic">"{entry.scripture}"</p>
              {entry.observation && <p className="text-stone-600"><span className="font-semibold">O:</span> {entry.observation}</p>}
              {entry.application && <p className="text-stone-600"><span className="font-semibold">A:</span> {entry.application}</p>}
              {entry.prayer && <p className="text-stone-600"><span className="font-semibold">P:</span> {entry.prayer}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
