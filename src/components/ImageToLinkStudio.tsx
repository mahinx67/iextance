import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Link2, 
  Copy, 
  Check, 
  QrCode, 
  Maximize2, 
  Download, 
  Share2, 
  Code, 
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageItem, LinkFormat } from '../types';
import { processImageFile, copyToClipboard } from '../utils/imageUtils';

interface ImageToLinkStudioProps {
  onImageCreated: (image: ImageItem) => void;
  activeImage: ImageItem | null;
  onOpenLightbox: (image: ImageItem) => void;
  onOpenQR: (url: string, title: string) => void;
  onDeleteActiveImage?: (id: string) => void;
}

export const ImageToLinkStudio: React.FC<ImageToLinkStudioProps> = ({
  onImageCreated,
  activeImage,
  onOpenLightbox,
  onOpenQR,
  onDeleteActiveImage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkFormat, setLinkFormat] = useState<LinkFormat>('page');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatted string based on selected format (ImgBB-style: Viewer page vs Direct link vs Embed codes)
  const getFormattedLink = (item: ImageItem, format: LinkFormat): string => {
    const directUrl = item.directUrl || item.shareUrl;
    const pageUrl = item.pageUrl || item.appShareUrl || item.shareUrl;

    switch (format) {
      case 'page':
        return pageUrl;
      case 'direct':
        return directUrl;
      case 'markdown':
        return `![${item.name}](${directUrl})`;
      case 'html':
        return `<img src="${directUrl}" alt="${item.name}" />`;
      case 'bbcode':
        return `[img]${directUrl}[/img]`;
      default:
        return pageUrl;
    }
  };

  const handleCopy = async (text: string, formatName: string) => {
    await copyToClipboard(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP, GIF, SVG).');
      return;
    }

    setIsProcessing(true);
    try {
      const processed = await processImageFile(file);
      onImageCreated(processed);
    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle native Web Share (common and sleek on iOS)
  const handleShare = async (item: ImageItem) => {
    const targetUrl = item.pageUrl || item.directUrl || item.shareUrl;
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.name,
          text: `Check out this image on iExtance: ${item.name}`,
          url: targetUrl,
        });
      } catch {
        // Fallback to copy if user cancels or fails
        handleCopy(targetUrl, 'page');
      }
    } else {
      handleCopy(targetUrl, 'page');
    }
  };

  const activeLink = activeImage ? getFormattedLink(activeImage, linkFormat) : '';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-28">
      {/* Floating Liquid Glass Drop Box on Glass Base Plate */}
      <div
        id="drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden cursor-pointer rounded-[32px] p-8 sm:p-12 transition-all duration-500 glass-base-plate ${
          isDragging
            ? 'border-sky-300 shadow-[0_25px_60px_rgba(56,189,248,0.2)] scale-[1.015]'
            : 'hover:shadow-[0_30px_70px_-15px_rgba(15,23,42,0.09)]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Ambient Glass Reflections & Refractions */}
        <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-sky-200/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center text-center py-2">
          {/* Floating Liquid Glass Droplet / Capsule */}
          <div className="relative flex flex-col items-center">
            <motion.div
              animate={{ y: isDragging ? -10 : [0, -7, 0] }}
              transition={{ repeat: isDragging ? 0 : Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] floating-liquid-glass flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-105"
            >
              {/* Internal Specular Glass Highlight */}
              <div className="absolute inset-1 rounded-[24px] bg-gradient-to-b from-white/70 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-1.5 left-2 w-7 h-3 rounded-full bg-white/80 blur-[1px] pointer-events-none -rotate-12" />

              {/* Floating Center Icon */}
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 text-sky-500 animate-spin drop-shadow-sm" />
              ) : (
                <Upload className="w-8 h-8 text-sky-500 transition-all duration-300 group-hover:scale-110 drop-shadow-sm" />
              )}
            </motion.div>

            {/* Caustic Shadow underneath the floating glass on the base glass plate */}
            <motion.div
              animate={{
                scale: isDragging ? 0.85 : [1, 0.82, 1],
                opacity: isDragging ? 0.35 : [0.55, 0.35, 0.55],
              }}
              transition={{ repeat: isDragging ? 0 : Infinity, duration: 4.5, ease: 'easeInOut' }}
              className="w-16 h-3 mt-3 rounded-full bg-gradient-to-r from-sky-400/20 via-slate-900/15 to-sky-400/20 blur-md pointer-events-none"
            />
          </div>

          {/* ImgBB-style Instant Upload CTA */}
          <h2 className="text-base sm:text-lg font-bold not-italic text-slate-900 tracking-tight mt-3">
            Upload and share your images
          </h2>
          <p className="text-xs sm:text-xs text-slate-500 font-bold italic tracking-tight mt-1 select-none">
            Drag and drop anywhere, browse from device, or paste (Ctrl+V) • No login required
          </p>

          <div className="mt-4">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold not-italic shadow-md shadow-slate-900/10 transition-all group-hover:scale-105">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Start Uploading</span>
            </span>
          </div>
        </div>
      </div>

      {/* Professional Liquid Glass Capability Showcase */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="liquid-card rounded-2xl p-3 sm:p-4 text-center border border-white flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center mb-1.5 border border-sky-100/50">
            <Link2 className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold not-italic text-slate-800">Instant Direct</span>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold italic mt-0.5 hidden xs:block">
            Lightning zero-lag URLs
          </p>
        </div>

        <div className="liquid-card rounded-2xl p-3 sm:p-4 text-center border border-white flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-1.5 border border-indigo-100/50">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold not-italic text-slate-800">Smart Beam</span>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold italic mt-0.5 hidden xs:block">
            High-density vector QR
          </p>
        </div>

        <div className="liquid-card rounded-2xl p-3 sm:p-4 text-center border border-white flex flex-col items-center">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5 border border-teal-100/50">
            <Code className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold not-italic text-slate-800">Multi-Embed</span>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold italic mt-0.5 hidden xs:block">
            Markdown, HTML, BBCode
          </p>
        </div>
      </div>

      {/* Active Converted Image Result Section */}
      <AnimatePresence mode="wait">
        {activeImage && (
          <motion.div
            key={activeImage.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mt-6 space-y-4"
          >
            {/* Main Result Card */}
            <div className="liquid-card rounded-3xl p-5 sm:p-7 shadow-xl border border-white relative overflow-hidden">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Visual Image Preview */}
                <div className="relative group w-full md:w-64 h-52 sm:h-60 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 shrink-0 flex items-center justify-center shadow-inner">
                  <img
                    src={activeImage.dataUrl}
                    alt={activeImage.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Overlay click to expand */}
                  <div
                    onClick={() => onOpenLightbox(activeImage)}
                    className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                  >
                    <div className="px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-bold not-italic flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="w-3.5 h-3.5" />
                      View Full
                    </div>
                  </div>

                  {/* Format tag */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-white text-[10px] font-bold not-italic tracking-wider uppercase border border-white/20">
                    {activeImage.format}
                  </div>
                </div>

                {/* Information & Link Output */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold not-italic text-slate-900 line-clamp-1">
                            {activeImage.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold italic text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <CheckCircle2 className="w-3 h-3" />
                            {activeImage.isTelegramCloud ? 'High-Speed CDN Ready' : 'Link Ready'}
                          </span>
                        </div>
                        <p className="text-xs font-bold italic text-slate-400 mt-1">
                          {activeImage.width} × {activeImage.height} px • {activeImage.sizeFormatted} • Aspect {activeImage.aspectRatio}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenQR(activeImage.pageUrl || activeImage.directUrl || activeImage.shareUrl, activeImage.name)}
                          title="Generate QR code"
                          className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all shadow-sm active:scale-95"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleShare(activeImage)}
                          title="Share link"
                          className="w-9 h-9 rounded-xl bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 flex items-center justify-center transition-all shadow-sm active:scale-95"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        {onDeleteActiveImage && (
                          <button
                            id="studio-active-delete-btn"
                            type="button"
                            onClick={() => onDeleteActiveImage(activeImage.id)}
                            title="Delete image & link"
                            className="w-9 h-9 rounded-xl bg-white/80 hover:bg-rose-50 text-slate-500 hover:text-rose-500 border border-slate-200/80 flex items-center justify-center transition-all shadow-sm active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Format Tabs (ImgBB-Style) */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60 max-w-fit">
                      {[
                        { id: 'page', label: 'Viewer Link' },
                        { id: 'direct', label: 'Direct Image' },
                        { id: 'markdown', label: 'Markdown' },
                        { id: 'html', label: 'HTML' },
                        { id: 'bbcode', label: 'BBCode' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setLinkFormat(tab.id as LinkFormat)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold not-italic transition-all ${
                            linkFormat === tab.id
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Link Display Box */}
                    <div className="mt-3 relative">
                      <div className="w-full flex items-center bg-white/90 border border-slate-200 rounded-2xl p-2.5 shadow-inner">
                        <Link2 className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
                        <input
                          type="text"
                          readOnly
                          value={activeLink}
                          aria-label="Generated Link URL"
                          className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-700 px-2.5 font-mono outline-none truncate"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(activeLink, linkFormat)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold not-italic flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                          >
                            {copiedFormat === linkFormat ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <a
                            href={linkFormat === 'direct' ? (activeImage.directUrl || activeImage.shareUrl) : (activeImage.pageUrl || activeImage.shareUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open link in new tab to view image"
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-xs active:scale-95"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold italic text-slate-400">Dominant Shade:</span>
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: activeImage.color }}
                      />
                      <span className="text-[11px] font-mono font-bold italic text-slate-500">{activeImage.color}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={activeImage.dataUrl}
                        download={`${activeImage.name}.${activeImage.format.toLowerCase()}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold not-italic text-slate-700 transition-all active:scale-95 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold not-italic text-slate-700 transition-all active:scale-95 shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        New Image
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
