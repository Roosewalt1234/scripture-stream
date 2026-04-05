'use client';
import Link from 'next/link';
import { useTheme } from '@/components/providers/theme-provider';
import { UserPreferences } from '@/types';

interface ReaderHeaderProps {
  onMenuToggle: () => void;
  onLiveStudy: () => void;
}

export function ReaderHeader({ onMenuToggle, onLiveStudy }: ReaderHeaderProps) {
  const { prefs, setPrefs } = useTheme();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-white dark:bg-stone-900 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="p-2 rounded-lg hover:bg-stone-100 transition" aria-label="Toggle menu">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/" className="font-serif text-lg font-semibold text-stone-800">Scripture Stream</Link>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLiveStudy}
          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition"
        >
          Live Study
        </button>
        {(['light', 'dark', 'sepia'] as UserPreferences['theme'][]).map(t => (
          <button
            key={t}
            onClick={() => setPrefs({ theme: t })}
            className={`w-6 h-6 rounded-full border-2 transition ${prefs.theme === t ? 'border-amber-500 scale-110' : 'border-stone-300'} ${t === 'light' ? 'bg-white' : t === 'dark' ? 'bg-stone-800' : 'bg-amber-100'}`}
            aria-label={`${t} theme`}
          />
        ))}
      </div>
    </header>
  );
}
