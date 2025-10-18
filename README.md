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
- `GET /api/videos` – read-only list of videos.
- `POST /api/videos` – create a video (admin token required).
- `PUT /api/videos/:id` – update a video (admin token required).
- `DELETE /api/videos/:id` – remove a video (admin token required).

Video data is stored in `server/data/db.json` (created at runtime and ignored by git). Basic “new video” notifications are logged to the server console for subscribers – wire that into your email/SMS provider when you’re ready.
