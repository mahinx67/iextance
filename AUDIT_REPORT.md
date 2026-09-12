# iExtance Project Audit Report

## Overall result

The project now passes TypeScript validation and the production build. The production server starts successfully with a provider-assigned `PORT`, serves the compiled SPA, exposes a health endpoint, and handles admin authentication without embedding secrets in frontend code.

## Findings and fixes

| Area | Finding | Resolution |
| --- | --- | --- |
| Production startup | The CommonJS bundle evaluated `import.meta.url` as undefined and crashed before listening. | The server now builds as ESM and starts with `node dist/server.js`. |
| Hosting compatibility | The server used a fixed port of `3000`. | It now reads `process.env.PORT` and binds to `0.0.0.0`. |
| Secrets | Telegram credentials and the admin password were hardcoded in server and client code. | Credentials now come only from environment variables. |
| Admin download | The password was placed in frontend JavaScript and a URL query string. | A server-side login endpoint now issues a short-lived signed bearer token. |
| Reverse proxies | Public links could use the wrong protocol behind Render/Koyeb proxy headers. | Express proxy trust and configurable `APP_URL` handling were added. |
| Admin archive | The source archive could include environment files. | Real environment files are excluded while `.env.example` remains available. |
| Upload errors | Missing Telegram configuration produced a generic server failure path. | The API now returns a clear `503` response and health status. |
| Input handling | File IDs and filenames were not consistently encoded or sanitized. | Telegram request parameters are encoded and uploaded filenames are reduced to their basename. |

## Verification performed

The following checks passed:

1. `npm run lint`
2. `npm run build`
3. Production server startup with `NODE_ENV=production` and a dynamic `PORT`
4. `GET /api/health`
5. SPA fallback at `/`
6. Invalid admin login returns `401`
7. Valid admin login returns a short-lived token
8. Unauthenticated source download returns `401`
9. Authenticated source download returns a valid ZIP archive
10. Viewer page route returns HTML
11. Upload without Telegram configuration returns `503` instead of crashing

## Deployment

Use `npm ci && npm run build` as the build command and `npm start` as the run command on Render or Koyeb. Set the variables described in [`DEPLOYMENT.md`](./DEPLOYMENT.md), especially `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `APP_URL`.

## References

[1]: https://render.com/docs/web-services "Render Web Services documentation"
[2]: https://www.koyeb.com/docs "Koyeb documentation"
