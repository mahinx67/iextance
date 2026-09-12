import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  QrCode, 
  Maximize2, 
  ExternalLink, 
  Download, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageItem } from '../types';
import { copyToClipboard } from '../utils/imageUtils';

interface GalleryViewProps {
  images: ImageItem[];
  onSelectImage: (image: ImageItem) => void;
  onDeleteImage: (id: string) => void;
  onClearAll: () => void;
  onOpenLightbox: (image: ImageItem) => void;
  onOpenQR: (url: string, title: string) => void;
  onGoToStudio: () => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  images,
  onSelectImage,
  onDeleteImage,
  onClearAll,
  onOpenLightbox,
  onOpenQR,
  onGoToStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = images.filter((img) =>
    img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    img.format.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = async (img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const linkToCopy = img.pageUrl || img.directUrl || img.shareUrl;
    await copyToClipboard(linkToCopy);
    setCopiedId(img.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (img: ImageItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = `${img.name || 'image'}.${img.format.toLowerCase()}`;
    a.click();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-28">
      {/* Top Gallery Filter Bar */}
      <div className="liquid-card rounded-2xl p-3 sm:p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm border border-white">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved links..."
            className="w-full bg-white/80 border border-slate-200/80 rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/20 transition-all"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
          <span className="text-xs text-slate-500 font-bold italic">
            {images.length} {images.length === 1 ? 'Stored Link' : 'Stored Links'}
          </span>

          {images.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-500 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50/70 transition-all font-bold not-italic"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Grid of Images */}
      {filtered.length === 0 ? (
        <div className="liquid-card rounded-3xl p-10 text-center flex flex-col items-center justify-center border border-white shadow-sm my-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold not-italic text-slate-800">
            {images.length === 0 ? 'No links created yet' : 'No matches found'}
          </h3>
          <p className="text-xs font-bold italic text-slate-500 mt-1 max-w-sm">
            {images.length === 0
              ? 'Drop or upload an image in the Studio to instantly generate your direct shareable link.'
              : 'Try searching with a different file name or format.'}
          </p>

          {images.length === 0 && (
            <button
              type="button"
              onClick={onGoToStudio}
              className="mt-5 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold not-italic flex items-center gap-2 shadow-sm active:scale-95 transition-all"
            >
              <span>Go to Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((img) => (
            <motion.div
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelectImage(img)}
              className="group liquid-card rounded-2xl overflow-hidden border border-white hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                <img
                  src={img.dataUrl}
                  alt={img.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-white text-[10px] font-bold not-italic tracking-wider uppercase border border-white/20">
                    {img.format}
                  </span>
                </div>

                {/* Quick actions overlay */}
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(img);
                    }}
                    title="Fullscreen preview"
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-90"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQR(img.pageUrl || img.directUrl || img.shareUrl, img.name);
                    }}
                    title="View QR Code"
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-90"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDownload(img, e)}
                    title="Download file"
                    className="w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-90"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Details & Actions */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold not-italic text-slate-900 truncate">
                    {img.name}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] font-bold italic text-slate-400 mt-1">
                    <span>{img.width} × {img.height}</span>
                    <span>{img.sizeFormatted}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(img, e)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-[11px] font-bold not-italic text-slate-700 transition-colors"
                  >
                    {copiedId === img.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 font-bold not-italic">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="font-bold not-italic">Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={img.pageUrl || img.directUrl || img.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open image view in new tab"
                    className="w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(img.id);
                    }}
                    title="Delete item"
                    className="w-7 h-7 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
