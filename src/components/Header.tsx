import React, { useState, useRef } from 'react';
import { Sparkles, Clipboard, Code2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onOpenInfo: () => void;
  onPasteFromClipboard: () => void;
  onOpenAdminPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenInfo, onPasteFromClipboard, onOpenAdminPanel }) => {
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    if (nextCount >= 5) {
      setClickCount(0);
      onOpenAdminPanel();
    } else {
      // Reset clicks after 2 seconds if inactive
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0);
      }, 2000);
    }
  };

  return (
    <header className="w-full max-w-4xl mx-auto pt-4 sm:pt-6 px-4 mb-4">
      <div className="liquid-glass rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Logo & Brand with 5-click easter egg */}
        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="iExtance Studio (Click 5 times for Admin)"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-slate-200/80 bg-white flex items-center justify-center transition-transform active:scale-90 group-hover:scale-105 shrink-0">
            <img 
              src="https://i.ibb.co.com/VWpDMjBk/6427ee4fc6bc0f27aee339f2eff7f60c.jpg" 
              alt="iExtance Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold not-italic tracking-tight text-slate-900 leading-none">
                iExtance
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold italic tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                No Login Required
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-bold italic mt-0.5 tracking-tight hidden sm:block">
              Instant free image hosting • Direct links, HTML & BBCode
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            id="header-paste-btn"
            type="button"
            onClick={onPasteFromClipboard}
            title="Paste image from clipboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-slate-800 text-xs font-bold not-italic border border-white/80 transition-all shadow-sm active:scale-95"
          >
            <Clipboard className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden xs:inline">Paste</span>
          </button>

          <button
            id="header-developer-btn"
            type="button"
            onClick={onOpenInfo}
            title="Developer Portfolios"
            className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-slate-700 flex items-center justify-center border border-white/80 transition-all shadow-sm active:scale-95"
          >
            <Code2 className="w-4 h-4 text-sky-500" />
          </button>
        </div>
      </div>
    </header>
  );
};
