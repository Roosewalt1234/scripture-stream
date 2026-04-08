'use client';
import { useState, useRef, useEffect } from 'react';
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
  const selectedRef = useRef<HTMLDivElement>(null);

  const filteredBooks = BIBLE_BOOKS.filter(b => b.category === testament);

  // Scroll the expanded chapter grid into view when a book is selected
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedBook]);

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

          {/* Book list with inline chapter grid */}
          <div className="px-3 pb-3 space-y-0.5">
            {filteredBooks.map(book => {
              const isSelected = selectedBook === book.name;
              const bookData = isSelected ? BIBLE_BOOKS.find(b => b.name === book.name) : null;
              return (
                <div key={book.name} ref={isSelected ? selectedRef : undefined}>
                  <button
                    onClick={() => setSelectedBook(isSelected ? '' : book.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${isSelected ? 'bg-amber-50 text-amber-800 font-medium' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    <span>{book.name}</span>
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>

                  {/* Inline chapter grid, directly below the book */}
                  {isSelected && bookData && (
                    <div className="mx-1 mb-1 p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(ch => (
                          <button
                            key={ch}
                            onClick={() => navigateToChapter(book.name, ch)}
                            className={`py-1.5 text-xs rounded transition ${book.name === currentBook && ch === currentChapter ? 'bg-amber-600 text-white font-medium' : 'bg-white text-stone-700 hover:bg-amber-100 border border-stone-100'}`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
