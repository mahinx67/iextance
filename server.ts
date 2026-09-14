import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { ZipArchive } from 'archiver';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID?.trim() || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || '';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET?.trim() || ADMIN_PASSWORD;
const API_KEY_SECRET = process.env.API_KEY_SECRET?.trim() || ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const MAX_API_FILE_BYTES = Math.min(Number(process.env.MAX_API_FILE_BYTES) || 10 * 1024 * 1024, 20 * 1024 * 1024);

app.set('trust proxy', 1);
app.disable('x-powered-by');
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
);
function getAppUrl(req: express.Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && (allowedOrigins.has(origin) || origin === getAppUrl(req))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_API_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});
const keyIssueBuckets = new Map<string, { count: number; resetAt: number }>();
const uploadBuckets = new Map<string, { count: number; resetAt: number }>();
function allowRate(map: Map<string, { count: number; resetAt: number }>, id: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = map.get(id);
  if (!current || current.resetAt <= now) {
    map.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
function createApiKey(label = 'developer'): string {
  const id = crypto.randomBytes(12).toString('hex');
  const issuedAt = Date.now().toString(36);
  const payload = Buffer.from(`${id}.${issuedAt}.${label.slice(0, 40)}`).toString('base64url');
  const signature = crypto.createHmac('sha256', API_KEY_SECRET).update(payload).digest('base64url');
  return `iext_live_${payload}.${signature}`;
}
function isValidApiKey(value: unknown): boolean {
  if (typeof value !== 'string' || !value.startsWith('iext_live_')) return false;
  const raw = value.slice('iext_live_'.length);
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', API_KEY_SECRET).update(payload).digest('base64url');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function getApiKey(req: express.Request): string | undefined {
  const header = req.get('x-api-key') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const query = typeof req.query.key === 'string' ? req.query.key : undefined;
  return header || query;
}
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = getApiKey(req);
  if (!isValidApiKey(key)) return res.status(401).json({ success: false, error: { message: 'A valid API key is required', code: 'INVALID_API_KEY' } });
  if (!allowRate(uploadBuckets, key!, 60, 60 * 60 * 1000)) return res.status(429).json({ success: false, error: { message: 'Upload rate limit exceeded. Try again later.', code: 'RATE_LIMITED' } });
  res.locals.apiKey = key;
  next();
}
function apiError(res: express.Response, status: number, message: string, code: string) {
  return res.status(status).json({ success: false, error: { message, code } });
}

function createAdminToken(): string {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = String(expiresAt);
  const signature = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${signature}`;
}
function isValidAdminToken(token: string | undefined): boolean {
  if (!token || !ADMIN_SESSION_SECRET) return false;
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  const expected = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(expiresAt).digest('hex');
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID), adminConfigured: Boolean(ADMIN_PASSWORD && ADMIN_SESSION_SECRET), developerApi: true, environment: process.env.NODE_ENV || 'development' });
});
app.get('/api/v1', (_req, res) => res.json({ name: 'iExtance Developer API', version: '1.0', endpoints: ['/api/v1/keys', '/api/v1/upload', '/1/upload'], docs: '/developers' }));

app.post('/api/v1/keys', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (!allowRate(keyIssueBuckets, ip, 5, 60 * 60 * 1000)) return apiError(res, 429, 'Too many API keys requested from this address', 'RATE_LIMITED');
  const label = typeof req.body?.label === 'string' ? req.body.label : 'developer';
  const key = createApiKey(label);
  res.status(201).json({ success: true, data: { key, label: label.slice(0, 40), warning: 'Copy this key now. It is not stored or recoverable after creation.' } });
});

async function uploadBufferToTelegram(buffer: Buffer, filename: string, mimeType: string, req: express.Request) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error('Telegram storage is not configured on this server');
  const safeMimeType = mimeType.startsWith('image/') ? mimeType : 'image/png';
  const finalFilename = path.basename(filename) || `image_${Date.now()}.${safeMimeType.split('/')[1] || 'png'}`;
  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('document', new Blob([buffer], { type: safeMimeType }), finalFilename);
  formData.append('caption', `Uploaded via iExtance: ${finalFilename}`);
  const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData });
  const telegramData = await telegramRes.json() as any;
  if (!telegramRes.ok || !telegramData.ok) throw new Error(telegramData.description || 'Failed to upload image to Telegram');
  const document = telegramData.result.document;
  const fileId = document?.file_id;
  const messageId = telegramData.result.message_id;
  if (!fileId) throw new Error('Telegram did not return a valid file_id');
  const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const getFileData = await getFileRes.json() as any;
  if (!getFileRes.ok || !getFileData.ok) throw new Error(getFileData.description || 'Failed to retrieve file path from Telegram');
  const filePath = getFileData.result.file_path;
  const appUrl = getAppUrl(req);
  const ext = path.extname(filePath) || `.${safeMimeType.split('/')[1] || 'png'}`;
  return { fileId, filePath, messageId, directUrl: `${appUrl}/i/${encodeURIComponent(fileId)}${ext}`, pageUrl: `${appUrl}/v/${encodeURIComponent(fileId)}`, telegramDirectUrl: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`, size: document.file_size, fileName: document.file_name || finalFilename, uploadedAt: Date.now() };
}
function imgbbResponse(result: any) {
  return { success: true, data: { id: result.fileId, title: result.fileName, url: result.directUrl, display_url: result.pageUrl, size: result.size, time: Math.floor(result.uploadedAt / 1000), expiration: 0, image: { filename: result.fileName, name: result.fileName, mime: 'image/*', extension: path.extname(result.fileName).replace('.', ''), url: result.directUrl }, thumb: { url: result.directUrl }, delete_url: null }, raw: result };
}

app.post('/api/upload', async (req, res) => {
  try {
    const { imageBase64, filename, mimeType } = req.body as { imageBase64?: unknown; filename?: unknown; mimeType?: unknown };
    if (typeof imageBase64 !== 'string' || !imageBase64) return res.status(400).json({ error: 'Missing imageBase64 payload' });
    if (imageBase64.length > 50 * 1024 * 1024 * 1.4) return res.status(413).json({ error: 'Image payload is too large' });
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Invalid image payload' });
    const result = await uploadBufferToTelegram(buffer, typeof filename === 'string' ? filename : '', typeof mimeType === 'string' ? mimeType : 'image/png', req);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return res.status(error.message?.includes('not configured') ? 503 : 502).json({ error: error.message || 'Upload failed' });
  }
});

async function handleDeveloperUpload(req: express.Request, res: express.Response) {
  try {
    let buffer: Buffer | undefined;
    let filename = 'image.png';
    let mimeType = 'image/png';
    if (req.file) { buffer = req.file.buffer; filename = req.file.originalname; mimeType = req.file.mimetype; }
    else if (typeof req.body?.image === 'string' || typeof req.body?.imageBase64 === 'string') {
      const input = req.body.image || req.body.imageBase64;
      buffer = Buffer.from(input.replace(/^data:[^;]+;base64,/, ''), 'base64');
      filename = typeof req.body.filename === 'string' ? req.body.filename : filename;
      mimeType = typeof req.body.type === 'string' ? req.body.type : mimeType;
    }
    if (!buffer?.length) return apiError(res, 400, 'Send an image file in the image field or a base64 image value', 'MISSING_IMAGE');
    if (buffer.length > MAX_API_FILE_BYTES) return apiError(res, 413, `Image must be smaller than ${Math.floor(MAX_API_FILE_BYTES / 1024 / 1024)} MB`, 'FILE_TOO_LARGE');
    if (!mimeType.startsWith('image/')) return apiError(res, 415, 'Only image files are supported', 'UNSUPPORTED_MEDIA_TYPE');
    const result = await uploadBufferToTelegram(buffer, filename, mimeType, req);
    return res.status(200).json(imgbbResponse(result));
  } catch (error: any) {
    console.error('Developer API upload error:', error);
    return apiError(res, 502, error.message || 'Upload failed', 'STORAGE_ERROR');
  }
}
app.post(['/api/v1/upload', '/1/upload'], requireApiKey, upload.single('image'), handleDeveloperUpload);

app.use((error: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!error) return next();
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return apiError(res, status, error.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the maximum file size' : error.message, error.code);
  }
  if (error.message === 'Unexpected field' || error.message?.includes('image files')) return apiError(res, 415, 'Only image files are supported', 'UNSUPPORTED_MEDIA_TYPE');
  console.error('Unhandled API error:', error);
  return apiError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
});

async function streamTelegramImage(fileId: string, res: express.Response) {
  if (!TELEGRAM_BOT_TOKEN) return res.status(503).send('Image storage is not configured');
  const cleanFileId = fileId.replace(/\.[^/.]+$/, '');
  const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(cleanFileId)}`);
  const getFileData = await getFileRes.json() as any;
  if (!getFileRes.ok || !getFileData.ok || !getFileData.result?.file_path) return res.status(404).send('Image not found or expired');
  const filePath = getFileData.result.file_path;
  const imageRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!imageRes.ok) return res.status(imageRes.status).send('Could not fetch file from storage');
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.gif' ? 'image/gif' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
  res.setHeader('Content-Type', mimeType); res.setHeader('Content-Disposition', 'inline'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(Buffer.from(await imageRes.arrayBuffer()));
}
app.get(['/i/:fileId', '/api/image/:fileId'], async (req, res) => { try { if (!req.params.fileId) return res.status(400).send('File ID required'); await streamTelegramImage(req.params.fileId, res); } catch (err) { console.error('Direct image stream error:', err); return res.status(500).send('Error rendering image'); } });
app.get('/v/:fileId', (req, res) => {
  try {
    const cleanFileId = req.params.fileId.replace(/\.[^/.]+$/, ''); const appUrl = getAppUrl(req); const directImageUrl = `${appUrl}/i/${encodeURIComponent(cleanFileId)}.png`; const safeUrl = directImageUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    res.type('html').send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>iExtance - Image Viewer</title><meta property="og:title" content="Hosted on iExtance"><meta property="og:image" content="${safeUrl}"><meta name="twitter:card" content="summary_large_image"><style>body{margin:0;background:#0b0f19;color:#f8fafc;font-family:system-ui;min-height:100vh;display:flex;flex-direction:column}header,footer{padding:16px 24px;border-color:#1e293b;border-style:solid}header{border-width:0 0 1px;display:flex;justify-content:space-between}footer{border-width:1px 0 0;text-align:center;color:#64748b;font-size:12px}main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}img{max-width:100%;max-height:75vh;border-radius:12px}a,button{color:#fff;background:#1e293b;border:0;border-radius:10px;padding:10px 14px;text-decoration:none;font-weight:700;font-size:12px}nav{display:flex;gap:8px}</style></head><body><header><strong>iExtance <small>Viewer</small></strong><nav><a href="${safeUrl}">Direct Image Link</a><a href="/">Upload New</a></nav></header><main><img src="${safeUrl}" alt="iExtance Image"><div style="margin-top:24px"><a href="${safeUrl}" download>Download Image</a></div></main><footer>Hosted with iExtance</footer></body></html>`);
  } catch { return res.status(500).send('Error loading image view'); }
});

app.post('/api/admin/login', (req, res) => { if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin access is not configured on this server' }); if (typeof req.body?.password !== 'string' || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' }); return res.json({ token: createAdminToken() }); });
app.get('/api/admin/download-source', (req, res) => {
  const authorization = req.get('authorization'); const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!isValidAdminToken(token)) return res.status(401).json({ error: 'Unauthorized or expired admin session' });
  const archive = new ZipArchive({ zlib: { level: 9 } }); const zipFilename = `iextance-project-${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader('Content-Type', 'application/zip'); res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`); archive.on('error', (err) => { console.error('Archiver error:', err); if (!res.headersSent) res.status(500).send('Failed to package source code'); }); archive.pipe(res); archive.glob('**/*', { cwd: process.cwd(), ignore: ['**/node_modules/**', 'node_modules/**', 'dist/**', '.git/**', '.next/**', '**/.DS_Store', '*.zip', '**/.env', '**/.env.local', '**/.env.production', '**/.env.development'], dot: true }); archive.finalize();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') { const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' }); app.use(vite.middlewares); }
  else { const distPath = path.resolve(process.cwd(), 'dist'); app.use(express.static(distPath)); app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html'))); }
  app.listen(PORT, '0.0.0.0', () => console.log(`iExtance server running on http://0.0.0.0:${PORT}`));
}
startServer().catch((error) => { console.error('Failed to start server:', error); process.exit(1); });
