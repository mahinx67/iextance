export interface ImageItem {
  id: string;
  name: string;
  dataUrl: string;
  shareUrl: string;
  sizeFormatted: string;
  sizeBytes: number;
  width: number;
  height: number;
  format: string;
  createdAt: number;
  color: string;
  aspectRatio: string;
  telegramFileId?: string;
  isTelegramCloud?: boolean;
  telegramDirectUrl?: string;
  appShareUrl?: string;
  pageUrl?: string;
  directUrl?: string;
}

export type TabType = 'studio' | 'gallery';

export type LinkFormat = 'page' | 'direct' | 'markdown' | 'html' | 'bbcode';
