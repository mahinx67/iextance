import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { copyToClipboard } from '../utils/imageUtils';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  imageTitle: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  imageTitle
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        width: 380,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((data) => setQrSrc(data))
        .catch((err) => console.error('Failed to generate QR', err));
    }
  }, [isOpen, url]);

  const handleCopyLink = async () => {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrSrc) return;
    const a = document.createElement('a');
    a.href = qrSrc;
    a.download = `iextance-qr-${imageTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="qr-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="qr-modal-card"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-sm liquid-card rounded-3xl p-6 shadow-2xl border border-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            id="qr-close-btn"
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-center pt-1 pb-4">
            <h3 className="text-base font-bold not-italic text-slate-900">Scan Instant Link</h3>
            <p className="text-xs font-bold italic text-slate-500 mt-0.5 line-clamp-1">
              {imageTitle}
            </p>
          </div>

          {/* QR Code Container */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-inner flex flex-col items-center justify-center">
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="iExtance QR Code"
                className="w-52 h-52 object-contain rounded-lg"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-sm font-bold italic">
                Generating Code...
              </div>
            )}
          </div>

          <p className="text-center text-[11px] font-bold italic text-slate-400 mt-3 break-all px-2 font-mono">
            {url}
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-5">
            <button
              id="qr-copy-btn"
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold not-italic text-slate-700 shadow-sm transition-all active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            <button
              id="qr-download-btn"
              type="button"
              onClick={handleDownloadQR}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold not-italic text-white shadow-sm transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save QR</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
