import { ImageItem } from '../types';

const STORAGE_KEY = 'iextance_images_v1';

function getApiUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (env?.VITE_API_URL || '').trim().replace(/\/$/, '');
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const rWidth = width / divisor;
  const rHeight = height / divisor;
  
  if (rWidth === rHeight) return '1:1';
  if (rWidth === 16 && rHeight === 9) return '16:9';
  if (rWidth === 4 && rHeight === 3) return '4:3';
  if (rWidth === 3 && rHeight === 2) return '3:2';
  if (rWidth === 9 && rHeight === 16) return '9:16';
  
  // Floating approximation
  const ratio = width / height;
  return `${ratio.toFixed(2)}:1`;
}

export function extractDominantColor(img: HTMLImageElement): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#3b82f6';
    canvas.width = 10;
    canvas.height = 10;
    ctx.drawImage(img, 0, 0, 10, 10);
    const data = ctx.getImageData(0, 0, 10, 10).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      // skip completely transparent or very bright/dark
      if (data[i + 3] > 128) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    if (count === 0) return '#0284c7';
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return '#0284c7';
  }
}

export async function processImageFile(file: File): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
        const format = file.type.split('/')[1]?.toUpperCase() || 'PNG';
        const color = extractDominantColor(img);
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
        const appViewerUrl = `${currentOrigin}/#img=${id}`;
        let directShareUrl = appViewerUrl;
        let directUrl: string | undefined = undefined;
        let pageUrl: string | undefined = undefined;
        let telegramDirectUrl: string | undefined = undefined;
        let telegramFileId: string | undefined = undefined;
        let isTelegramCloud = false;

        // Try uploading to Telegram bot backend
        try {
          const res = await fetch(`${getApiUrl()}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: dataUrl,
              filename: file.name,
              mimeType: file.type,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            telegramFileId = data.fileId;
            telegramDirectUrl = data.telegramDirectUrl;
            // Primary share URL is now the direct custom domain image URL (e.g. /i/:fileId.png)
            if (data.directUrl) {
              directUrl = data.directUrl;
              directShareUrl = data.directUrl;
              pageUrl = data.pageUrl || `${currentOrigin}/v/${data.fileId}`;
              isTelegramCloud = true;
            } else if (data.telegramDirectUrl) {
              directShareUrl = data.telegramDirectUrl;
              isTelegramCloud = true;
            }
          }
        } catch (apiErr) {
          console.warn('Telegram cloud upload failed, using local vault direct link', apiErr);
        }

        const item: ImageItem = {
          id,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          shareUrl: directShareUrl,
          directUrl: directUrl || directShareUrl,
          pageUrl: pageUrl || directShareUrl,
          telegramDirectUrl,
          appShareUrl: appViewerUrl,
          sizeFormatted: formatBytes(file.size),
          sizeBytes: file.size,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          format,
          createdAt: Date.now(),
          color,
          aspectRatio: getAspectRatio(img.naturalWidth || img.width, img.naturalHeight || img.height),
          telegramFileId,
          isTelegramCloud,
        };
        resolve(item);
      };
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function loadStoredImages(): ImageItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any previous demo items
      return parsed.filter(
        (item: ImageItem) =>
          item.id !== 'prism-glow' &&
          item.id !== 'liquid-marble' &&
          !item.name?.includes('liquid-specimen')
      );
    }
    return [];
  } catch (err) {
    console.error('Failed to load images from storage', err);
    return [];
  }
}

export function saveStoredImages(images: ImageItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
  } catch (err) {
    console.error('Failed to save to storage (quota might be exceeded)', err);
  }
}

/**
 * Robust copy helper that handles iFrames, unfocused documents, and browser permissions
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern navigator.clipboard API
  if (navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Document may not be focused or permission denied inside iframe - continue to fallback
    }
  }

  // Method 2: Fallback using temporary textarea with focus & execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('Fallback copy command failed', err);
    return false;
  }
}
