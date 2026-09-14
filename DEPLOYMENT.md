# iExtance Deployment Guide

The application is a Vite React frontend served by an Express server. The production build creates `dist/index.html`, frontend assets, and `dist/server.js`. The server listens on the hosting provider's `PORT` environment variable and binds to `0.0.0.0`, which is compatible with Render and Koyeb.

## Required environment variables

Set these variables in the hosting provider's secret/environment settings. Do not commit a real `.env` file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes for uploads | Telegram bot token used as image storage. |
| `TELEGRAM_CHAT_ID` | Yes for uploads | Telegram chat/channel ID that receives uploaded documents. |
| `APP_URL` | Recommended | Public service URL, without a trailing slash. Example: `https://your-app.onrender.com`. |
| `ADMIN_PASSWORD` | Optional | Password for downloading the project source archive. |
| `ADMIN_SESSION_SECRET` | Optional | Long random value used to sign short-lived admin sessions. |

If Telegram variables are missing, the app still starts and `/api/health` reports `telegramConfigured: false`, but cloud upload requests return a clear `503` response instead of crashing.

## Render

Use the included `render.yaml` blueprint or create a web service manually with the following settings:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Render automatically provides `PORT`. Set the environment variables above in the service dashboard. Mark secret values as secret where the dashboard supports it.

## Koyeb

Create a Web Service from the repository and use:

- Build command: `npm ci && npm run build`
- Run command: `npm start`
- Exposed HTTP port: the platform-provided port, commonly `8000` or `8080`
- Health check path: `/api/health`

Koyeb also provides `PORT` at runtime. The application uses that value automatically, so no source change is required when the assigned port differs between environments.

## Local verification

```bash
cp .env.example .env
# Edit .env and provide real values when cloud uploads are needed.
npm install
npm run lint
npm run build
npm start
```

Open `http://localhost:3000` and check `http://localhost:3000/api/health`. The browser stores the local gallery in `localStorage`; Telegram-backed direct links remain available after the browser storage is cleared as long as the Telegram file is still available.

## Security notes

The Telegram token and admin password are read only from server-side environment variables. The source-download admin flow now uses a short-lived signed bearer token instead of putting a password in frontend JavaScript or a URL query string. The source archive excludes `.env` files, dependencies, build output, and Git metadata.

## Developer API

The backend exposes two authenticated upload routes:

```text
POST /1/upload?key=YOUR_API_KEY
POST /api/v1/upload
```

Use `multipart/form-data` with a file field named `image`. The key may be supplied as the `key` query parameter or the `X-API-Key` header. Successful responses use an ImgBB-style JSON shape with `data.url` for the direct image URL and `data.display_url` for the viewer page.

Create a key with:

```bash
curl -X POST https://your-api-host.example/api/v1/keys \
  -H 'Content-Type: application/json' \
  -d '{"label":"my-app"}'
```

For stable keys across restarts, set `API_KEY_SECRET` to a long random secret. Set `FRONTEND_URL` to a comma-separated list containing the main frontend and the developer portal domains. The API defaults to a 10 MB image limit and 60 uploads per key per hour. Key issuance is limited to five keys per IP per hour.

## Developer portal

The separate `iextance-developer-portal/` directory is a no-build static site. Upload its four files (`index.html`, `styles.css`, `config.js`, and `app.js`) to Netlify, Cloudflare Pages, GitHub Pages, or any static host. Set `API_BASE_URL` in `config.js` to the public backend URL. The portal includes API documentation, copyable examples, a live API-key generator, limits, and response examples. See its README for the complete hosting checklist.

The current architecture is intentionally database-free and uses signed API keys. Before opening the service to high-volume public traffic, add database-backed developer accounts, persistent quotas, billing, abuse monitoring, and object storage such as Cloudflare R2 or S3.
