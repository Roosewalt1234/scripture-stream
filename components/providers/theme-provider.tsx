'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferences } from '@/types';

interface ThemeContextValue {
  prefs: UserPreferences;
  setPrefs: (p: Partial<UserPreferences>) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  prefs: { theme: 'light', fontSize: 18, lineHeight: 1.7, fontFamily: 'serif' },
  setPrefs: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPreferences>({
    theme: 'light', fontSize: 18, lineHeight: 1.7, fontFamily: 'serif',
  });

  useEffect(() => {
    const stored = localStorage.getItem('ss_prefs');
    if (stored) setPrefsState(JSON.parse(stored));
  }, []);

  function setPrefs(partial: Partial<UserPreferences>) {
    const next = { ...prefs, ...partial };
    setPrefsState(next);
    localStorage.setItem('ss_prefs', JSON.stringify(next));
  }

  return (
    <ThemeContext.Provider value={{ prefs, setPrefs }}>
      <div
        className={`theme-${prefs.theme} min-h-screen`}
        style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineHeight }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
