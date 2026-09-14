import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
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

// Render, Koyeb, and other reverse proxies provide the original protocol via X-Forwarded-*.
app.set('trust proxy', 1);
app.disable('x-powered-by');
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
);
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && (allowedOrigins.has(origin) || origin === getAppUrl(req))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function getAppUrl(req: express.Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
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
  res.json({
    status: 'ok',
    telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID),
    adminConfigured: Boolean(ADMIN_PASSWORD && ADMIN_SESSION_SECRET),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.post('/api/upload', async (req, res) => {
  try {
    const { imageBase64, filename, mimeType } = req.body as {
      imageBase64?: unknown;
      filename?: unknown;
      mimeType?: unknown;
    };

    if (typeof imageBase64 !== 'string' || !imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }
    if (imageBase64.length > 50 * 1024 * 1024 * 1.4) {
      return res.status(413).json({ error: 'Image payload is too large' });
    }
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      return res.status(503).json({ error: 'Telegram storage is not configured on this server' });
    }

    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Invalid image payload' });

    const safeMimeType = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/png';
    const requestedName = typeof filename === 'string' ? filename : '';
    const finalFilename = path.basename(requestedName) || `image_${Date.now()}.${safeMimeType.split('/')[1] || 'png'}`;
    const blob = new Blob([buffer], { type: safeMimeType });
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('document', blob, finalFilename);
    formData.append('caption', `Uploaded via iExtance: ${finalFilename}`);

    const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    const telegramData = await telegramRes.json() as any;
    if (!telegramRes.ok || !telegramData.ok) {
      console.error('Telegram sendDocument failed:', telegramData);
      return res.status(502).json({ error: telegramData.description || 'Failed to upload image to Telegram' });
    }

    const document = telegramData.result.document;
    const fileId = document?.file_id;
    const messageId = telegramData.result.message_id;
    if (!fileId) return res.status(502).json({ error: 'Telegram did not return a valid file_id' });

    const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const getFileData = await getFileRes.json() as any;
    if (!getFileRes.ok || !getFileData.ok) {
      console.error('Telegram getFile failed:', getFileData);
      return res.status(502).json({ error: getFileData.description || 'Failed to retrieve file path from Telegram' });
    }

    const filePath = getFileData.result.file_path;
    const telegramDirectUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const appUrl = getAppUrl(req);
    const ext = path.extname(filePath) || `.${safeMimeType.split('/')[1] || 'png'}`;

    return res.json({
      success: true,
      fileId,
      filePath,
      messageId,
      directUrl: `${appUrl}/i/${encodeURIComponent(fileId)}${ext}`,
      pageUrl: `${appUrl}/v/${encodeURIComponent(fileId)}`,
      telegramDirectUrl,
      size: document.file_size,
      fileName: document.file_name || finalFilename,
      uploadedAt: Date.now(),
    });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error while processing image' });
  }
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
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(Buffer.from(await imageRes.arrayBuffer()));
}

app.get(['/i/:fileId', '/api/image/:fileId'], async (req, res) => {
  try {
    if (!req.params.fileId) return res.status(400).send('File ID required');
    await streamTelegramImage(req.params.fileId, res);
  } catch (err) {
    console.error('Direct image stream error:', err);
    return res.status(500).send('Error rendering image');
  }
});

app.get('/v/:fileId', (req, res) => {
  try {
    const cleanFileId = req.params.fileId.replace(/\.[^/.]+$/, '');
    const appUrl = getAppUrl(req);
    const directImageUrl = `${appUrl}/i/${encodeURIComponent(cleanFileId)}.png`;
    const safeUrl = directImageUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>iExtance - Image Viewer</title><meta property="og:title" content="Hosted on iExtance"><meta property="og:image" content="${safeUrl}"><meta name="twitter:card" content="summary_large_image"><style>body{margin:0;background:#0b0f19;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;flex-direction:column}header,footer{padding:16px 24px;border-color:#1e293b;border-style:solid}header{border-width:0 0 1px;display:flex;justify-content:space-between;align-items:center}footer{border-width:1px 0 0;text-align:center;color:#64748b;font-size:12px}main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}img{max-width:100%;max-height:75vh;border-radius:12px}a,button{color:#fff;background:#1e293b;border:0;border-radius:10px;padding:10px 14px;text-decoration:none;font-weight:700;font-size:12px}nav{display:flex;gap:8px}button{cursor:pointer}</style></head><body><header><strong>iExtance <small>Viewer</small></strong><nav><a href="${safeUrl}" target="_blank">Direct Image Link</a><a href="/" style="background:#0ea5e9">Upload New</a></nav></header><main><img src="${safeUrl}" alt="iExtance Image" loading="eager"><div style="margin-top:24px;display:flex;gap:12px"><button onclick="navigator.clipboard.writeText('${safeUrl}').then(()=>{this.textContent='Copied!'})">Copy Direct Link</button><a href="${safeUrl}" download>Download Image</a></div></main><footer>Hosted with <a href="/" style="background:none;color:#38bdf8;padding:0">iExtance</a> · Zero registration free image hosting</footer></body></html>`;
    res.type('html').send(html);
  } catch (err) {
    console.error('Viewing page error:', err);
    return res.status(500).send('Error loading image view');
  }
});

app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin access is not configured on this server' });
  if (typeof req.body?.password !== 'string' || req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });
  return res.json({ token: createAdminToken() });
});

app.get('/api/admin/download-source', (req, res) => {
  const authorization = req.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!isValidAdminToken(token)) return res.status(401).json({ error: 'Unauthorized or expired admin session' });

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const zipFilename = `iextance-project-${new Date().toISOString().slice(0, 10)}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    if (!res.headersSent) res.status(500).send('Failed to package source code');
  });
  archive.pipe(res);
  archive.glob('**/*', {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', 'node_modules/**', 'dist/**', '.git/**', '.next/**', '**/.DS_Store', '*.zip', '**/.env', '**/.env.local', '**/.env.production', '**/.env.development'],
    dot: true,
  });
  archive.finalize();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`iExtance server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
