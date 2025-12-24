
import React from 'react';
import { UserPreferences } from '../types';
import { THEME_COLORS } from '../constants';

interface HeaderProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  toggleSidebar: () => void;
  onStartVoice: () => void;
}

const Header: React.FC<HeaderProps> = ({ preferences, setPreferences, toggleSidebar, onStartVoice }) => {
  const theme = THEME_COLORS[preferences.theme];

  return (
    <header className={`h-16 flex items-center justify-between px-4 border-b ${theme.border} z-50 sticky top-0 ${theme.bg}`}>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-black/5 rounded-md"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold tracking-tight hidden sm:block">ScriptureStream</h1>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onStartVoice}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Live Study
        </button>

        <div className="h-6 w-px bg-black/10 mx-2"></div>

        <div className="flex items-center gap-1 bg-black/5 p-1 rounded-full">
          {(['light', 'dark', 'sepia'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPreferences(prev => ({ ...prev, theme: t }))}
              className={`w-8 h-8 rounded-full border-2 ${preferences.theme === t ? 'border-blue-500' : 'border-transparent'} flex items-center justify-center`}
              style={{ backgroundColor: THEME_COLORS[t].bg.replace('bg-', '') }}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
            >
              <div className={`w-4 h-4 rounded-full ${t === 'light' ? 'bg-zinc-200' : t === 'dark' ? 'bg-zinc-800' : 'bg-[#e0d6c3]'}`}></div>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
