# Scripture Stream — Right Panel Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Scope:** Right-side study panel for the Bible reader with AI, Notes, and Tools tabs

---

## 1. Overview

Replace the scattered inline AI results, highlight swatches, and note snippets in the reader with a clean, collapsible right-side panel. The panel has three tabs: AI, Notes, and Tools. This brings Scripture Stream's reader UX to parity with Logos and Olive Tree while keeping the verse list distraction-free.

---

## 2. Layout

### Desktop (≥ 1024px)
```
[ Left Sidebar 288px ] [ Verse Text flex-1 max-w-2xl ] [ Right Panel 320px ]
```
- Right panel is **persistent** — always mounted, toggle to collapse
- Collapsed state: 40px wide icon strip showing tab icons vertically
- Expanded state: 320px with tab bar + content
- Toggle button: chevron arrow on the left edge of the panel

### Mobile (< 1024px)
- Right panel becomes a **bottom drawer**
- Triggered by a floating action button (bottom-right)
- Drawer slides up to 70% screen height, scrollable
- Tab bar at the top of the drawer

---

## 3. Component Structure

### New files
- `components/reader/right-panel.tsx` — panel shell (tabs, collapse logic, toggle button)
- `components/reader/panel-ai.tsx` — AI tab content
- `components/reader/panel-notes.tsx` — Notes tab content
- `components/reader/panel-tools.tsx` — Tools tab content

### Modified files
- `components/reader/reader-view.tsx` — add right panel, remove inline AI blocks, remove inline art block, remove inline historical context block, pass required props
- `components/reader/reader-header.tsx` — remove theme switcher (moves to Tools tab)

---

## 4. Tab Specifications

### Tab 1 — AI

**Purpose:** Consolidate all AI features into one place.

**Sections (in order):**

1. **Verse Explanation**
   - Header: "Verse Explanation"
   - When no verse selected: placeholder text "Select a verse to explain it"
   - When verse selected: shows reference (e.g. "John 3:16") + Explain button
   - After clicking: loading spinner → explanation text
   - Free tier: shows counter "X of 5 used today" below button; button disabled at limit
   - Result persists until a different verse is selected

2. **Chapter Context**
   - Header: "Historical Context"
   - Single button: "Load Context for [Book] [Chapter]"
   - After clicking: loading spinner → context text
   - Result persists until chapter changes (auto-cleared on navigation)
   - Free tier: shows counter "X of 3 used today"

3. **Verse Art**
   - Header: "Verse Art"
   - Visible only when a verse is selected
   - Button: "Generate Art"
   - After clicking: loading spinner → generated image displayed full-width in panel
   - Free tier: shows counter "X of 2 used today"
   - Image persists until a different verse is selected

**State:** All AI state (explanation, context, art, loading flags) moves from `reader-view.tsx` into `panel-ai.tsx` via props: `selectedVerse`, `book`, `chapter`.

---

### Tab 2 — Notes

**Purpose:** Add, view, and edit notes; manage highlights for the current chapter.

**Sections (in order):**

1. **Add Note**
   - Label: "Note for [Book Chapter:Verse]" (updates when verse selected; shows "Select a verse" when none)
   - Textarea: placeholder "Write your note…", 4 rows
   - Save button: "Save Note" — calls `localStore.saveNote()`
   - Pre-fills textarea if a note already exists for the selected verse (edit mode)

2. **Chapter Notes**
   - Header: "Notes in this chapter"
   - Lists all notes for current book+chapter from `localStore.getNotes()`
   - Each note: verse number badge + note content + edit icon + delete icon
   - Clicking edit icon: scrolls to Add Note section and pre-fills textarea
   - Empty state: "No notes yet for this chapter"

3. **Highlights**
   - Header: "Highlights"
   - 5 color swatches (moved from inline verse actions)
   - Label above swatches: "Highlight selected verse" (greyed out if no verse selected)
   - Below swatches: list of highlighted verses in current chapter
   - Each highlight: verse number + color dot + remove button

**State:** Notes and highlights state stays in `reader-view.tsx`, passed as props to `panel-notes.tsx`. `selectedVerse` prop drives the note input target.

---

### Tab 3 — Tools

**Purpose:** Reading preferences and study utilities.

**Sections (in order):**

1. **Appearance**
   - Font size slider: 14–28px, step 1, shows current value
   - Theme: 3 buttons (Light / Dark / Sepia) — moved from `reader-header.tsx`
   - Font family toggle: Serif / Sans

2. **Reading Progress**
   - "Mark chapter as complete" checkbox
   - Reads/writes to `localStore` under a `reading_progress` key
   - Shows a simple count: "X chapters completed"

3. **Coming Soon (Premium)**
   - "Cross References" — lock icon, "Upgrade to Premium"
   - "Translation Compare" — lock icon, "Upgrade to Premium"
   - "Original Language" — lock icon, "Upgrade to Premium"

**State:** Font size and font family are read/written via `useTheme()` hook (already in `theme-provider.tsx`). Reading progress uses `localStore`.

---

## 5. Reader View Changes

Remove from `reader-view.tsx`:
- `explanation`, `explanationLoading`, `historicalContext`, `contextLoading`, `verseArt`, `artLoading`, `artStyle` state — move to `panel-ai.tsx`
- `handleExplainVerse`, `handleHistoricalContext`, `handleGenerateArt` functions — move to `panel-ai.tsx`
- Inline historical context block (button + amber box)
- Inline verse art block (`<img>`)
- Inline AI explanation panel (stone-50 box at bottom)
- Inline highlight color swatches from verse action row — keep "Explain" button in verse actions as a shortcut that selects the verse and switches panel to AI tab

Keep in `reader-view.tsx`:
- `highlights`, `notes` state (needed for inline note/highlight display on verses)
- `handleHighlight`, `handleSaveNote` functions
- Note text shown under verses (keep as-is, it's useful inline context)
- "Explain" shortcut button on verse — now just selects verse + opens AI tab

New props passed down to right panel:
```typescript
selectedVerse, book, chapter, highlights, notes,
onHighlight, onSaveNote, onSwitchToAITab
```

---

## 6. Collapse / Expand Behaviour

- Default state: **expanded** on desktop, **hidden** on mobile
- State persisted in `localStorage` under key `ss_panel_open`
- Toggle button: left-pointing chevron (expanded) / right-pointing chevron (collapsed)
- When collapsed on desktop: show vertical tab icons only (tooltips on hover)
- Clicking a tab icon while collapsed: expands panel and switches to that tab
- Active tab persisted in `localStorage` under key `ss_panel_tab`

---

## 7. Styling

- Panel background: `bg-white` (light), `bg-zinc-900` (dark), `bg-[#f4ecd8]` (sepia) — follows theme
- Border: `border-l border-stone-200`
- Tab bar: 3 equal-width tabs, amber underline on active
- Panel content: `overflow-y-auto`, `p-4`, sections separated by `border-b border-stone-100`
- Section headers: `text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2`
- Transition: `transition-all duration-200` on width collapse

---

## 8. What Is NOT in Scope

- Backend persistence of notes/highlights (remains localStorage)
- Actual premium gating logic for locked Tools items
- Stripe or subscription checks
- Commentary, Strong's lexicon, or cross-reference data
- Mobile drawer animation polish
