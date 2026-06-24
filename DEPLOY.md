# Deployment Guide — Cloudflare Pages + Render

## Overview

| Layer     | Service              | URL pattern                              |
|-----------|----------------------|------------------------------------------|
| Frontend  | Cloudflare Pages     | `https://esportsduniya.in`               |
| Backend   | Render               | `https://esportsduniya.onrender.com`     |
| WebSocket | Render (same service)| `wss://esportsduniya.onrender.com`       |

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

## 2. Deploy Frontend to Cloudflare Pages

### Build settings

| Setting           | Value           |
|-------------------|-----------------|
| Framework preset  | Vite            |
| Build command     | `npm run build` |
| Build output dir  | `dist`          |

### Production environment variables

```
VITE_API_URL=https://esportsduniya.onrender.com
VITE_WS_URL=wss://esportsduniya.onrender.com
VITE_FOOTBALL_API_KEY=your_football-data_key
VITE_GOOGLE_SITE_VERIFICATION=your_gsc_token
VITE_SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
```

> `public/_redirects` proxies `/api/*`, `/blog/*`, `/sport/*`, `/match/*`, and sitemaps to Render for Google-indexable SSR HTML.

### SEO: canonical domain & Search Console

1. **Cloudflare Redirect Rule**: `(http.host eq "www.esportsduniya.in")` → 301 → `https://esportsduniya.in/${uri.path}`
2. **Google Search Console**: verify `esportsduniya.in`, submit sitemaps:
   - `https://esportsduniya.in/sitemap.xml`
   - `https://esportsduniya.in/sitemap-blog.xml`
3. Set `VITE_GOOGLE_SITE_VERIFICATION` in Cloudflare Pages build env (HTML tag method).

### Render env (production hardening)

```
NODE_ENV=production
MONGODB_URI=...          # required — server exits without it in production
SENTRY_DSN=...           # optional backend error tracking
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID=...
STRIPE_WEBHOOK_SECRET=...
```

### Deploy

Push to `main` — Cloudflare Pages builds automatically.

---

## 3. Custom domain

- **Cloudflare Pages**: Settings → Custom domains → `esportsduniya.in`
- **Render**: Optional custom domain for API (e.g. `api.esportsduniya.in`) — update `VITE_API_URL` / `_redirects` if used

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
