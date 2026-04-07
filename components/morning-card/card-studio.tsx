'use client';
import { useState } from 'react';

const STYLES = ['Ethereal', 'Ancient', 'Nature', 'Modern'] as const;
type CardStyle = typeof STYLES[number];

interface CardData {
  verseText: string;
  reference: string;
  devotional: string;
  prayer: string;
  imageBase64: string | null;
  style: CardStyle;
}

export function CardStudio({ book, chapter, verse }: { book: string; chapter: number; verse: number }) {
  const [verseText, setVerseText] = useState('');
  const [reference, setReference] = useState(`${book} ${chapter}:${verse}`);
  const [style, setStyle] = useState<CardStyle>('Ethereal');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [error, setError] = useState('');

  async function generate() {
    if (!verseText.trim()) { setError('Please enter verse text first.'); return; }
    setLoading(true); setError(''); setCard(null);
    try {
      const res = await fetch('/api/ai/morning-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verseText, reference, book, chapter, verse, style }),
      });
      const data = await res.json();
      if (res.ok) {
        setCard({ verseText, reference, devotional: data.devotional, prayer: data.prayer, imageBase64: data.imageBase64, style });
      } else { setError(data.error || 'Generation failed.'); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  function downloadCard(format: 'square' | 'story' | 'whatsapp') {
    if (!card) return;
    const canvas = document.createElement('canvas');
    const sizes = { square: [1080, 1080], story: [1080, 1920], whatsapp: [800, 800] };
    const [w, h] = sizes[format];
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const drawCard = () => {
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, w, h);

      if (card.imageBase64) {
        const img = new Image(); img.src = card.imageBase64;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h);
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, w, h);
          drawText(); finishDownload();
        };
      } else { drawText(); finishDownload(); }
    };

    const drawText = () => {
      const pad = w * 0.08;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${w * 0.045}px Georgia, serif`;
      const words = card.verseText.split(' ');
      let line = ''; const lines: string[] = []; const maxW = w - pad * 2;
      for (const word of words) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) { lines.push(line.trim()); line = word + ' '; }
        else { line = test; }
      }
      if (line) lines.push(line.trim());
      const lineH = w * 0.055; const startY = h * 0.38 - ((lines.length - 1) * lineH) / 2;
      lines.forEach((l, i) => ctx.fillText(l, w / 2, startY + i * lineH));
      ctx.fillStyle = '#f4d03f'; ctx.font = `${w * 0.032}px Georgia, serif`;
      ctx.fillText(`— ${card.reference}`, w / 2, startY + lines.length * lineH + w * 0.03);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `${w * 0.026}px Arial, sans-serif`;
      ctx.fillText(card.devotional.slice(0, 120) + '…', w / 2, h * 0.72);
    };

    const finishDownload = () => {
      const a = document.createElement('a'); a.href = canvas.toDataURL('image/png');
      a.download = `morning-card-${format}.png`; a.click();
    };

    drawCard();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left: Controls */}
      <div className="lg:w-80 flex-shrink-0 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Verse Text</label>
          <textarea
            value={verseText}
            onChange={e => setVerseText(e.target.value)}
            placeholder="Paste or type the verse…"
            rows={4}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Reference</label>
          <input
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Background Style</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`py-2 text-sm rounded-lg border transition ${style === s ? 'bg-amber-600 text-white border-amber-600' : 'border-stone-200 hover:border-amber-400'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition disabled:opacity-50"
        >
          {loading ? '✦ Generating…' : '✦ Generate Card'}
        </button>
      </div>

      {/* Right: Preview */}
      <div className="flex-1">
        {!card && !loading && (
          <div className="h-64 lg:h-full border-2 border-dashed border-stone-200 rounded-2xl flex items-center justify-center text-stone-400 text-sm">
            Your morning card will appear here
          </div>
        )}
        {loading && (
          <div className="h-64 lg:h-full border-2 border-dashed border-amber-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 gap-3">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Creating your card…</p>
          </div>
        )}
        {card && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden aspect-square relative bg-stone-900">
              {card.imageBase64 && (
                <img src={card.imageBase64} alt="Card background" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-white font-serif text-lg leading-relaxed mb-3">"{card.verseText}"</p>
                <p className="text-amber-300 text-sm font-medium">— {card.reference}</p>
                {card.devotional && <p className="text-white/70 text-xs mt-4 leading-relaxed">{card.devotional.slice(0, 100)}…</p>}
              </div>
            </div>
            {card.prayer && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Prayer</p>
                <p className="text-sm text-amber-900">{card.prayer}</p>
              </div>
            )}
            <div className="flex gap-2">
              {(['square', 'story', 'whatsapp'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => downloadCard(f)}
                  className="flex-1 py-2 border border-stone-300 rounded-lg text-xs font-medium hover:bg-stone-50 transition capitalize"
                >
                  ↓ {f === 'story' ? 'Story' : f === 'square' ? 'Instagram' : 'WhatsApp'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
