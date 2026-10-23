# Deployment Guide — Vercel + Render

## Overview

| Layer     | Service              | URL pattern                              |
|-----------|----------------------|------------------------------------------|
| Frontend  | Vercel                | `https://esportsduniya.in`               |
| Backend   | Render               | `https://esportsduniya.onrender.com`     |
| WebSocket | Render (same service)| `wss://esportsduniya.onrender.com`       |

> **Note:** this project previously targeted Cloudflare Pages and used `public/_redirects` for proxying. That file is Cloudflare-only syntax and **Vercel ignores it entirely**. The frontend is now deployed on Vercel, so `vercel.json` at the repo root is the file that actually does the proxying/rewrites described below — keep both files in sync if you add a new SSR route, or drop `_redirects` if you're sure Cloudflare is no longer in the picture.

---

## 1. Deploy Backend to Render

### First time setup

1. Go to [render.com](https://render.com) and sign in with GitHub
2. **New → Web Service** → connect this repository
3. Build command: `npm install`
4. Start command: `node server.js`
5. Instance type: Free or Starter (free tier sleeps after inactivity)

### Required environment variables

In Render → your service → **Environment**:

```
# Live scores
FOOTBALL_DATA_KEY=your_key_from_football-data.org
CRICAPI_KEY=your_cricapi_key
THESPORTSDB_API_KEY=123

# Persistence (strongly recommended — without this, news/users reset on restart)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/esportsduniya?retryWrites=true&w=majority

# Sports news (RSS — no key required; optional boost)
NEWSAPI_KEY=your_newsapi_key

# AI features (optional)
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
ENABLE_AI_BLOG=false

# Auth & ops
JWT_SECRET=long_random_secret
PORT=3001
```

### Verify after deploy

```bash
curl https://esportsduniya.onrender.com/api/health
curl https://esportsduniya.onrender.com/api/validate
curl "https://esportsduniya.onrender.com/api/blog?limit=5"
curl https://esportsduniya.onrender.com/api/sports/live/all
```

Expected health fields:

- `football`: configured
- `cricapi`: configured
- `thesportsdb`: configured
- `database`: mongodb (not `in-memory`)

---

## 2. Deploy Frontend to Vercel

### Build settings

| Setting           | Value           |
|-------------------|-----------------|
| Framework preset  | Vite            |
| Build command     | `npm run build` |
| Output directory  | `dist`          |

### Production environment variables

```
VITE_WS_URL=wss://esportsduniya.onrender.com
VITE_GOOGLE_SITE_VERIFICATION=your_gsc_token
VITE_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
```

> **Leave `VITE_API_URL` unset.** `vercel.json` at the repo root rewrites `/api/*`, `/blog/*`, `/sport/*`, `/match/*`, `/cricket/*`, `/football/*` and the sitemap paths to the Render backend server-side, and the SPA fallback serves `index.html` for every other route. If `VITE_API_URL` *is* set, the browser calls Render directly instead of going through the rewrite — that only works if the calling origin is in `server.js`'s `ALLOWED_ORIGINS` CORS list, so keep that list in sync with whatever domain(s) Vercel actually serves the site from (production domain + any preview `*.vercel.app` domains you rely on).

### SEO: canonical domain & Search Console

1. **Vercel Project → Settings → Domains**: add `esportsduniya.in` as the production domain, and redirect `www.esportsduniya.in` → `esportsduniya.in` (Vercel does this automatically when you add both and mark one as the redirect target).
2. **Google Search Console**: verify `esportsduniya.in`, submit sitemaps:
   - `https://esportsduniya.in/sitemap.xml`
   - `https://esportsduniya.in/sitemap-blog.xml`
3. Set `VITE_GOOGLE_SITE_VERIFICATION` in Vercel's project environment variables (HTML tag method).

### Render env (production hardening)

```
NODE_ENV=production
JWT_SECRET=...            # required — server exits without it in production
MONGODB_URI=...           # required — server exits without it in production
SENTRY_DSN=...            # optional backend error tracking
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID=...
STRIPE_WEBHOOK_SECRET=...
```

### Deploy

Push to `main` — Vercel builds and deploys automatically.

---

## 3. Custom domain

- **Vercel**: Project → Settings → Domains → `esportsduniya.in`
- **Render**: Optional custom domain for API (e.g. `api.esportsduniya.in`) — update `vercel.json`'s rewrite destinations if used

---

## Local development

```bash
npm install
cp .env.example .env   # fill in keys
npm run dev:full
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Notes

- **MongoDB Atlas** (free tier) is required for persistent news headlines, users, and fan zone state across Render restarts.
- **football-data.org** free tier: 10 requests/minute — server caches football scores for 90s.
- **TheSportsDB** public key `123` is rate-limited; register your own free key at [thesportsdb.com](https://www.thesportsdb.com/free_sports_api).
- **Gemini quota**: AI narrative/momentum may fail at 429; set `OPENAI_API_KEY` for fallback. Live scores and RSS news do not use Gemini.
- Render free tier spins down after ~15 min idle — first request after sleep may take 30–60s (cold start).
