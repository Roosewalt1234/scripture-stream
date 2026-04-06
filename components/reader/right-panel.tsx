'use client';
import { Verse, Note, Highlight } from '@/types';
import { PanelAI } from './panel-ai';
import { PanelNotes } from './panel-notes';
import { PanelTools } from './panel-tools';
import { useTheme } from '@/components/providers/theme-provider';

export type PanelTab = 'ai' | 'notes' | 'tools';

interface RightPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  selectedVerse: Verse | null;
  verses: Verse[];
  book: string;
  chapter: number;
  highlights: Highlight[];
  notes: Note[];
  onHighlight: (verse: Verse, color: string) => void;
  onSaveNote: (verse: Verse, content: string) => void;
  onDeleteNote: (verseId: string) => void;
  onEditNote: (verseId: string) => void;
}

const TABS: { id: PanelTab; label: string; icon: string }[] = [
  { id: 'ai', label: 'AI', icon: '✦' },
  { id: 'notes', label: 'Notes', icon: '✎' },
  { id: 'tools', label: 'Tools', icon: '⚙' },
];

export function RightPanel({
  isOpen,
  onToggle,
  activeTab,
  onTabChange,
  selectedVerse,
  verses,
  book,
  chapter,
  highlights,
  notes,
  onHighlight,
  onSaveNote,
  onDeleteNote,
  onEditNote,
}: RightPanelProps) {
  const { prefs } = useTheme();
  return (
    <aside
      className={`relative flex-shrink-0 border-l border-stone-200 transition-all duration-200 flex flex-col ${
        isOpen ? 'w-80' : 'w-10'
      } ${
        prefs.theme === 'dark' ? 'bg-zinc-900' : prefs.theme === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'
      }`}
    >
      {/* Toggle chevron */}
      <button
        onClick={onToggle}
        className="absolute -left-3 top-6 z-10 w-6 h-6 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-sm hover:bg-stone-50 transition text-stone-500"
        aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        {isOpen ? '‹' : '›'}
      </button>

      {/* Collapsed: vertical icon strip */}
      {!isOpen && (
        <div className="flex flex-col items-center pt-14 gap-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); onToggle(); }}
              title={tab.label}
              aria-label={tab.label}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 transition text-sm"
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}

      {/* Expanded: tab bar + content */}
      {isOpen && (
        <>
          {/* Tab bar */}
          <div className="flex border-b border-stone-200 flex-shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                  activeTab === tab.id
                    ? 'text-amber-600 border-b-2 border-amber-600'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'ai' && (
              <PanelAI
                selectedVerse={selectedVerse}
                book={book}
                chapter={chapter}
              />
            )}
            {activeTab === 'notes' && (
              <PanelNotes
                selectedVerse={selectedVerse}
                verses={verses}
                highlights={highlights}
                notes={notes}
                onHighlight={onHighlight}
                onSaveNote={onSaveNote}
                onDeleteNote={onDeleteNote}
                onEditNote={onEditNote}
              />
            )}
            {activeTab === 'tools' && (
              <PanelTools book={book} chapter={chapter} />
            )}
          </div>
        </>
      )}
    </aside>
  );
}
