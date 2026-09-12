import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageItem } from '../types';

interface LightboxModalProps {
  item: ImageItem | null;
  onClose: () => void;
  onOpenQR: (url: string, title: string) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({ item, onClose, onOpenQR }) => {
  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.35, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.35, 0.7));
  const handleResetZoom = () => setScale(1);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.dataUrl;
    a.download = `${item.name || 'image'}.${item.format.toLowerCase()}`;
    a.click();
  };

  return (
    <AnimatePresence>
      <div
        id="lightbox-backdrop"
        className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xl p-3 sm:p-6"
        onClick={onClose}
      >
        {/* Top Controls Bar */}
        <div
          className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 text-white z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold not-italic truncate max-w-[200px] sm:max-w-xs">
              {item.name}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold italic hidden sm:inline">
              {item.width} × {item.height} • {item.sizeFormatted}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="lightbox-zoom-out"
              type="button"
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              id="lightbox-zoom-in"
              type="button"
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="lightbox-copy-link"
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold not-italic flex items-center gap-1.5 transition-all"
              title="Copy shareable link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline font-bold not-italic">{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <button
              id="lightbox-download"
              type="button"
              onClick={handleDownload}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              id="lightbox-close"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all ml-2"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Viewport */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.img
            src={item.dataUrl}
            alt={item.name}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${scale})` }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleResetZoom}
          />
        </div>
      </div>
    </AnimatePresence>
  );
};
