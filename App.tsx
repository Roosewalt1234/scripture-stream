
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserPreferences } from './types';
import { DEFAULT_TRANSLATION, THEME_COLORS } from './constants';
import ReaderView from './components/ReaderView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LiveConversation from './components/LiveConversation';
import LandingPage from './components/LandingPage';

// Wrapper component to handle the layout based on current route
const MainLayout: React.FC<{ 
  preferences: UserPreferences, 
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>,
  isSidebarOpen: boolean,
  setSidebarOpen: (o: boolean) => void,
  setIsVoiceActive: (a: boolean) => void,
  setVoiceContext: (c: any) => void,
  voiceContext: any,
  isVoiceActive: boolean
}> = ({ 
  preferences, setPreferences, isSidebarOpen, setSidebarOpen, 
  setIsVoiceActive, setVoiceContext, voiceContext, isVoiceActive 
}) => {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const theme = THEME_COLORS[preferences.theme];

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  if (isLanding) {
    return <LandingPage />;
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} theme-transition flex flex-col relative`}>
      <Header 
        preferences={preferences} 
        setPreferences={setPreferences}
        toggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        onStartVoice={() => setIsVoiceActive(true)}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar 
          isOpen={isSidebarOpen} 
          theme={theme}
          onClose={() => setSidebarOpen(false)}
        />
        
        <main className="flex-1 overflow-y-auto no-scrollbar relative w-full">
          <Routes>
            <Route path="/bible/:translation/:book/:chapter" element={
              <ReaderView 
                preferences={preferences} 
                onViewChange={(ctx) => setVoiceContext(ctx)} 
              />
            } />
            {/* Fallback for malformed bible URLs */}
            <Route path="/bible/*" element={<Navigate to={`/bible/${DEFAULT_TRANSLATION}/John/3`} replace />} />
          </Routes>
        </main>
      </div>

      <LiveConversation 
        isActive={isVoiceActive} 
        onClose={() => setIsVoiceActive(false)}
        context={voiceContext}
      />
    </div>
  );
};

const App: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    fontSize: 18, // Slightly smaller base for mobile
    lineHeight: 1.7,
    fontFamily: 'serif'
  });

  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceContext, setVoiceContext] = useState<any>({});

  return (
    <HashRouter>
      <MainLayout 
        preferences={preferences}
        setPreferences={setPreferences}
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
        setIsVoiceActive={setIsVoiceActive}
        setVoiceContext={setVoiceContext}
        voiceContext={voiceContext}
        isVoiceActive={isVoiceActive}
      />
    </HashRouter>
  );
};

export default App;
