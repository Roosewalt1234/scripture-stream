'use client';
import { useState, useEffect } from 'react';
import { useTheme } from '@/components/providers/theme-provider';
import { localStore } from '@/lib/storage/local';
import { UserPreferences } from '@/types';

interface PanelToolsProps {
  book: string;
  chapter: number;
}

export function PanelTools({ book, chapter }: PanelToolsProps) {
  const { prefs, setPrefs } = useTheme();
  const [isRead, setIsRead] = useState(() => localStore.isRead(book, chapter));
  const [totalRead, setTotalRead] = useState(() => localStore.getProgress().length);

  function toggleRead() {
    if (isRead) {
      localStore.unmarkAsRead(book, chapter);
      setIsRead(false);
    } else {
      localStore.markAsRead(book, chapter);
      setIsRead(true);
    }
    setTotalRead(localStore.getProgress().length);
  }

  useEffect(() => {
    setIsRead(localStore.isRead(book, chapter));
    setTotalRead(localStore.getProgress().length);
  }, [book, chapter]);

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Appearance
        </p>

        {/* Theme */}
        <div className="mb-4">
          <p className="text-xs text-stone-500 mb-2">Theme</p>
          <div className="flex gap-2">
            {(['light', 'dark', 'sepia'] as UserPreferences['theme'][]).map(t => (
              <button
                key={t}
                onClick={() => setPrefs({ theme: t })}
                className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                  prefs.theme === t
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Font size */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-stone-500">Font Size</p>
            <span className="text-xs font-medium text-stone-700">{prefs.fontSize}px</span>
          </div>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={prefs.fontSize}
            onChange={e => setPrefs({ fontSize: Number(e.target.value) })}
            className="w-full accent-amber-600"
            aria-label="Font size"
          />
        </div>

        {/* Font family */}
        <div>
          <p className="text-xs text-stone-500 mb-2">Font</p>
          <div className="flex gap-2">
            {(['serif', 'sans'] as UserPreferences['fontFamily'][]).map(f => (
              <button
                key={f}
                onClick={() => setPrefs({ fontFamily: f })}
                className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition border ${
                  prefs.fontFamily === f
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {f === 'serif' ? 'Serif' : 'Sans-serif'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-stone-100" />

      {/* Reading Progress */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Reading Progress
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRead}
            onChange={toggleRead}
            className="w-4 h-4 accent-amber-600 rounded"
          />
          <span className="text-sm text-stone-700">
            Mark {book} {chapter} as complete
          </span>
        </label>
        <p className="mt-2 text-xs text-stone-400">{totalRead} chapter{totalRead !== 1 ? 's' : ''} completed total</p>
      </section>

      <div className="border-t border-stone-100" />

      {/* Premium locked items */}
      <section>
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Coming Soon (Premium)
        </p>
        {[
          { label: 'Cross References', description: 'See related passages across the Bible' },
          { label: 'Translation Compare', description: 'Compare up to 5 translations side by side' },
          { label: 'Original Language', description: "Hebrew & Greek with Strong's numbers" },
        ].map(item => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 border border-stone-100 mb-2 opacity-70"
          >
            <span className="text-base mt-0.5">🔒</span>
            <div>
              <p className="text-sm font-medium text-stone-700">{item.label}</p>
              <p className="text-xs text-stone-400">{item.description}</p>
            </div>
          </div>
        ))}
        <button className="mt-1 w-full py-2 border border-amber-500 text-amber-700 text-sm rounded-lg hover:bg-amber-50 transition">
          Upgrade to Premium
        </button>
      </section>
    </div>
  );
}
