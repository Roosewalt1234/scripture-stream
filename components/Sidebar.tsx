
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BIBLE_BOOKS, TRANSLATIONS } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  theme: any;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, theme, onClose }) => {
  const navigate = useNavigate();
  const { book: currentBook, chapter: currentChapter, translation: currentTranslation } = useParams();
  const [activeTab, setActiveTab] = useState<'books' | 'translations'>('books');
  const [activeTestament, setActiveTestament] = useState<'Old Testament' | 'New Testament'>('New Testament');

  const handleChapterSelect = (book: string, chapter: number) => {
    navigate(`/bible/${currentTranslation || 'NIV'}/${book}/${chapter}`);
    if (window.innerWidth < 1024) onClose();
  };

  const handleTranslationSelect = (trans: string) => {
    navigate(`/bible/${trans}/${currentBook || 'John'}/${currentChapter || 3}`);
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <aside className={`
      fixed lg:relative z-50 lg:z-auto h-full w-[85vw] max-w-xs transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'}
      border-r ${theme.border} overflow-y-auto no-scrollbar bg-inherit shadow-2xl lg:shadow-none
    `}>
      <div className="sticky top-0 bg-inherit z-10 border-b border-inherit">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-4 flex gap-2">
          <button 
            onClick={() => setActiveTab('books')}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'books' ? 'bg-black/10' : 'opacity-40 hover:opacity-100'}`}
          >
            Books
          </button>
          <button 
            onClick={() => setActiveTab('translations')}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'translations' ? 'bg-black/10' : 'opacity-40 hover:opacity-100'}`}
          >
            Versions
          </button>
        </div>

        {activeTab === 'books' && (
          <div className="px-4 pb-4 flex gap-2">
            <button 
              onClick={() => setActiveTestament('Old Testament')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all ${activeTestament === 'Old Testament' ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900' : 'border-inherit opacity-50 hover:opacity-100'}`}
            >
              Old Testament
            </button>
            <button 
              onClick={() => setActiveTestament('New Testament')}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border transition-all ${activeTestament === 'New Testament' ? 'bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-100 dark:text-zinc-900' : 'border-inherit opacity-50 hover:opacity-100'}`}
            >
              New Testament
            </button>
          </div>
        )}
      </div>

      <div className="p-2 pb-24 lg:pb-8">
        {activeTab === 'translations' ? (
          <div className="space-y-1">
            {TRANSLATIONS.map(t => (
              <button
                key={t.id}
                onClick={() => handleTranslationSelect(t.id)}
                className={`w-full text-left px-4 py-4 rounded-xl transition-all active:scale-[0.98] ${currentTranslation === t.id ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-black/5'}`}
              >
                <div className="font-bold">{t.id}</div>
                <div className="text-xs opacity-60">{t.name}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {BIBLE_BOOKS.filter(b => b.category === activeTestament).map(book => (
              <BookAccordion 
                key={book.name} 
                book={book} 
                theme={theme} 
                onChapterSelect={handleChapterSelect} 
                currentBook={currentBook} 
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};

const BookAccordion: React.FC<{ book: any, theme: any, onChapterSelect: any, currentBook?: string }> = ({ book, theme, onChapterSelect, currentBook }) => {
  const [isOpen, setIsOpen] = useState(currentBook === book.name);
  
  return (
    <div className="mb-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-4 py-3 rounded-lg hover:bg-black/5 flex justify-between items-center transition-all ${currentBook === book.name ? 'text-blue-500 font-bold bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
      >
        <span className="text-sm">{book.name}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="grid grid-cols-5 gap-1.5 p-2 bg-black/5 rounded-xl mt-1">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map(chap => (
            <button
              key={chap}
              onClick={() => onChapterSelect(book.name, chap)}
              className="aspect-square flex items-center justify-center text-xs font-medium rounded-lg hover:bg-blue-500 hover:text-white transition-all active:scale-90"
            >
              {chap}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
