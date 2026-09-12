import React from 'react';
import { X, ExternalLink, Globe, Code2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const portfolios = [
    {
      name: 'Portfolio 1',
      domain: 'mhmahin.rf.gd',
      url: 'https://mhmahin.rf.gd/?i=1',
      badge: 'Main Portfolio',
      desc: 'Personal portfolio, achievements & featured projects',
    },
    {
      name: 'Portfolio 2',
      domain: 'mhxmahin.netlify.app',
      url: 'https://mhxmahin.netlify.app/',
      badge: 'Live Showcase',
      desc: 'Interactive web apps, UI experiments & design lab',
    },
  ];

  return (
    <AnimatePresence>
      <div
        id="developer-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="developer-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md liquid-card rounded-3xl p-6 shadow-2xl border border-white max-h-[90vh] overflow-y-auto no-scrollbar"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            id="developer-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200/50 flex items-center justify-center text-sky-600 shadow-sm">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold not-italic text-slate-900">Developer</h3>
              <p className="text-xs font-bold italic text-slate-500">MH Mahin • Portfolio Links</p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            {portfolios.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                id={`developer-portfolio-link-${idx + 1}`}
                className="group flex items-center justify-between p-4 rounded-2xl bg-white/75 hover:bg-white border border-slate-100/90 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 group-hover:bg-sky-500 text-sky-600 group-hover:text-white border border-sky-100 flex items-center justify-center shrink-0 transition-colors">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold not-italic text-slate-900 group-hover:text-sky-600 transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-bold italic px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold italic text-slate-500 mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-500 group-hover:text-white flex items-center justify-center ml-3 shrink-0 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold not-italic transition-all shadow-sm active:scale-98"
          >
            Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
