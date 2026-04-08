'use client';
import { useTheme } from '@/components/providers/theme-provider';
import { useSubscription } from '@/components/providers/subscription-provider';

interface ReaderHeaderProps {
  onMenuToggle: () => void;
  onLiveStudy: () => void;
}

export function ReaderHeader({ onMenuToggle, onLiveStudy }: ReaderHeaderProps) {
  const { prefs } = useTheme();
  const { isPaid } = useSubscription();

  const bg = prefs.theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : prefs.theme === 'sepia' ? 'bg-[#f4ecd8] border-[#d4b896]' : 'bg-white border-stone-200';
  const text = prefs.theme === 'dark' ? 'text-zinc-100' : 'text-stone-700';

  return (
    <header className={`flex items-center gap-3 px-4 py-2.5 border-b ${bg} flex-shrink-0`}>
      <button onClick={onMenuToggle} className={`p-1.5 rounded-lg hover:bg-stone-100 transition ${text}`} aria-label="Toggle sidebar">☰</button>

      <a href="/dashboard" className="text-amber-700 font-bold font-serif text-sm tracking-tight">Scripture Stream</a>

      <div className="flex-1" />

      <nav className="hidden md:flex items-center gap-1">
        <a href="/dashboard" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Dashboard</a>
        <a href="/study" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Study</a>
        {isPaid && <a href="/collections" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>📚 Collections</a>}
        <a href={isPaid ? '/morning-card' : '/pricing?feature=morning-card'} className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text} ${!isPaid ? 'opacity-60' : ''}`}>
          🌅 {!isPaid && '🔒'}
        </a>
        <a href="/settings" className={`px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-stone-100 transition ${text}`}>Settings</a>
      </nav>

      <button
        onClick={onLiveStudy}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition"
      >
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        Live
      </button>
    </header>
  );
}
