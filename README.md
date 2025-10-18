# Beechwood Films

This project now ships with a lightweight React front end (Vite) and a minimal Express API. Users can register or browse as guests, opt into release notifications, and admins unlock uploads automatically when they sign in.

## Requirements

- Node 18+
- npm 10+

## Install

```bash
npm install
```

## Environment

Copy `.env.example` to `.env` and tweak values as needed:

- `PORT` (default `4000`)
- `CLIENT_ORIGIN` (front end dev server is `http://localhost:5173`)
- `VITE_API_URL` (URL the React app will call – usually `http://localhost:4000` in dev)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (seed credentials for your admin account)
- `ADMIN_SESSION_TTL_MS` (session lifetime in ms, default 6 hours)
- `RESEND_API_KEY` (optional – send real notification emails when new videos launch)
- `NOTIFY_FROM_EMAIL` (the verified sender address used with Resend)
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `AWS_S3_BUCKET` (optional – enable direct media uploads to S3 or compatible storage)
- `AWS_S3_ENDPOINT` (optional – use when targeting an S3-compatible provider such as Cloudflare R2)

## Run locally

Start the front end:

```bash
npm run dev
```

Start the API (in another terminal):

```bash
npm run server
```

## API Overview

- `GET /health` – simple liveness check.
- `POST /api/auth/register` – body `{ "email", "password", "name?", "subscribe?" }`, returns bearer token + user.
- `POST /api/auth/login` – body `{ "email", "password" }`, returns bearer token + user.
- `POST /api/auth/guest` – start a guest session without credentials.
- `POST /api/auth/logout` – send current token via `Authorization` header.
- `GET /api/auth/session` – validate current token.
- `GET /api/auth/me` – read the current user profile.
- `PATCH /api/auth/me/preferences` – body `{ "notifyOnNewVideo": true|false }`, updates notification opt in/out.
- `GET /api/favorites` – return an authenticated user’s favorite video IDs.
- `POST /api/favorites/:videoId` – mark a video as favorite (authenticated, non-guest).
- `DELETE /api/favorites/:videoId` – remove a favorite (authenticated, non-guest).
- `GET /api/videos` – read-only list of videos.
- `POST /api/videos` – create a video (admin token required).
- `PUT /api/videos/:id` – update a video (admin token required).
- `DELETE /api/videos/:id` – remove a video (admin token required).

Persistent data lives in the SQLite database at `server/data/app.db` (created automatically and ignored by git). If `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` are set, subscribers receive email alerts via Resend whenever a new video is published; otherwise the app logs the intended notifications to the console.

### Notification testing

- Configure `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` with a verified sender.
- Register or update a user so `notifyOnNewVideo` is enabled (true by default).
- Publish a new video while signed in as admin. With credentials set, Resend should deliver the email; if not configured, watch the server logs for the “Would notify …” message.

### Analytics & SEO

- Update `index.html` meta tags as needed (Open Graph/Twitter tags point to `/og-cover.svg` which you can swap with your own artwork).
- Drop in your analytics snippet (e.g. Plausible, PostHog) in `index.html` if you want traffic insights—keep it behind consent if you’re subject to privacy regulations.

## Deployment

### Frontend (Vercel)

1. Push your latest changes to GitHub.
2. In Vercel, create a project from this repo.
3. Under **Settings → Environment Variables**, add `VITE_API_URL` pointing to the backend URL (e.g. `https://api.beechwoodfilms.com`).
4. Deploy; Vercel uses `npm install && npm run build`.

### Backend (Railway example)

1. Create a new Railway project and deploy this repo or use the CLI.
2. Configure env vars:
   - `PORT` (Railway injects one; keep default or override to 4000).
   - `CLIENT_ORIGIN` (your Vercel domain).
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_TTL_MS`.
   - `RESEND_API_KEY`, `NOTIFY_FROM_EMAIL` (optional).
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT` when storage is ready.
3. Attach persistent storage (Railway Volume) for `server/data/app.db` or migrate to a managed database.
4. Set the start command to `node server/index.js` and deploy.

### Post-deploy checklist

- `curl https://api.yourdomain.com/health` to confirm liveness.
- Sign in as admin on the Vercel site; ensure videos load, favorites sync, and uploads/notifications behave.
- ⚠️ Before using file uploads, circle back to configure Cloudflare R2 (or S3) and update the AWS env vars in both environments; then test an upload end-to-end.
