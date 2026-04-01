
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DEFAULT_TRANSLATION } from '../constants';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#2c2420] font-serif overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[130vh] flex items-center justify-center text-center px-6 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-[#fdfaf6] z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=2000" 
            alt="Sunrise over mountains" 
            className="w-full h-full object-cover opacity-40 scale-105"
          />
        </div>

        <div className="relative z-20 max-w-5xl mx-auto pt-32 pb-20 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <img 
            src="logo.png" 
            alt="ScriptureStream Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mx-auto drop-shadow-2xl animate-pulse duration-[3000ms]" 
          />
          <div className="inline-block px-4 py-1.5 border border-[#d4af37] text-[#b48a04] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase rounded-full bg-white/50 backdrop-blur-md">
            Est. 2010 • Scripture Stream
          </div>
          <h1 className="text-4xl md:text-7xl lg:text-8xl font-medium tracking-tight leading-[1.1]">
            Connect with the <span className="italic">Eternal Word</span>.
          </h1>
          <p className="text-base md:text-xl text-[#6d5b4b] max-w-2xl mx-auto leading-relaxed font-sans px-4">
            A sanctuary for deep study, quiet reflection, and divine conversation. Experience the Bible through high-performance technology and wise AI guidance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 px-4">
            <button 
              onClick={() => navigate(`/bible/${DEFAULT_TRANSLATION}/John/3`)}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#2c2420] text-white rounded-full text-lg font-medium hover:bg-black transition-all shadow-2xl shadow-black/20 active:scale-95 font-sans"
            >
              Begin Your Journey
            </button>
            <button 
              className="w-full sm:w-auto px-8 py-3.5 bg-white border border-[#e0d6c3] text-[#2c2420] rounded-full text-lg font-medium hover:bg-gray-50 transition-all active:scale-95 font-sans"
            >
              Learn More
            </button>
            <button 
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-red-600 text-white rounded-full text-lg font-medium hover:from-blue-700 hover:to-red-700 transition-all shadow-2xl shadow-blue-500/20 active:scale-95 font-sans"
            >
              Support Us
            </button>
          </div>
        </div>

        {/* Floating Scripture Decoration */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-[10px] md:text-xs italic opacity-40 tracking-widest text-center w-full px-6">
          "Your word is a lamp to my feet and a light to my path." — Psalm 119:105
        </div>
      </section>

      {/* Pillars of Experience */}
      <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-24 space-y-4">
          <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#b48a04]">Experience Depth</h2>
          <h3 className="text-3xl md:text-5xl font-medium">Tools for the Soul</h3>
        </div>

        <div className="grid lg:grid-cols-3 gap-12 md:gap-16">
          {/* Pillar 1 */}
          <div className="space-y-6 group">
            <div className="aspect-[4/5] md:h-[400px] overflow-hidden rounded-3xl relative">
              <img 
                src="https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=800" 
                alt="Ancient books" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="text-2xl font-medium">Sacred Text</h4>
                <p className="text-sm opacity-80 font-sans mt-1">Free versions in multiple languages.</p>
              </div>
            </div>
            <p className="text-[#6d5b4b] leading-relaxed font-sans text-sm md:text-base">
              Access multiple translations with a distraction-free reader designed for long sessions of prayerful reading.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="space-y-6 group">
            <div className="aspect-[4/5] md:h-[400px] overflow-hidden rounded-3xl relative">
              <img 
                src="https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&q=80&w=800" 
                alt="Open book with glowing light" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="text-2xl font-medium">Wise Insights</h4>
                <p className="text-sm opacity-80 font-sans mt-1">AI-Powered Scholarship.</p>
              </div>
            </div>
            <p className="text-[#6d5b4b] leading-relaxed font-sans text-sm md:text-base">
              Unpack complex verses with our AI Bible scholar, providing historical context and theological depth in seconds.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="space-y-6 group">
            <div className="aspect-[4/5] md:h-[400px] overflow-hidden rounded-3xl relative">
              <img 
                src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=800" 
                alt="Vintage desk" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="text-2xl font-medium">Living Voice</h4>
                <p className="text-sm opacity-80 font-sans mt-1">Real-time Conversations.</p>
              </div>
            </div>
            <p className="text-[#6d5b4b] leading-relaxed font-sans text-sm md:text-base">
              Speak your reflections. Our Voice Study feature allows for a natural, auditory discussion about the scriptures.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Scripture */}
      <section className="bg-[#2c2420] text-white py-24 md:py-32 px-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 translate-x-1/4 -translate-y-1/4 pointer-events-none hidden md:block">
          <svg width="600" height="600" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="99.5" stroke="white" />
            <circle cx="100" cy="100" r="70" stroke="white" />
          </svg>
        </div>
        
        <div className="max-w-3xl mx-auto text-center space-y-10 relative z-10">
          <h2 className="text-[#d4af37] text-xs font-bold tracking-[0.5em] uppercase">The Daily Bread</h2>
          <p className="text-2xl md:text-5xl leading-tight md:leading-relaxed italic">
            "But seek first the kingdom of God and his righteousness, and all these things will be added to you."
          </p>
          <div className="pt-2 font-sans tracking-[0.3em] text-[10px] md:text-xs opacity-50 uppercase">
            MATTHEW 6:33
          </div>
          <button 
            onClick={() => navigate(`/bible/${DEFAULT_TRANSLATION}/Matthew/6`)}
            className="mt-6 px-10 py-4 border border-white/20 rounded-full hover:bg-white hover:text-[#2c2420] transition-all active:scale-95 font-sans text-xs font-bold tracking-widest uppercase"
          >
            Read Chapter
          </button>
        </div>
      </section>

      {/* Footer / Call to Communion */}
      <footer className="py-20 md:py-24 px-6 bg-[#fdfaf6] border-t border-[#e0d6c3]">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-12">
          <Link to="/" className="flex items-center gap-4 text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
            <img src="logo.png" alt="" className="w-10 h-10 object-contain" />
            ScriptureStream
          </Link>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 font-sans text-xs md:text-sm text-[#6d5b4b] uppercase font-bold tracking-widest">
            <Link to="/" className="hover:text-black">Home</Link>
            <a href="#" className="hover:text-black">Study Guides</a>
            <a href="#" className="hover:text-black">Community</a>
            <a href="#" className="hover:text-black">About</a>
          </div>
          <div className="text-[10px] text-[#6d5b4b] font-sans opacity-40 uppercase tracking-widest">
            © 2025 ScriptureStream. Built for wisdom and peace.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
