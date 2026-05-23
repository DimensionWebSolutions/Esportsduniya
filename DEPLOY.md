# Deployment Guide — Cloudflare Pages + Railway

## Overview

| Layer     | Service           | URL pattern                          |
|-----------|-------------------|--------------------------------------|
| Frontend  | Cloudflare Pages  | `https://your-app.pages.dev`         |
| Backend   | Railway           | `https://your-app.up.railway.app`    |
| WebSocket | Railway (same)    | `wss://your-app.up.railway.app`      |

---

## 1. Deploy Backend to Railway

### First time setup
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select this repository
4. Railway auto-detects Node.js and uses `railway.toml` for config

### Set environment variables
In Railway dashboard → your service → **Variables**, add:

```
GEMINI_API_KEY=your_gemini_key
RAPIDAPI_KEY=your_rapidapi_key
OPENAI_API_KEY=your_openai_key   # optional
PORT=3001                         # Railway overrides this automatically
```

### Verify
Once deployed, visit:
```
https://your-app.up.railway.app/api/health
```
Should return `{"status":"ok",...}`

---

## 2. Deploy Frontend to Cloudflare Pages

### Connect repo
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click **Create a project → Connect to Git**
3. Select this repository

### Build settings
| Setting           | Value         |
|-------------------|---------------|
| Framework preset  | Vite          |
| Build command     | `npm run build` |
| Build output dir  | `dist`        |

### Environment variables
In Cloudflare Pages → your project → **Settings → Environment variables**, add for **Production**:

```
VITE_API_URL=https://your-app.up.railway.app
VITE_WS_URL=wss://your-app.up.railway.app
```

> Replace `your-app` with your actual Railway service subdomain.

### Deploy
Push to `main` — Cloudflare Pages builds and deploys automatically.

---

## 3. Custom Domain (optional)

- **Cloudflare Pages**: Settings → Custom domains → add your domain
- **Railway**: Settings → Networking → Custom domain (add `api.yourdomain.com`)
  - Then update `VITE_API_URL` and `VITE_WS_URL` to use your custom API domain

---

## Local Development

Nothing changes — `npm run dev:full` still works exactly as before.
- Frontend: http://localhost:5173
- Backend + WebSocket: http://localhost:3001 / ws://localhost:3001

---

## Notes

- **Users are stored in-memory** — they reset on every Railway redeploy.
  To persist users, add MongoDB Atlas (free) or Supabase and update the user store in `server.js`.
- Railway free tier has 500 hours/month. Upgrade to Hobby ($5/mo) for always-on.
- The `public/_redirects` file ensures React Router works on Cloudflare Pages (all routes → index.html).
