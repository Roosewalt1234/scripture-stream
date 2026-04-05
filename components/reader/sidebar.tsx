'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BIBLE_BOOKS, TRANSLATIONS } from '@/lib/constants';
import { Translation } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  currentBook: string;
  currentChapter: number;
  currentTranslation: Translation;
  onTranslationChange: (t: Translation) => void;
}

export function Sidebar({ isOpen, currentBook, currentChapter, currentTranslation, onTranslationChange }: SidebarProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'books' | 'translations'>('books');
  const [selectedBook, setSelectedBook] = useState(currentBook);
  const [testament, setTestament] = useState<'Old Testament' | 'New Testament'>('Old Testament');

  const filteredBooks = BIBLE_BOOKS.filter(b => b.category === testament);
  const bookData = BIBLE_BOOKS.find(b => b.name === selectedBook);

  function navigateToChapter(book: string, chapter: number) {
    router.push(`/read/${encodeURIComponent(book.toLowerCase().replace(/ /g, '-'))}/${chapter}`);
  }

  if (!isOpen) return null;

  return (
    <aside className="w-72 border-r border-stone-200 bg-white h-full overflow-y-auto flex-shrink-0">
      {/* Tab bar */}
      <div className="flex border-b border-stone-200">
        {(['books', 'translations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${activeTab === tab ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-500 hover:text-stone-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'books' && (
        <div>
          {/* Testament toggle */}
          <div className="flex p-3 gap-2">
            {(['Old Testament', 'New Testament'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTestament(t)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition ${testament === t ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {t === 'Old Testament' ? 'Old' : 'New'}
              </button>
            ))}
          </div>
          {/* Book list */}
          <div className="px-3 pb-3 space-y-1">
            {filteredBooks.map(book => (
              <button
                key={book.name}
                onClick={() => setSelectedBook(book.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${selectedBook === book.name ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
              >
                {book.name}
              </button>
            ))}
          </div>
          {/* Chapter grid */}
          {bookData && (
            <div className="border-t border-stone-100 p-3">
              <p className="text-xs font-medium text-stone-500 mb-2 uppercase tracking-wide">{selectedBook} — Chapters</p>
              <div className="grid grid-cols-5 gap-1">
                {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => navigateToChapter(selectedBook, ch)}
                    className={`py-1.5 text-xs rounded transition ${selectedBook === currentBook && ch === currentChapter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-amber-100'}`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'translations' && (
        <div className="p-3 space-y-1">
          {TRANSLATIONS.map(t => (
            <button
              key={t.id}
              onClick={() => onTranslationChange(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${currentTranslation === t.id ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
            >
              <span className="font-medium">{t.id.toUpperCase()}</span>
              <span className="text-stone-400 ml-2 text-xs">{t.name}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
