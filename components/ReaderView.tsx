
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bibleService } from '../services/bibleService';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { decodeBase64, decodeAudioData } from '../utils/audioUtils';
import { Verse, Translation, UserPreferences, Note, Highlight } from '../types';

interface ReaderViewProps {
  preferences: UserPreferences;
  onViewChange?: (context: any) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', class: 'bg-yellow-200/60 dark:bg-yellow-600/40', btn: 'bg-yellow-400', key: 'yellow' },
  { name: 'Blue', class: 'bg-blue-200/60 dark:bg-blue-600/40', btn: 'bg-blue-400', key: 'blue' },
  { name: 'Green', class: 'bg-green-200/60 dark:bg-green-600/40', btn: 'bg-blue-400', key: 'green' },
  { name: 'Pink', class: 'bg-pink-200/60 dark:bg-pink-600/40', btn: 'bg-pink-400', key: 'pink' },
  { name: 'Orange', class: 'bg-orange-200/60 dark:bg-orange-600/40', btn: 'bg-orange-400', key: 'orange' },
];

const ART_STYLES = ["Ethereal", "Ancient", "Nature", "Modern"];

const ReaderView: React.FC<ReaderViewProps> = ({ preferences, onViewChange }) => {
  const { translation, book, chapter } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studyPanelRef = useRef<HTMLDivElement>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [historicalContext, setHistoricalContext] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);
  const [note, setNote] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isRead, setIsRead] = useState(false);
  
  // Audio States
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Share States
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [verseArtUrl, setVerseArtUrl] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("Ethereal");

  useEffect(() => {
    const loadChapter = async () => {
      if (!book || !chapter || !translation) return;
      stopAudio(); // Stop any audio from previous chapter
      setLoading(true);
      setError(null);
      try {
        const data = await bibleService.getChapter(book, parseInt(chapter), translation as Translation);
        setVerses(data);
        setHighlights(storageService.getHighlights());
        setIsRead(storageService.isChapterRead(book, parseInt(chapter)));
        
        if (onViewChange) {
          onViewChange({
            book,
            chapter,
            translation,
            selectedVerseText: null
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load scripture.");
      } finally {
        setLoading(false);
      }
    };
    loadChapter();
    setSelectedVerse(null);
    setAiContent(null);
    setHistoricalContext(null);
    setVerseArtUrl(null);
  }, [book, chapter, translation]);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleListenChapter = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (verses.length === 0) return;

    setIsTtsLoading(true);
    try {
      const fullText = verses.map(v => `${v.number}. ${v.text}`).join(' ');
      const base64Audio = await geminiService.generateSpeech(fullText);

      if (!base64Audio) throw new Error("Failed to generate audio.");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioContextRef.current,
        24000,
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      
      audioSourceRef.current = source;
      source.start();
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
      alert("Failed to play chapter voice.");
    } finally {
      setIsTtsLoading(false);
    }
  };

  const handleVerseClick = (v: Verse) => {
    setSelectedVerse(v);
    setAiContent(null);
    setVerseArtUrl(null);
    const existingNotes = storageService.getNotes();
    const verseNote = existingNotes.find(n => n.verseId === v.id);
    setNote(verseNote ? verseNote.content : "");
    
    // Smooth scroll to study panel on mobile
    if (window.innerWidth < 1024 && studyPanelRef.current) {
      setTimeout(() => {
        studyPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    if (onViewChange) {
      onViewChange({
        book,
        chapter,
        translation,
        selectedVerseText: v.text
      });
    }
  };

  const fetchAiExplanation = async () => {
    if (!selectedVerse) return;
    setIsAiLoading(true);
    try {
      const result = await geminiService.getVerseExplanation(selectedVerse);
      setAiContent(result);
    } catch (e) {
      setAiContent("Failed to load explanation.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const fetchHistoricalContext = async () => {
    if (!book || !chapter) return;
    setIsHistoricalLoading(true);
    try {
      const result = await geminiService.getHistoricalContext(book, parseInt(chapter));
      setHistoricalContext(result);
    } catch (e) {
      setHistoricalContext("Failed to load historical context.");
    } finally {
      setIsHistoricalLoading(false);
    }
  };

  const handleCopy = () => {
    if (!selectedVerse) return;
    const shareText = `${selectedVerse.text} (${book} ${chapter}:${selectedVerse.number} ${translation})`;
    navigator.clipboard.writeText(shareText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const createVerseArt = async () => {
    if (!selectedVerse || !book || !chapter) return;
    setIsGeneratingArt(true);
    setVerseArtUrl(null);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
    };

    try {
      const bgDataUrl = await geminiService.generateVerseArtBackground(selectedVerse.text, selectedStyle);
      if (!bgDataUrl) throw new Error("Could not generate background");

      const [bgImg, logoImg] = await Promise.all([
        loadImage(bgDataUrl),
        loadImage('logo.png').catch(() => null) // Optional logo
      ]);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 1080;
      canvas.width = size;
      canvas.height = size;

      // Draw Background
      ctx.drawImage(bgImg, 0, 0, size, size);

      // Vignette Overlay
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size * 0.8);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Main Text Styling
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);
        const totalHeight = lines.length * lineHeight;
        let startY = y - (totalHeight / 2);
        lines.forEach((l, i) => { ctx.fillText(l, x, startY + (i * lineHeight)); });
        return totalHeight;
      };

      ctx.font = 'italic 58px "Crimson Pro", serif';
      const textHeight = wrapText(selectedVerse.text, size / 2, size / 2 - 40, 850, 75);
      
      // Reference Styling
      ctx.shadowBlur = 8;
      ctx.font = 'bold 36px "Inter", sans-serif';
      ctx.globalAlpha = 0.95;
      ctx.fillText(`${book} ${chapter}:${selectedVerse.number}`, size / 2, (size / 2) + (textHeight / 2) + 60);
      
      ctx.font = '400 22px "Inter", sans-serif';
      ctx.globalAlpha = 0.7;
      ctx.fillText(translation || 'NIV', size / 2, (size / 2) + (textHeight / 2) + 110);

      // Logo and Tagline at Bottom
      if (logoImg) {
        const logoSize = 100;
        ctx.globalAlpha = 0.8;
        ctx.shadowBlur = 0;
        ctx.drawImage(logoImg, (size / 2) - (logoSize / 2), size - 200, logoSize, logoSize);
      }

      ctx.globalAlpha = 0.5;
      ctx.font = '300 20px "Inter", sans-serif';
      ctx.fillText('ScriptureStream • Sacred Study', size / 2, size - 70);

      setVerseArtUrl(canvas.toDataURL('image/png'));
      setIsGeneratingArt(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create Verse Art.");
      setIsGeneratingArt(false);
    }
  };

  const saveNote = () => {
    if (!selectedVerse) return;
    const newNote: Note = {
      id: Math.random().toString(36),
      verseId: selectedVerse.id,
      content: note,
      lastUpdated: Date.now()
    };
    storageService.saveNote(newNote);
    alert("Note saved!");
  };

  const handleHighlight = (v: Verse, color: string) => {
    const existing = highlights.find(h => h.verseId === v.id);
    if (existing) {
      if (existing.color === color) {
        storageService.removeHighlight(v.id);
      } else {
        storageService.removeHighlight(v.id);
        storageService.saveHighlight({ id: Math.random().toString(36), verseId: v.id, color });
      }
    } else {
      storageService.saveHighlight({ id: Math.random().toString(36), verseId: v.id, color });
    }
    setHighlights(storageService.getHighlights());
  };

  const toggleRead = () => {
    if (!book || !chapter) return;
    const chapNum = parseInt(chapter);
    if (isRead) {
      storageService.unmarkAsRead(book, chapNum);
    } else {
      storageService.markAsRead(book, chapNum);
    }
    setIsRead(!isRead);
  };

  const nextChapter = () => {
    const chap = parseInt(chapter || "1");
    navigate(`/bible/${translation}/${book}/${chap + 1}`);
  };

  const prevChapter = () => {
    const chap = parseInt(chapter || "1");
    if (chap > 1) {
      navigate(`/bible/${translation}/${book}/${chap - 1}`);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="font-medium animate-pulse text-sm">Accessing Authoritative Text...</p>
          <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">Fetching {translation} Version</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold">Unable to reach scripture</h2>
        <p className="text-sm opacity-60 max-w-xs">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-zinc-800 text-white rounded-full text-sm font-bold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Main Reader Body */}
      <div className="flex-1 p-4 md:p-12 lg:p-20 overflow-y-auto no-scrollbar">
        <div className="max-w-2xl mx-auto space-y-12">
          <header className="text-center space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-3xl md:text-5xl font-bold font-serif leading-tight">{book} {chapter}</h2>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                   <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase opacity-40 mb-2">{translation}</p>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={toggleRead}
                        className={`transition-all duration-300 w-12 h-12 rounded-full border-2 flex items-center justify-center active:scale-90
                          ${isRead ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-200 hover:text-gray-400 hover:border-gray-400 dark:border-zinc-800'}`}
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      
                      <button 
                        onClick={handleListenChapter}
                        disabled={isTtsLoading}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border-2
                          ${isPlaying ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20'}
                          ${isTtsLoading ? 'opacity-50' : ''}`}
                      >
                        {isTtsLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : isPlaying ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </header>

          <div 
            className={`${preferences.fontFamily === 'serif' ? 'font-serif' : 'font-sans'} transition-all duration-300 relative`}
            style={{ 
              fontSize: `${preferences.fontSize}px`, 
              lineHeight: preferences.lineHeight 
            }}
          >
            {verses.map((v) => {
              const isSelected = selectedVerse?.id === v.id;
              const h = highlights.find(h => h.verseId === v.id);
              const highlightStyle = h ? (HIGHLIGHT_COLORS.find(c => c.key === h.color)?.class || 'bg-yellow-200/50') : '';
              
              return (
                <span 
                  key={v.id}
                  onClick={() => handleVerseClick(v)}
                  className={`relative group cursor-pointer inline-block transition-all mr-1 p-1 rounded-lg
                    ${isSelected ? 'bg-blue-500/10 ring-2 ring-blue-500/30' : 'hover:bg-black/5'}
                    ${highlightStyle}
                  `}
                >
                  <sup className="text-[0.6em] font-bold opacity-30 mr-1.5 select-none">{v.number}</sup>
                  {v.text}
                </span>
              );
            })}
          </div>

          <footer className="flex justify-between items-center py-10 border-t border-inherit">
            <button 
              onClick={prevChapter}
              className="flex-1 max-w-[140px] py-4 rounded-2xl bg-black/5 hover:bg-black/10 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
              Prev
            </button>
            <button 
              onClick={nextChapter}
              className="flex-1 max-w-[140px] py-4 rounded-2xl bg-black/5 hover:bg-black/10 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm font-bold"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </footer>
        </div>
      </div>

      {/* Sidebar Study Panel */}
      <aside 
        ref={studyPanelRef}
        className={`lg:w-96 w-full lg:h-full border-t lg:border-t-0 lg:border-l border-inherit flex flex-col transition-all bg-black/[0.02] dark:bg-white/[0.01]`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
          
          {/* Chapter Level Section */}
          <section className="p-6 border-b border-inherit space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-tight">{book} {chapter} Overlook</h3>
              {historicalContext && (
                <button 
                  onClick={() => setHistoricalContext(null)} 
                  className="text-[10px] font-bold uppercase p-2 opacity-30 hover:opacity-100 transition-opacity"
                >
                  Reset
                </button>
              )}
            </div>
            
            <button 
              onClick={fetchHistoricalContext}
              disabled={isHistoricalLoading}
              className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isHistoricalLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              )}
              Historical Background
            </button>

            {historicalContext && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                <h5 className="text-[10px] font-bold uppercase opacity-40 tracking-widest pl-1">Historical Context</h5>
                <div className="prose prose-sm bg-indigo-100 dark:bg-indigo-900/40 p-5 rounded-2xl leading-relaxed text-sm whitespace-pre-wrap text-zinc-900 dark:text-zinc-50 border border-indigo-200 dark:border-indigo-700/50 shadow-sm font-medium">
                  {historicalContext}
                </div>
              </div>
            )}
          </section>

          {/* Verse Level Section */}
          <section className="p-6 space-y-8">
            {!selectedVerse ? (
              <div className="py-20 text-center space-y-6 opacity-30">
                <div className="w-16 h-16 bg-black/5 rounded-3xl flex items-center justify-center mx-auto">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                </div>
                <p className="text-sm font-medium px-8 leading-relaxed">Tap any verse to unlock AI explanations, highlighters, and private study notes.</p>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-300">
                <header className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl tracking-tight">{book} {chapter}:{selectedVerse.number}</h3>
                    <button onClick={() => setSelectedVerse(null)} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full transition-colors">
                      <svg className="w-5 h-5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  
                  {/* Highlights UI */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40 pl-1">Mark with Color</h4>
                    <div className="flex flex-wrap gap-3">
                      {HIGHLIGHT_COLORS.map(c => {
                        const isActive = highlights.find(h => h.verseId === selectedVerse.id)?.color === c.key;
                        return (
                          <button
                            key={c.key}
                            onClick={() => handleHighlight(selectedVerse, c.key)}
                            className={`w-11 h-11 rounded-2xl ${c.btn} border-4 transition-all active:scale-90 ${isActive ? 'border-zinc-800 dark:border-white shadow-lg' : 'border-transparent'}`}
                            title={c.name}
                          />
                        );
                      })}
                      <button
                        onClick={() => storageService.removeHighlight(selectedVerse.id)}
                        className="w-11 h-11 rounded-2xl bg-white dark:bg-zinc-800 border border-inherit flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                        title="Remove Highlight"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Share/Art UI */}
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <button 
                        onClick={handleCopy}
                        className="flex-1 h-14 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 border border-inherit transition-all active:scale-95"
                      >
                        {copyFeedback ? "Copied" : "Copy"}
                      </button>
                      <button 
                        onClick={createVerseArt}
                        disabled={isGeneratingArt}
                        className="flex-1 h-14 bg-zinc-800 dark:bg-white text-white dark:text-black rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isGeneratingArt ? <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div> : "Create Art"}
                      </button>
                    </div>
                    
                    {!verseArtUrl && !isGeneratingArt && (
                      <div className="grid grid-cols-4 gap-2">
                        {ART_STYLES.map(s => (
                          <button
                            key={s}
                            onClick={() => setSelectedStyle(s)}
                            className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${selectedStyle === s ? 'bg-zinc-800 dark:bg-white text-white dark:text-black border-zinc-800' : 'bg-transparent text-zinc-500 border-inherit'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {verseArtUrl && (
                      <div className="p-3 bg-white dark:bg-zinc-800 rounded-3xl border border-inherit shadow-2xl animate-in zoom-in-95 duration-300">
                        <img src={verseArtUrl} alt="Verse Art" className="w-full h-auto rounded-2xl mb-4 shadow-lg" />
                        <div className="flex gap-2">
                           <a href={verseArtUrl} download={`VerseArt-${book}-${chapter}.png`} className="flex-1 h-12 bg-emerald-600 text-white flex items-center justify-center rounded-2xl text-xs font-bold hover:bg-emerald-700 transition-colors">Download Image</a>
                           <button onClick={() => setVerseArtUrl(null)} className="px-5 h-12 bg-black/5 rounded-2xl text-xs font-bold transition-colors">Back</button>
                        </div>
                      </div>
                    )}
                  </div>
                </header>

                {/* Verse AI Insight */}
                <section className="space-y-6">
                  <h4 className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-40 flex items-center gap-3 pl-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    Meaning & Significance
                  </h4>
                  <button 
                    onClick={fetchAiExplanation}
                    disabled={isAiLoading}
                    className="w-full h-14 bg-purple-500 hover:bg-purple-600 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3"
                  >
                    {isAiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Unpack Verse Meaning"}
                  </button>
                  {aiContent && (
                    <div className="prose prose-sm bg-white/95 dark:bg-zinc-800/95 p-6 rounded-3xl leading-relaxed text-sm whitespace-pre-wrap border border-purple-200 dark:border-purple-800/50 animate-in fade-in slide-in-from-top-4 shadow-md text-zinc-900 dark:text-zinc-100 font-medium">
                      {aiContent}
                    </div>
                  )}
                </section>

                {/* Verse Notes */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-bold tracking-widest uppercase opacity-40 pl-1">Study Journal</h4>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Enter your personal reflections here..."
                    className="w-full h-48 p-5 rounded-3xl bg-white dark:bg-zinc-800 border border-inherit text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:opacity-30"
                  />
                  <button 
                    onClick={saveNote}
                    className="w-full h-14 bg-blue-500 text-white rounded-2xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
                  >
                    Save Reflection
                  </button>
                </section>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
};

export default ReaderView;
