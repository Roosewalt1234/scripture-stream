'use client';
import { useState, useEffect } from 'react';
import { Verse } from '@/types';

interface Collection { id: string; name: string; color: string; }

interface Props {
  verse: Verse | null;
  translation: string;
  onClose: () => void;
}

export function CollectionPickerModal({ verse, translation, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(d => { setCollections(d.collections ?? []); setLoading(false); });
  }, []);

  async function saveToCollection(collectionId: string) {
    if (!verse) return;
    setSaving(collectionId);
    await fetch(`/api/collections/${collectionId}/verses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verse_id: verse.id,
        verse_text: verse.text,
        reference: `${verse.book} ${verse.chapter}:${verse.number}`,
        book: verse.book,
        chapter: verse.chapter,
        verse_number: verse.number,
        translation,
      }),
    });
    setSaving(''); setSaved(collectionId);
    setTimeout(() => { setSaved(''); onClose(); }, 800);
  }

  async function createAndSave() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (data.collection) {
      setCollections(c => [data.collection, ...c]);
      await saveToCollection(data.collection.id);
    }
    setCreating(false); setNewName('');
  }

  if (!verse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-md p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-stone-800">Save to Collection</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        <p className="text-xs text-stone-500 italic mb-4 bg-stone-50 rounded p-2">
          &ldquo;{verse.text.slice(0, 80)}{verse.text.length > 80 ? '…' : ''}&rdquo;
          <span className="block font-medium not-italic text-stone-700 mt-1">
            {verse.book} {verse.chapter}:{verse.number}
          </span>
        </p>

        {loading ? (
          <p className="text-sm text-stone-400 text-center py-4">Loading collections…</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {collections.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-2">No collections yet. Create one below.</p>
            )}
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => saveToCollection(col.id)}
                disabled={!!saving || saved === col.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition disabled:opacity-60"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-sm text-stone-700 flex-1 text-left">{col.name}</span>
                {saved === col.id && <span className="text-xs text-green-600 font-medium">✓ Saved!</span>}
                {saving === col.id && <span className="text-xs text-stone-400">Saving…</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createAndSave()}
            placeholder="New collection name…"
            className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={createAndSave}
            disabled={!newName.trim() || creating}
            className="px-3 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 transition"
          >
            {creating ? '…' : '+ Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
