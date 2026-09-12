import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { ImageItem, TabType } from './types';
import { loadStoredImages, saveStoredImages, processImageFile } from './utils/imageUtils';
import { Header } from './components/Header';
import { FloatingLiquidDock } from './components/FloatingLiquidDock';
import { ImageToLinkStudio } from './components/ImageToLinkStudio';
import { GalleryView } from './components/GalleryView';
import { LightboxModal } from './components/LightboxModal';
import { QRCodeModal } from './components/QRCodeModal';
import { InfoModal } from './components/InfoModal';
import { AdminPanelModal } from './components/AdminPanelModal';

export default function App() {
  const [images, setImages] = useState<ImageItem[]>(() => {
    const list = loadStoredImages();
    return list.filter(
      (img) => img.id !== 'prism-glow' && img.id !== 'liquid-marble' && !img.name?.includes('liquid-specimen')
    );
  });
  const [activeTab, setActiveTab] = useState<TabType>('studio');
  const [activeImage, setActiveImage] = useState<ImageItem | null>(() => {
    const list = loadStoredImages().filter(
      (img) => img.id !== 'prism-glow' && img.id !== 'liquid-marble' && !img.name?.includes('liquid-specimen')
    );
    return list.length > 0 ? list[0] : null;
  });
  const [lightboxItem, setLightboxItem] = useState<ImageItem | null>(null);
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: '',
  });
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync images to local storage
  useEffect(() => {
    saveStoredImages(images);
  }, [images]);

  // Deep link listener for #img=ID
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#img=')) {
        const id = hash.replace('#img=', '');
        const found = images.find((i) => i.id === id);
        if (found) {
          setActiveImage(found);
          setActiveTab('studio');
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [images]);

  // Clipboard paste listener anywhere in the app
  const handlePasteEvent = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          try {
            const processed = await processImageFile(file);
            setImages((prev) => [processed, ...prev]);
            setActiveImage(processed);
            setActiveTab('studio');
            showToast('Image pasted and converted to link!');
          } catch (err) {
            console.error('Failed to process pasted image', err);
          }
          break;
        }
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('paste', handlePasteEvent);
    return () => window.removeEventListener('paste', handlePasteEvent);
  }, [handlePasteEvent]);

  // Manual trigger from header paste button
  const handleManualPaste = async () => {
    try {
      if (!navigator.clipboard?.read) {
        showToast('Press Cmd+V or Ctrl+V to paste directly');
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted-image-${Date.now()}.${imageType.split('/')[1]}`, {
            type: imageType,
          });
          const processed = await processImageFile(file);
          setImages((prev) => [processed, ...prev]);
          setActiveImage(processed);
          setActiveTab('studio');
          showToast('Image pasted and converted to link!');
          return;
        }
      }
      showToast('No image found on clipboard. Press Cmd+V / Ctrl+V.');
    } catch {
      showToast('Clipboard access denied. Please use Drag & Drop or Cmd+V.');
    }
  };

  const handleImageCreated = (item: ImageItem) => {
    setImages((prev) => [item, ...prev]);
    setActiveImage(item);
    showToast('Direct link generated successfully!');
  };

  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveStoredImages(updated);
      return updated;
    });
    if (activeImage?.id === id) {
      const remaining = images.filter((i) => i.id !== id);
      setActiveImage(remaining.length > 0 ? remaining[0] : null);
    }
    showToast('Item deleted successfully');
  };

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleClearAllConfirm = () => {
    setImages([]);
    setActiveImage(null);
    saveStoredImages([]);
    setConfirmClearOpen(false);
    showToast('Vault cleared');
  };

  const handleOpenQR = (url: string, title: string) => {
    setQrModal({
      isOpen: true,
      url,
      title,
    });
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden selection:bg-sky-100 selection:text-sky-900">
      {/* Liquid Organic Ambient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-slate-50/60">
        <div className="absolute -top-40 -left-20 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-sky-200/40 via-blue-100/30 to-indigo-100/20 blur-3xl animate-liquid-1" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-slate-200/50 via-teal-100/20 to-sky-100/30 blur-3xl animate-liquid-2" />
        <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-t from-indigo-100/30 via-slate-100/40 to-white/70 blur-3xl animate-liquid-1" />
      </div>

      {/* Header */}
      <Header
        onOpenInfo={() => setInfoModalOpen(true)}
        onPasteFromClipboard={handleManualPaste}
        onOpenAdminPanel={() => setAdminModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="w-full">
        {activeTab === 'studio' ? (
          <ImageToLinkStudio
            onImageCreated={handleImageCreated}
            activeImage={activeImage}
            onOpenLightbox={(img) => setLightboxItem(img)}
            onOpenQR={handleOpenQR}
            onDeleteActiveImage={handleDeleteImage}
          />
        ) : (
          <GalleryView
            images={images}
            onSelectImage={(img) => {
              setActiveImage(img);
              setActiveTab('studio');
            }}
            onDeleteImage={handleDeleteImage}
            onClearAll={() => setConfirmClearOpen(true)}
            onOpenLightbox={(img) => setLightboxItem(img)}
            onOpenQR={handleOpenQR}
            onGoToStudio={() => setActiveTab('studio')}
          />
        )}
      </main>

      {/* Floating Liquid Glass Menu Bar (4-5 cm above screen bottom with exactly 2 options) */}
      <FloatingLiquidDock
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        galleryCount={images.length}
      />

      {/* Modals */}
      <LightboxModal
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onOpenQR={handleOpenQR}
      />

      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, url: '', title: '' })}
        url={qrModal.url}
        imageTitle={qrModal.title}
      />

      <InfoModal
        isOpen={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />

      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      {/* Clear All In-App Confirmation Modal */}
      {confirmClearOpen && (
        <div
          id="clear-all-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md"
          onClick={() => setConfirmClearOpen(false)}
        >
          <div
            id="clear-all-modal-card"
            className="relative w-full max-w-sm liquid-card rounded-3xl p-6 shadow-2xl border border-white text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-3 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold not-italic text-slate-900">
              Clear All Stored Links?
            </h3>
            <p className="text-xs font-bold italic text-slate-500 mt-1.5 leading-relaxed">
              This will permanently remove all created links and image history saved on this browser.
            </p>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                id="cancel-clear-btn"
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold not-italic transition-all"
              >
                Cancel
              </button>
              <button
                id="confirm-clear-btn"
                type="button"
                onClick={handleClearAllConfirm}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold not-italic transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full liquid-glass shadow-lg border border-white text-xs font-bold italic text-slate-800 tracking-tight animate-in fade-in slide-in-from-top-3 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
