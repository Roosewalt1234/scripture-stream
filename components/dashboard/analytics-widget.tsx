'use client';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/providers/subscription-provider';

interface AnalyticsData {
  totalChapters: number;
  totalHighlights: number;
  totalNotes: number;
  streak: number;
  calendar: Record<string, number>;
  topBooks: { book: string; chapters: number }[];
}

export function AnalyticsWidget() {
  const { isPaid } = useSubscription();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/analytics').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-stone-100 rounded-xl" />;
  if (!data) return null;

  const calDays = Object.entries(data.calendar);
  const maxCount = Math.max(...calDays.map(([, v]) => v), 1);

  function getColor(count: number): string {
    if (count === 0) return 'bg-stone-100';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.33) return 'bg-amber-200';
    if (intensity < 0.66) return 'bg-amber-400';
    return 'bg-amber-600';
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Chapters', value: data.totalChapters },
          { label: 'Day Streak', value: data.streak },
          { label: 'Highlights', value: data.totalHighlights },
          { label: 'Notes', value: data.totalNotes },
        ].map(s => (
          <div key={s.label} className="bg-stone-50 rounded-xl p-3 text-center border border-stone-200">
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Streak calendar — last 90 days */}
      {isPaid && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Reading Activity (90 days)</p>
          <div className="flex flex-wrap gap-1">
            {calDays.map(([date, count]) => (
              <div
                key={date}
                title={`${date}: ${count} chapter${count !== 1 ? 's' : ''}`}
                className={`w-3 h-3 rounded-sm ${getColor(count)}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Top books */}
      {data.topBooks.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Most Read Books</p>
          <div className="space-y-2">
            {data.topBooks.map(({ book, chapters }) => (
              <div key={book} className="flex items-center gap-3">
                <span className="text-sm text-stone-700 w-24 truncate">{book}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(chapters / (data.topBooks[0]?.chapters ?? 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-stone-400">{chapters} ch</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
