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
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);

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

      ctx.font = `bold ${fontSize * 0.42}px Georgia, serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(`— ${reference}`, w / 2, startY + lines.length * lineH + 60);

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
            &ldquo;{verse.text.slice(0, 120)}{verse.text.length > 120 ? '…' : ''}&rdquo;
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
