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
