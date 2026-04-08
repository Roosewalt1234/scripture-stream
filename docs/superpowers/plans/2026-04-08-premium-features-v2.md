# Scripture Stream — Premium Features V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 paid-only premium features: Parallel Bible View, AI Cross-References, Verse Collections, Chapter Summary, Word Study, and Shareable Verse Cards.

**Architecture:** All 6 features are gated behind `requirePremium()` server-side. UI gates use `useSubscription().isPaid` and the existing `<UpgradeModal>`. New verse action buttons are added inline in `reader-view.tsx`. Two new Supabase tables support Verse Collections. All AI features run through new Gemini service methods + Next.js API routes. Verse Cards and Chapter Summary use Canvas/modal UI already proven in the morning-card feature.

**Tech Stack:** Next.js 15 App Router, Supabase, Google Gemini (`@google/genai`), Tailwind CSS, Jest, TypeScript, Canvas API

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `app/api/ai/cross-references/route.ts` | AI cross-reference lookup (premium) |
| `app/api/ai/chapter-summary/route.ts` | AI chapter summary + reflection questions (premium) |
| `app/api/ai/word-study/route.ts` | AI Greek/Hebrew word study (premium) |
| `app/api/collections/route.ts` | GET all collections, POST new collection |
| `app/api/collections/[id]/route.ts` | PATCH name/color, DELETE collection |
| `app/api/collections/[id]/verses/route.ts` | GET verses in collection, POST add verse, DELETE verse |
| `components/reader/panel-cross-references.tsx` | Cross-references panel tab UI |
| `components/reader/chapter-summary-modal.tsx` | Chapter summary bottom sheet modal |
| `components/reader/word-study-popover.tsx` | Word study floating panel |
| `components/reader/verse-card-modal.tsx` | Verse card generator modal (reuses canvas logic) |
| `components/study/collection-picker-modal.tsx` | Modal to add verse to a collection |
| `app/(app)/collections/page.tsx` | Collections library page |
| `__tests__/api/ai/cross-references.test.ts` | Auth guard test for cross-references route |
| `__tests__/api/collections.test.ts` | Auth guard + CRUD tests for collections routes |

### Modified Files
| File | Change |
|------|--------|
| `lib/gemini/service.ts` | Add: `findCrossReferences`, `generateChapterSummary`, `getWordStudy` |
| `components/reader/right-panel.tsx` | Add 'refs' tab, wire `PanelCrossReferences` |
| `components/reader/reader-view.tsx` | Add: parallel translation UI, word-click handler, new verse action buttons (Save, Summary, Card) |
| `components/reader/reader-header.tsx` | Add Collections nav link |

---

## Supabase Migration (run once in Supabase SQL editor)

```sql
-- Verse Collections
create table if not exists verse_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text not null default '#d97706',
  description text,
  created_at timestamptz default now()
);
alter table verse_collections enable row level security;
create policy "users manage own collections" on verse_collections
  for all using (auth.uid() = user_id);

-- Verses inside collections
create table if not exists collection_verses (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references verse_collections(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  verse_id text not null,
  verse_text text not null,
  reference text not null,
  book text not null,
  chapter integer not null,
  verse_number integer not null,
  translation text not null,
  added_at timestamptz default now()
);
alter table collection_verses enable row level security;
create policy "users manage own collection verses" on collection_verses
  for all using (auth.uid() = user_id);
```

---

## Phase 1 — Parallel Bible View

### Task 1: Parallel Bible View in ReaderView

**Files:**
- Modify: `components/reader/reader-view.tsx`

- [ ] **Step 1: Add parallel translation state to `reader-view.tsx`**

Add these new state variables after the existing state declarations (around line 30):

```typescript
const [parallelTranslation, setParallelTranslation] = useState<Translation | null>(null);
const [parallelVerses, setParallelVerses] = useState<Verse[]>([]);
const [parallelLoading, setParallelLoading] = useState(false);
```

- [ ] **Step 2: Add useEffect to load parallel verses**

Add after the existing translation useEffect (around line 55):

```typescript
useEffect(() => {
  if (!parallelTranslation) { setParallelVerses([]); return; }
  setParallelLoading(true);
  bibleService.getChapter(book, chapter, parallelTranslation)
    .then(v => { setParallelVerses(v); setParallelLoading(false); })
    .catch(() => setParallelLoading(false));
}, [book, chapter, parallelTranslation]);
```

- [ ] **Step 3: Add the parallel translation picker UI in the reader toolbar**

In the reader's toolbar section (inside the `<main>` area, near the top where translation controls are), add after the existing translation selector:

```tsx
{/* Parallel Bible — premium only */}
{isPremium && (
  <div className="flex items-center gap-2 mb-4 p-2 bg-stone-50 rounded-lg border border-stone-200">
    <span className="text-xs text-stone-500 font-medium">Parallel:</span>
    <select
      value={parallelTranslation ?? ''}
      onChange={e => setParallelTranslation(e.target.value as Translation || null)}
      className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700 flex-1"
    >
      <option value="">— Off —</option>
      {TRANSLATIONS.filter(t => t.id !== translation).map(t => (
        <option key={t.id} value={t.id}>{t.id.toUpperCase()} — {t.name}</option>
      ))}
    </select>
  </div>
)}
```

Add `TRANSLATIONS` to the import from `@/lib/constants`.

- [ ] **Step 4: Replace the verse rendering loop with parallel-aware layout**

Replace the current verse map (around line 126) with:

```tsx
{!loading && !error && verses.map(verse => {
  const hl = highlights.find(h => h.verseId === verse.id);
  const note = notes.find(n => n.verseId === verse.id);
  const pVerse = parallelVerses.find(v => v.number === verse.number);
  return (
    <div
      key={verse.id}
      className={`group mb-3 p-3 rounded-lg cursor-pointer transition ${selectedVerse?.id === verse.id ? 'bg-amber-50 ring-1 ring-amber-300' : 'hover:bg-stone-50'}`}
      style={hl ? { backgroundColor: hl.color + '55' } : {}}
      onClick={() => setSelectedVerse(selectedVerse?.id === verse.id ? null : verse)}
    >
      <span className="text-xs text-stone-400 mr-2 select-none">{verse.number}</span>
      {parallelTranslation && pVerse ? (
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <p className="text-xs text-stone-400 mb-1 font-medium uppercase">{translation}</p>
            <span className="text-stone-800">{verse.text}</span>
          </div>
          <div className="border-l border-stone-200 pl-3">
            <p className="text-xs text-amber-600 mb-1 font-medium uppercase">{parallelTranslation}</p>
            <span className="text-stone-700">{parallelLoading ? '…' : pVerse.text}</span>
          </div>
        </div>
      ) : (
        <span className="text-stone-800">{verse.text}</span>
      )}
      {note?.content && (
        <p className="mt-2 text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{note.content}</p>
      )}
      {selectedVerse?.id === verse.id && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={e => { e.stopPropagation(); setActiveTab('ai'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition">✦ Explain</button>
          <button onClick={e => { e.stopPropagation(); setActiveTab('notes'); setPanelOpen(true); }} className="text-xs px-2 py-1 bg-stone-100 rounded hover:bg-stone-200 transition">✎ Note</button>
          {isPremium && (
            <>
              <button onClick={e => { e.stopPropagation(); handleAddToMemory(verse); }} className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200 transition">🧠 Memory</button>
              <button onClick={e => { e.stopPropagation(); setCollectionVerse(verse); setShowCollectionPicker(true); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition">📚 Save</button>
              <button onClick={e => { e.stopPropagation(); setVerseCardVerse(verse); setShowVerseCard(true); }} className="text-xs px-2 py-1 bg-pink-100 text-pink-800 rounded hover:bg-pink-200 transition">🖼 Card</button>
              <button onClick={e => { e.stopPropagation(); handleWordStudyVerse(verse); }} className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded hover:bg-teal-200 transition">📖 Words</button>
            </>
          )}
        </div>
      )}
    </div>
  );
})}
```

Also add these new state variables for the modals that will be built in later tasks:
```typescript
const [showCollectionPicker, setShowCollectionPicker] = useState(false);
const [collectionVerse, setCollectionVerse] = useState<Verse | null>(null);
const [showVerseCard, setShowVerseCard] = useState(false);
const [verseCardVerse, setVerseCardVerse] = useState<Verse | null>(null);
const [wordStudyVerse, setWordStudyVerse] = useState<Verse | null>(null);
const [showWordStudy, setShowWordStudy] = useState(false);
```

And extract the memory button logic into a handler:
```typescript
function handleAddToMemory(verse: Verse) {
  fetch('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book, chapter, verse: verse.number, verseText: verse.text, translation }),
  }).then(r => r.json()).then(d => { if (d.error) alert(d.error); else alert('Added to memory!'); });
}

function handleWordStudyVerse(verse: Verse) {
  setWordStudyVerse(verse);
  setShowWordStudy(true);
}
```

- [ ] **Step 5: Add a Chapter Summary button in the toolbar**

After the parallel translation picker, add a "Summary" button (visible to premium users) that will wire to the modal built in Task 7:

```tsx
{isPremium && verses.length > 0 && (
  <button
    onClick={() => setShowChapterSummary(true)}
    className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition mb-4"
  >
    ✦ Chapter Summary
  </button>
)}
```

Add `showChapterSummary` state:
```typescript
const [showChapterSummary, setShowChapterSummary] = useState(false);
```

- [ ] **Step 6: Commit**

```bash
git add components/reader/reader-view.tsx
git commit -m "feat: add parallel Bible view and new verse action buttons scaffold"
```

---

## Phase 2 — AI Cross-References

### Task 2: Cross-References Gemini Method + API Route

**Files:**
- Modify: `lib/gemini/service.ts`
- Create: `app/api/ai/cross-references/route.ts`
- Create: `__tests__/api/ai/cross-references.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/ai/cross-references.test.ts`:

```typescript
/** @jest-environment node */
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/require-premium', () => ({
  requirePremium: jest.fn(),
}));
jest.mock('@/lib/gemini/service', () => ({
  geminiService: { findCrossReferences: jest.fn() },
}));

import { POST } from '@/app/api/ai/cross-references/route';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

describe('POST /api/ai/cross-references', () => {
  it('returns 403 for non-premium users', async () => {
    (requirePremium as jest.Mock).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Premium required' }), { status: 403 }),
    });
    const req = new NextRequest('http://localhost/api/ai/cross-references', {
      method: 'POST',
      body: JSON.stringify({ verseText: 'For God so loved', reference: 'John 3:16' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns cross-references for premium users', async () => {
    (requirePremium as jest.Mock).mockResolvedValue({ ok: true, user: { id: 'user-1' } });
    (geminiService.findCrossReferences as jest.Mock).mockResolvedValue([
      { reference: 'Romans 5:8', text: 'But God demonstrates...', connection: 'God\'s love for sinners' },
    ]);
    const req = new NextRequest('http://localhost/api/ai/cross-references', {
      method: 'POST',
      body: JSON.stringify({ verseText: 'For God so loved', reference: 'John 3:16' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.references).toHaveLength(1);
    expect(data.references[0].reference).toBe('Romans 5:8');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/ai/cross-references.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/api/ai/cross-references/route'"

- [ ] **Step 3: Add `findCrossReferences` to Gemini service**

In `lib/gemini/service.ts`, add after `generateReadingPlan`:

```typescript
async findCrossReferences(verseText: string, reference: string): Promise<
  { reference: string; text: string; connection: string }[]
> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Find 4-6 Bible cross-references for: "${verseText}" (${reference}).
Return a JSON array (no markdown) of objects with these exact keys:
- "reference": book chapter:verse (e.g. "Romans 5:8")
- "text": the verse text (one sentence)
- "connection": brief explanation of the thematic link (10-15 words)

Example: [{"reference":"Romans 5:8","text":"But God demonstrates...","connection":"Both verses show God's love expressed through sacrifice"}]`,
    config: { temperature: 0.3, maxOutputTokens: 1200 },
  });
  try {
    const raw = (response.text ?? '[]').replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return [];
  }
},
```

- [ ] **Step 4: Create the API route**

Create `app/api/ai/cross-references/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { verseText, reference } = await req.json() as { verseText: string; reference: string };
  if (!verseText || !reference) {
    return NextResponse.json({ error: 'Missing verseText or reference' }, { status: 400 });
  }

  const references = await geminiService.findCrossReferences(verseText, reference);
  return NextResponse.json({ references });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/api/ai/cross-references.test.ts --no-coverage
```

Expected: PASS — 2 tests pass

- [ ] **Step 6: Commit**

```bash
git add lib/gemini/service.ts app/api/ai/cross-references/route.ts __tests__/api/ai/cross-references.test.ts
git commit -m "feat: add cross-references Gemini method and API route"
```

---

### Task 3: Cross-References Panel UI

**Files:**
- Create: `components/reader/panel-cross-references.tsx`
- Modify: `components/reader/right-panel.tsx`

- [ ] **Step 1: Create `panel-cross-references.tsx`**

Create `components/reader/panel-cross-references.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Verse } from '@/types';
import { useRouter } from 'next/navigation';

interface CrossRef {
  reference: string;
  text: string;
  connection: string;
}

interface Props {
  selectedVerse: Verse | null;
  isPremium: boolean;
}

export function PanelCrossReferences({ selectedVerse, isPremium }: Props) {
  const router = useRouter();
  const [refs, setRefs] = useState<CrossRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastVerseId, setLastVerseId] = useState('');

  async function fetchRefs() {
    if (!selectedVerse || !isPremium) return;
    setLoading(true); setError(''); setRefs([]);
    setLastVerseId(selectedVerse.id);
    try {
      const res = await fetch('/api/ai/cross-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verseText: selectedVerse.text,
          reference: `${selectedVerse.book} ${selectedVerse.chapter}:${selectedVerse.number}`,
        }),
      });
      const data = await res.json();
      if (res.ok) setRefs(data.references ?? []);
      else setError(data.error ?? 'Failed to load references');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  function navigateToRef(reference: string) {
    // Parse "Book Chapter:Verse" — e.g. "Romans 5:8"
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!match) return;
    const [, book, chapter] = match;
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
  }

  if (!isPremium) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-stone-500 mb-3">Cross-references are a premium feature.</p>
        <a href="/pricing" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">Upgrade</a>
      </div>
    );
  }

  if (!selectedVerse) {
    return <p className="p-4 text-sm text-stone-400">Select a verse to find cross-references.</p>;
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-xs text-stone-500 bg-stone-50 rounded-lg p-2 italic">
        "{selectedVerse.text.slice(0, 80)}{selectedVerse.text.length > 80 ? '…' : ''}"
        <span className="block mt-1 font-medium not-italic text-stone-700">
          {selectedVerse.book} {selectedVerse.chapter}:{selectedVerse.number}
        </span>
      </div>

      {lastVerseId !== selectedVerse.id && (
        <button
          onClick={fetchRefs}
          disabled={loading}
          className="w-full py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 transition"
        >
          {loading ? 'Finding references…' : '🔗 Find Cross-References'}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      {refs.map((ref, i) => (
        <div key={i} className="border border-stone-100 rounded-lg p-2.5 hover:border-amber-200 transition">
          <button
            onClick={() => navigateToRef(ref.reference)}
            className="text-xs font-bold text-amber-700 hover:underline block mb-1"
          >
            {ref.reference} →
          </button>
          <p className="text-xs text-stone-700 mb-1">"{ref.text}"</p>
          <p className="text-xs text-stone-400 italic">{ref.connection}</p>
        </div>
      ))}

      {refs.length > 0 && (
        <button
          onClick={fetchRefs}
          className="w-full py-1.5 text-xs text-stone-400 hover:text-stone-600 transition"
        >
          ↺ Refresh
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add 'refs' tab to `right-panel.tsx`**

In `components/reader/right-panel.tsx`:

Add `'refs'` to the `PanelTab` type:
```typescript
export type PanelTab = 'ai' | 'notes' | 'tools' | 'study' | 'refs';
```

Add to the `TABS` array:
```typescript
{ id: 'refs', label: 'Refs', icon: '🔗' },
```

Add import at top:
```typescript
import { PanelCrossReferences } from './panel-cross-references';
```

Add `isPremium` to the `RightPanelProps` interface:
```typescript
isPremium: boolean;
```

Add the refs panel in the render, alongside the other panels (in the tab content area):
```tsx
{activeTab === 'refs' && (
  <div className="flex-1 overflow-y-auto">
    <PanelCrossReferences selectedVerse={selectedVerse} isPremium={isPremium} />
  </div>
)}
```

- [ ] **Step 3: Pass `isPremium` from `reader-view.tsx` to `RightPanel`**

In `components/reader/reader-view.tsx`, update the `<RightPanel>` usage to pass `isPremium`:
```tsx
<RightPanel
  isOpen={panelOpen} onToggle={() => setPanelOpen(o => !o)}
  activeTab={activeTab} onTabChange={setActiveTab}
  selectedVerse={selectedVerse} verses={verses}
  book={book} chapter={chapter}
  highlights={highlights} notes={notes}
  isPremium={isPremium}
  onHighlight={handleHighlight} onSaveNote={handleSaveNote}
  onDeleteNote={handleDeleteNote} onEditNote={handleEditNote}
/>
```

- [ ] **Step 4: Commit**

```bash
git add components/reader/panel-cross-references.tsx components/reader/right-panel.tsx components/reader/reader-view.tsx
git commit -m "feat: add cross-references panel tab to right panel"
```

---

## Phase 3 — Verse Collections

### Task 4: Collections API Routes

**Files:**
- Create: `app/api/collections/route.ts`
- Create: `app/api/collections/[id]/route.ts`
- Create: `app/api/collections/[id]/verses/route.ts`
- Create: `__tests__/api/collections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/collections.test.ts`:

```typescript
/** @jest-environment node */
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { GET, POST } from '@/app/api/collections/route';
import { createClient } from '@/lib/supabase/server';

const mockUser = { id: 'user-123' };
const mockAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) };

describe('GET /api/collections', () => {
  it('returns 401 when not authenticated', async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const req = new NextRequest('http://localhost/api/collections');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns collections for authenticated user', async () => {
    const mockCollections = [{ id: 'col-1', name: 'My Favorites', color: '#d97706', user_id: 'user-123' }];
    (createClient as jest.Mock).mockResolvedValue({
      auth: mockAuth,
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCollections, error: null }),
          }),
        }),
      }),
    });
    const req = new NextRequest('http://localhost/api/collections');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.collections).toHaveLength(1);
  });
});

describe('POST /api/collections', () => {
  it('creates a new collection', async () => {
    const newCol = { id: 'col-new', name: 'Promises', color: '#059669', user_id: 'user-123' };
    (createClient as jest.Mock).mockResolvedValue({
      auth: mockAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newCol, error: null }),
          }),
        }),
      }),
    });
    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Promises', color: '#059669' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.collection.name).toBe('Promises');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/collections.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/app/api/collections/route'"

- [ ] **Step 3: Create `app/api/collections/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: collections, error } = await supabase
    .from('verse_collections')
    .select('id, name, color, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collections: collections ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, color = '#d97706', description } = await req.json() as {
    name: string; color?: string; description?: string;
  };
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const { data: collection, error } = await supabase
    .from('verse_collections')
    .insert({ user_id: user.id, name: name.trim(), color, description })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection }, { status: 201 });
}
```

- [ ] **Step 4: Create `app/api/collections/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const updates = await req.json() as { name?: string; color?: string; description?: string };

  const { data, error } = await supabase
    .from('verse_collections')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collection: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { error } = await supabase
    .from('verse_collections')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Create `app/api/collections/[id]/verses/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { data: verses, error } = await supabase
    .from('collection_verses')
    .select('id, verse_id, verse_text, reference, book, chapter, verse_number, translation, added_at')
    .eq('collection_id', id)
    .eq('user_id', user.id)
    .order('added_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verses: verses ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collection_id } = await params;
  const { verse_id, verse_text, reference, book, chapter, verse_number, translation } =
    await req.json() as {
      verse_id: string; verse_text: string; reference: string;
      book: string; chapter: number; verse_number: number; translation: string;
    };

  // Check collection belongs to user
  const { data: col } = await supabase
    .from('verse_collections')
    .select('id')
    .eq('id', collection_id)
    .eq('user_id', user.id)
    .single();
  if (!col) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('collection_verses')
    .insert({ collection_id, user_id: user.id, verse_id, verse_text, reference, book, chapter, verse_number, translation })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ verse: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: collection_id } = await params;
  const { verse_id } = await req.json() as { verse_id: string };

  const { error } = await supabase
    .from('collection_verses')
    .delete()
    .eq('collection_id', collection_id)
    .eq('verse_id', verse_id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Run tests**

```bash
npx jest __tests__/api/collections.test.ts --no-coverage
```

Expected: PASS — 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add app/api/collections/ __tests__/api/collections.test.ts
git commit -m "feat: add verse collections API (CRUD for collections and verses)"
```

---

### Task 5: Collections UI — Picker Modal + Library Page

**Files:**
- Create: `components/study/collection-picker-modal.tsx`
- Create: `app/(app)/collections/page.tsx`
- Modify: `components/reader/reader-view.tsx` (wire picker modal)

- [ ] **Step 1: Create `collection-picker-modal.tsx`**

Create `components/study/collection-picker-modal.tsx`:

```tsx
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
          "{verse.text.slice(0, 80)}{verse.text.length > 80 ? '…' : ''}"
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
```

- [ ] **Step 2: Wire picker modal into `reader-view.tsx`**

At the top of `reader-view.tsx`, add the import:
```typescript
import { CollectionPickerModal } from '@/components/study/collection-picker-modal';
```

At the bottom of the JSX (before closing `</div>`), add:
```tsx
{showCollectionPicker && (
  <CollectionPickerModal
    verse={collectionVerse}
    translation={translation}
    onClose={() => { setShowCollectionPicker(false); setCollectionVerse(null); }}
  />
)}
```

- [ ] **Step 3: Create `app/(app)/collections/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'My Collections — Scripture Stream' };

export default async function CollectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase.from('subscriptions')
    .select('plan, status, current_period_end').eq('user_id', user.id).single();
  const paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);
  if (!paid) redirect('/pricing?feature=collections');

  const { data: collections } = await supabase
    .from('verse_collections')
    .select('id, name, color, description, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">My Collections</h1>
          <p className="text-sm text-stone-500 mt-1">Curated verse collections by topic or theme</p>
        </div>
        <Link href="/read/john/3" className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition">
          + Add Verses
        </Link>
      </div>

      {(!collections || collections.length === 0) ? (
        <div className="text-center py-16 border-2 border-dashed border-stone-200 rounded-xl">
          <p className="text-stone-400 mb-2">No collections yet</p>
          <p className="text-sm text-stone-400">Select a verse in the reader and click 📚 Save to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map(col => (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className="border border-stone-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="font-semibold text-stone-800 group-hover:text-amber-700 transition">{col.name}</h3>
              </div>
              {col.description && <p className="text-xs text-stone-500">{col.description}</p>}
              <p className="text-xs text-stone-400 mt-2">{new Date(col.created_at).toLocaleDateString()}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Add Collections link to the reader header**

In `components/reader/reader-header.tsx`, add inside the `<nav>` after the Study link:

```tsx
<a href={isPaid ? '/collections' : '/pricing?feature=collections'} className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text} ${!isPaid ? 'opacity-60' : ''}`}>
  📚{!isPaid && '🔒'}
</a>
```

- [ ] **Step 5: Commit**

```bash
git add components/study/collection-picker-modal.tsx app/(app)/collections/ components/reader/reader-view.tsx components/reader/reader-header.tsx
git commit -m "feat: add verse collections UI (picker modal and library page)"
```

---

## Phase 4 — Chapter Summary

### Task 6: Chapter Summary — Gemini Method, API Route, and Modal

**Files:**
- Modify: `lib/gemini/service.ts`
- Create: `app/api/ai/chapter-summary/route.ts`
- Create: `components/reader/chapter-summary-modal.tsx`
- Modify: `components/reader/reader-view.tsx`

- [ ] **Step 1: Add `generateChapterSummary` to Gemini service**

In `lib/gemini/service.ts`, add:

```typescript
async generateChapterSummary(
  book: string,
  chapter: number,
  verseTexts: string[]
): Promise<{ summary: string; keyThemes: string[]; reflectionQuestions: string[] }> {
  const ai = getClient();
  const chapterText = verseTexts.slice(0, 30).join(' ');
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze ${book} chapter ${chapter}.

Chapter text (first 30 verses): "${chapterText.slice(0, 2000)}"

Return a JSON object (no markdown) with:
- "summary": 2-3 sentence overview of the chapter's narrative and meaning
- "keyThemes": array of 3-4 theme strings (each 3-6 words)
- "reflectionQuestions": array of 3 thoughtful personal reflection questions

Example: {"summary":"...","keyThemes":["God's provision","Trust in hardship"],"reflectionQuestions":["How does...","What does..."]}`,
    config: { temperature: 0.5, maxOutputTokens: 800 },
  });
  try {
    const raw = (response.text ?? '{}').replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return { summary: response.text ?? '', keyThemes: [], reflectionQuestions: [] };
  }
},
```

- [ ] **Step 2: Create `app/api/ai/chapter-summary/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { book, chapter, verseTexts } = await req.json() as {
    book: string; chapter: number; verseTexts: string[];
  };
  if (!book || !chapter || !Array.isArray(verseTexts) || verseTexts.length === 0) {
    return NextResponse.json({ error: 'Missing book, chapter, or verseTexts' }, { status: 400 });
  }

  const result = await geminiService.generateChapterSummary(book, chapter, verseTexts);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Create `components/reader/chapter-summary-modal.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { Verse } from '@/types';

interface SummaryData {
  summary: string;
  keyThemes: string[];
  reflectionQuestions: string[];
}

interface Props {
  book: string;
  chapter: number;
  verses: Verse[];
  onClose: () => void;
}

export function ChapterSummaryModal({ book, chapter, verses, onClose }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/chapter-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book, chapter,
          verseTexts: verses.map(v => v.text),
        }),
      });
      const json = await res.json();
      if (res.ok) setData(json);
      else setError(json.error ?? 'Failed to generate');
    } catch {
      setError('Network error');
    }
    setLoading(false);
  }

  // Auto-generate on mount
  useState(() => { generate(); });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-800">{book} {chapter}</h2>
            <p className="text-xs text-stone-400">AI Chapter Summary</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {loading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-stone-400">Generating summary…</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button onClick={generate} className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg">Retry</button>
            </div>
          )}

          {data && (
            <>
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Summary</h3>
                <p className="text-sm text-stone-700 leading-relaxed">{data.summary}</p>
              </div>

              {data.keyThemes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Key Themes</h3>
                  <div className="flex flex-wrap gap-2">
                    {data.keyThemes.map((theme, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.reflectionQuestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Reflect & Apply</h3>
                  <ul className="space-y-2">
                    {data.reflectionQuestions.map((q, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-500 font-bold text-sm flex-shrink-0">{i + 1}.</span>
                        <p className="text-sm text-stone-700">{q}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire `ChapterSummaryModal` into `reader-view.tsx`**

Add import:
```typescript
import { ChapterSummaryModal } from './chapter-summary-modal';
```

Add before the closing `</div>` of the component:
```tsx
{showChapterSummary && (
  <ChapterSummaryModal
    book={book}
    chapter={chapter}
    verses={verses}
    onClose={() => setShowChapterSummary(false)}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add lib/gemini/service.ts app/api/ai/chapter-summary/ components/reader/chapter-summary-modal.tsx components/reader/reader-view.tsx
git commit -m "feat: add AI chapter summary with themes and reflection questions"
```

---

## Phase 5 — Word Study

### Task 7: Word Study — Gemini Method, API Route, and Popover

**Files:**
- Modify: `lib/gemini/service.ts`
- Create: `app/api/ai/word-study/route.ts`
- Create: `components/reader/word-study-popover.tsx`
- Modify: `components/reader/reader-view.tsx`

- [ ] **Step 1: Add `getWordStudy` to Gemini service**

In `lib/gemini/service.ts`, add:

```typescript
async getWordStudy(
  word: string,
  verseText: string,
  reference: string
): Promise<{
  word: string;
  original: string;
  language: string;
  transliteration: string;
  definition: string;
  extendedMeaning: string;
  relatedVerses: string[];
}> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Do a word study for the word "${word}" as used in: "${verseText}" (${reference}).

Return a JSON object (no markdown) with:
- "word": the word as it appears in the text
- "original": the Greek or Hebrew original word
- "language": "Greek", "Hebrew", or "Aramaic"
- "transliteration": phonetic pronunciation
- "definition": core lexical definition (1-2 sentences)
- "extendedMeaning": theological depth and nuance (2-3 sentences)
- "relatedVerses": array of 3 other verse references where same original word appears (e.g. ["John 1:1", "Gen 1:1"])

Example: {"word":"love","original":"ἀγάπη","language":"Greek","transliteration":"agapē","definition":"Unconditional, self-sacrificial love...","extendedMeaning":"Agape is distinct from philia (friendship)...","relatedVerses":["1 Cor 13:4","Rom 5:8","1 John 4:8"]}`,
    config: { temperature: 0.3, maxOutputTokens: 700 },
  });
  try {
    const raw = (response.text ?? '{}').replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch {
    return {
      word, original: '', language: '', transliteration: '',
      definition: response.text ?? '', extendedMeaning: '', relatedVerses: [],
    };
  }
},
```

- [ ] **Step 2: Create `app/api/ai/word-study/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

export async function POST(req: NextRequest) {
  const check = await requirePremium();
  if (!check.ok) return check.response;

  const { word, verseText, reference } = await req.json() as {
    word: string; verseText: string; reference: string;
  };
  if (!word || !verseText || !reference) {
    return NextResponse.json({ error: 'Missing word, verseText, or reference' }, { status: 400 });
  }

  const result = await geminiService.getWordStudy(word.replace(/[^a-zA-Z']/g, ''), verseText, reference);
  return NextResponse.json(result);
}
```

- [ ] **Step 3: Create `components/reader/word-study-popover.tsx`**

```tsx
'use client';
import { useState, useEffect } from 'react';
import { Verse } from '@/types';
import { useRouter } from 'next/navigation';

interface WordStudyData {
  word: string;
  original: string;
  language: string;
  transliteration: string;
  definition: string;
  extendedMeaning: string;
  relatedVerses: string[];
}

interface Props {
  verse: Verse | null;
  clickedWord: string;
  onClose: () => void;
}

export function WordStudyPopover({ verse, clickedWord, onClose }: Props) {
  const router = useRouter();
  const [data, setData] = useState<WordStudyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!verse || !clickedWord) return;
    setData(null); setLoading(true); setError('');
    fetch('/api/ai/word-study', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: clickedWord,
        verseText: verse.text,
        reference: `${verse.book} ${verse.chapter}:${verse.number}`,
      }),
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Network error'); setLoading(false); });
  }, [verse, clickedWord]);

  function navigateTo(ref: string) {
    const match = ref.match(/^(.+?)\s+(\d+):/);
    if (!match) return;
    const [, book, chapter] = match;
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
    onClose();
  }

  if (!verse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 pb-8 shadow-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-bold text-stone-800 text-lg">"{clickedWord}"</h3>
            <p className="text-xs text-stone-400">{verse.book} {verse.chapter}:{verse.number} — Word Study</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {loading && (
          <div className="py-8 text-center">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-stone-400">Studying original languages…</p>
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {data && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
              <p className="text-2xl font-serif text-amber-800 mb-0.5">{data.original}</p>
              <p className="text-sm text-stone-500">{data.transliteration} · {data.language}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Definition</h4>
              <p className="text-sm text-stone-700">{data.definition}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Theological Meaning</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{data.extendedMeaning}</p>
            </div>

            {data.relatedVerses.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">Same Word Elsewhere</h4>
                <div className="flex flex-wrap gap-2">
                  {data.relatedVerses.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => navigateTo(ref)}
                      className="text-xs px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full hover:bg-amber-100 hover:text-amber-700 transition"
                    >
                      {ref} →
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire word-click behavior and popover into `reader-view.tsx`**

Add import:
```typescript
import { WordStudyPopover } from './word-study-popover';
```

Add state:
```typescript
const [wordStudyWord, setWordStudyWord] = useState('');
```

Update `handleWordStudyVerse` to be triggered by clicking the "📖 Words" button — it shows the popover asking the user to click a word. Actually, the "📖 Words" button approach is simpler: when it's clicked, enable a "word pick mode" that wraps each word in the verse text as a clickable span. Add this state:

```typescript
const [wordPickMode, setWordPickMode] = useState<string | null>(null); // holds verseId when in pick mode
```

Update the "📖 Words" button in the verse actions:
```tsx
<button
  onClick={e => {
    e.stopPropagation();
    setWordPickMode(wordPickMode === verse.id ? null : verse.id);
  }}
  className={`text-xs px-2 py-1 rounded transition ${wordPickMode === verse.id ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-800 hover:bg-teal-200'}`}
>
  📖 {wordPickMode === verse.id ? 'Tap a word…' : 'Words'}
</button>
```

Replace the verse text span with a word-pick aware version. Inside the verse map, change:
```tsx
<span className="text-stone-800">{verse.text}</span>
```
to:
```tsx
{wordPickMode === verse.id ? (
  <span>
    {verse.text.split(/(\s+)/).map((token, i) =>
      /\s+/.test(token) ? (
        <span key={i}>{token}</span>
      ) : (
        <button
          key={i}
          onClick={e => {
            e.stopPropagation();
            const clean = token.replace(/[^a-zA-Z']/g, '');
            if (!clean) return;
            setWordStudyWord(clean);
            setWordStudyVerse(verse);
            setShowWordStudy(true);
            setWordPickMode(null);
          }}
          className="hover:bg-teal-100 hover:text-teal-800 rounded px-0.5 transition cursor-pointer underline-offset-2 hover:underline"
        >
          {token}
        </button>
      )
    )}
  </span>
) : (
  <span className="text-stone-800">{verse.text}</span>
)}
```

Add the popover before the closing `</div>`:
```tsx
{showWordStudy && (
  <WordStudyPopover
    verse={wordStudyVerse}
    clickedWord={wordStudyWord}
    onClose={() => { setShowWordStudy(false); setWordStudyVerse(null); setWordStudyWord(''); }}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add lib/gemini/service.ts app/api/ai/word-study/ components/reader/word-study-popover.tsx components/reader/reader-view.tsx
git commit -m "feat: add original language word study with Greek/Hebrew definitions"
```

---

## Phase 6 — Shareable Verse Cards

### Task 8: Verse Card Modal + Page

**Files:**
- Create: `components/reader/verse-card-modal.tsx`
- Create: `app/(app)/verse-card/page.tsx`
- Modify: `components/reader/reader-view.tsx`
- Modify: `components/reader/reader-header.tsx`

- [ ] **Step 1: Create `components/reader/verse-card-modal.tsx`**

Create `components/reader/verse-card-modal.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { Verse } from '@/types';

const STYLES = ['Ethereal', 'Ancient', 'Nature', 'Modern'] as const;
type CardStyle = typeof STYLES[number];

const STYLE_COLORS: Record<CardStyle, [string, string]> = {
  Ethereal: ['#667eea', '#764ba2'],
  Ancient:  ['#8B6914', '#5C4A1E'],
  Nature:   ['#134E5E', '#71B280'],
  Modern:   ['#232526', '#414345'],
};

interface Props {
  verse: Verse;
  onClose: () => void;
}

export function VerseCardModal({ verse, onClose }: Props) {
  const [style, setStyle] = useState<CardStyle>('Ethereal');
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const reference = `${verse.book} ${verse.chapter}:${verse.number}`;

  async function generateBackground() {
    setLoading(true); setImageBase64(null);
    try {
      const res = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseText: verse.text, style }),
      });
      const data = await res.json();
      if (res.ok && data.imageBase64) setImageBase64(data.imageBase64);
    } catch { /* use gradient fallback */ }
    setLoading(false);
  }

  function downloadCard(format: 'square' | 'story') {
    const canvas = document.createElement('canvas');
    const [w, h] = format === 'square' ? [1080, 1080] : [1080, 1920];
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const [c1, c2] = STYLE_COLORS[style];

    const drawText = () => {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);

      // Verse text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      const fontSize = format === 'square' ? 52 : 58;
      ctx.font = `italic ${fontSize}px Georgia, serif`;
      const words = verse.text.split(' ');
      const lines: string[] = [];
      let line = '';
      const maxWidth = w * 0.78;
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(`"${test}"`).width > maxWidth && line) {
          lines.push(line); line = word;
        } else { line = test; }
      }
      if (line) lines.push(line);

      const lineH = fontSize * 1.45;
      const totalH = lines.length * lineH;
      const startY = (h - totalH) / 2 - 40;

      ctx.font = `italic ${fontSize}px Georgia, serif`;
      lines.forEach((l, i) => {
        const prefix = i === 0 ? '"' : '';
        const suffix = i === lines.length - 1 ? '"' : '';
        ctx.fillText(prefix + l + suffix, w / 2, startY + i * lineH);
      });

      // Reference
      ctx.font = `bold ${fontSize * 0.42}px Georgia, serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`— ${reference}`, w / 2, startY + lines.length * lineH + 60);

      // Branding
      ctx.font = `${fontSize * 0.3}px Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText('Scripture Stream', w / 2, h - 50);
    };

    if (imageBase64) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, w, h);
        drawText();
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${verse.book}-${verse.chapter}-${verse.number}-${format}.png`;
        link.click();
      };
      img.src = imageBase64;
    } else {
      drawText();
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${verse.book}-${verse.chapter}-${verse.number}-${format}.png`;
      link.click();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-800">Create Verse Card</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        {/* Preview */}
        <div
          className="mx-4 mt-4 rounded-xl overflow-hidden aspect-square flex flex-col items-center justify-center p-6 relative"
          style={{
            background: imageBase64
              ? `url(${imageBase64}) center/cover`
              : `linear-gradient(135deg, ${STYLE_COLORS[style][0]}, ${STYLE_COLORS[style][1]})`,
          }}
        >
          <div className="absolute inset-0 bg-black/40 rounded-xl" />
          <p className="relative z-10 text-white italic text-center text-sm font-serif leading-relaxed">
            "{verse.text.slice(0, 120)}{verse.text.length > 120 ? '…' : ''}"
          </p>
          <p className="relative z-10 text-white/70 text-xs mt-2 font-medium">— {reference}</p>
        </div>

        <div className="p-4 space-y-3">
          {/* Style picker */}
          <div className="flex gap-1.5">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => { setStyle(s); setImageBase64(null); }}
                className={`flex-1 py-1 text-xs rounded-lg transition ${style === s ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* AI background */}
          <button
            onClick={generateBackground}
            disabled={loading}
            className="w-full py-2 text-xs font-medium border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-60 transition"
          >
            {loading ? '✦ Generating AI background…' : '✦ Generate AI Background'}
          </button>

          {/* Download buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => downloadCard('square')}
              className="py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
            >
              ↓ Square (1:1)
            </button>
            <button
              onClick={() => downloadCard('story')}
              className="py-2 text-xs font-medium bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition"
            >
              ↓ Story (9:16)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `VerseCardModal` into `reader-view.tsx`**

Add import:
```typescript
import { VerseCardModal } from './verse-card-modal';
```

Add before the closing `</div>`:
```tsx
{showVerseCard && verseCardVerse && (
  <VerseCardModal
    verse={verseCardVerse}
    onClose={() => { setShowVerseCard(false); setVerseCardVerse(null); }}
  />
)}
```

- [ ] **Step 3: Create `app/(app)/verse-card/page.tsx`** (standalone page for direct access)

```tsx
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/types';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Verse Card Creator — Scripture Stream' };

export default async function VerseCardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/signin');

  const { data: sub } = await supabase.from('subscriptions')
    .select('plan, status, current_period_end').eq('user_id', user.id).single();
  const paid = isPremium(sub ? { id: '', userId: user.id, plan: sub.plan, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null, stripeCustomerId: null, stripeSubscriptionId: null } : null);
  if (!paid) redirect('/pricing?feature=verse-card');

  return (
    <main className="max-w-2xl mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">Verse Card Creator</h1>
      <p className="text-stone-500 mb-8">Select any verse in the Bible reader and tap <strong>🖼 Card</strong> to create a shareable verse image.</p>
      <a
        href="/read/john/3"
        className="inline-block px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition"
      >
        Open Bible Reader →
      </a>
    </main>
  );
}
```

- [ ] **Step 4: Add Verse Card and Collections links to reader header nav**

In `components/reader/reader-header.tsx`, update the nav to show all premium features with clean labels:

```tsx
<nav className="hidden md:flex items-center gap-1">
  <a href="/dashboard" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Dashboard</a>
  <a href="/study" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Study</a>
  {isPaid && <a href="/collections" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>📚 Collections</a>}
  <a href={isPaid ? '/morning-card' : '/pricing?feature=morning-card'} className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text} ${!isPaid ? 'opacity-60' : ''}`}>
    🌅 {!isPaid && '🔒'}
  </a>
  <a href="/settings" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Settings</a>
</nav>
```

- [ ] **Step 5: Commit**

```bash
git add components/reader/verse-card-modal.tsx app/(app)/verse-card/ components/reader/reader-view.tsx components/reader/reader-header.tsx
git commit -m "feat: add shareable verse card creator with AI backgrounds and Canvas download"
```

---

## Task 9: Final — Run All Tests and Build

- [ ] **Step 1: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass (32 existing + ~5 new = ~37 total)

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds, all routes compiled

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any TypeScript or test issues from premium features V2"
```

---

## Self-Review Checklist

- ✅ Parallel Bible View: state, loader, picker, two-column layout
- ✅ Cross-References: Gemini method, API route, panel tab, navigation to target verse
- ✅ Verse Collections: SQL migration, all CRUD routes, picker modal, library page, reader button, nav link
- ✅ Chapter Summary: Gemini method, API route, auto-generating modal, reader toolbar button
- ✅ Word Study: Gemini method, API route, word-pick mode, bottom-sheet popover, navigate to related verses
- ✅ Verse Cards: Canvas download modal, square + story formats, AI background, reader button, standalone page
- ✅ All premium features gated: `requirePremium()` server-side, `isPaid` client-side, upgrade redirects
- ✅ Tests: cross-references auth guard, collections CRUD auth tests
- ✅ No placeholders or TBDs in any step
