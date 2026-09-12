import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Images } from 'lucide-react';
import { TabType } from '../types';

interface FloatingLiquidDockProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  galleryCount: number;
}

export const FloatingLiquidDock: React.FC<FloatingLiquidDockProps> = ({
  activeTab,
  onTabChange,
  galleryCount
}) => {
  return (
    <nav
      aria-label="Floating Navigation"
      id="liquid-dock-container"
      className="fixed bottom-9 sm:bottom-10 left-1/2 -translate-x-1/2 z-40 px-3 pointer-events-auto"
    >
      <div
        id="liquid-dock"
        className="liquid-dock rounded-full p-1.5 flex items-center gap-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-white/90 ring-1 ring-black/[0.04]"
      >
        {/* Option 1: Studio (Image to Link) */}
        <button
          id="dock-tab-studio"
          type="button"
          onClick={() => onTabChange('studio')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-all duration-300 select-none ${
            activeTab === 'studio'
              ? 'text-slate-900 font-bold not-italic'
              : 'text-slate-500 hover:text-slate-800 font-bold not-italic'
          }`}
        >
          {activeTab === 'studio' && (
            <motion.div
              layoutId="liquid-active-pill"
              className="absolute inset-0 bg-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Sparkles className={`w-4 h-4 transition-colors ${activeTab === 'studio' ? 'text-sky-500' : 'text-slate-400'}`} />
            <span className="tracking-tight whitespace-nowrap font-bold not-italic">Studio</span>
          </span>
        </button>

        {/* Option 2: Vault (Stored Links / Gallery) */}
        <button
          id="dock-tab-gallery"
          type="button"
          onClick={() => onTabChange('gallery')}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-all duration-300 select-none ${
            activeTab === 'gallery'
              ? 'text-slate-900 font-bold not-italic'
              : 'text-slate-500 hover:text-slate-800 font-bold not-italic'
          }`}
        >
          {activeTab === 'gallery' && (
            <motion.div
              layoutId="liquid-active-pill"
              className="absolute inset-0 bg-white rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.9)] border border-white"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            <Images className={`w-4 h-4 transition-colors ${activeTab === 'gallery' ? 'text-sky-500' : 'text-slate-400'}`} />
            <span className="tracking-tight whitespace-nowrap font-bold not-italic">Vault</span>
            {galleryCount > 0 && (
              <span
                id="gallery-count-badge"
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold italic transition-all ${
                  activeTab === 'gallery'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {galleryCount}
              </span>
            )}
          </span>
        </button>
      </div>
    </nav>
  );
};
