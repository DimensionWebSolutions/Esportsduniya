import { SITE_URL, sportSeoFor, TOPICAL_HUBS } from './seo-config.js';

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SEO_CSS = `
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0f;color:#e8e8ef;margin:0;line-height:1.5}
a{color:#1ee6a7;text-decoration:none}a:hover{text-decoration:underline}
header{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid #222}
.logo{font-weight:700;font-size:1.1rem;color:#fff}
nav a{margin-left:1rem;color:#aaa;font-size:.9rem}
main{max-width:960px;margin:0 auto;padding:1.5rem}
h1{font-size:1.75rem;margin:0 0 .5rem}
.intro{color:#999;margin-bottom:1.5rem}
.match-list{list-style:none;padding:0;margin:0}
.match-item{border:1px solid #222;border-radius:8px;padding:1rem;margin-bottom:.75rem;background:#12121a}
.match-item a{color:#fff;font-weight:600}
.match-meta{font-size:.85rem;color:#888;margin-top:.35rem}
.score{font-family:monospace;color:#1ee6a7;font-weight:600}
footer{text-align:center;padding:2rem;color:#666;font-size:.85rem;border-top:1px solid #222;margin-top:2rem}
.faq{margin-top:2rem;padding-top:1.5rem;border-top:1px solid #222}
.faq h2{font-size:1.1rem;margin-bottom:.75rem}
.faq p{color:#aaa;font-size:.9rem}
`;

function pageShell({ title, description, canonical, jsonLd, bodyHtml }) {
  const ld = jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : '';
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${escapeHtml(canonical)}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${escapeHtml(title)}"/>
<meta property="og:description" content="${escapeHtml(description)}"/>
<meta property="og:url" content="${escapeHtml(canonical)}"/>
<meta property="og:image" content="${SITE_URL}/og-cover.png"/>
<meta property="og:locale" content="en_IN"/>
<meta name="twitter:card" content="summary_large_image"/>
${ld}
<style>${SEO_CSS}</style>
</head>
<body>
<header>
  <a class="logo" href="${SITE_URL}">⚡ Esportsduniya</a>
  <nav>
    <a href="${SITE_URL}/sport/cricket">Cricket</a>
    <a href="${SITE_URL}/sport/football">Football</a>
    <a href="${SITE_URL}/blog">News</a>
    <a href="${SITE_URL}/arena">Predictions</a>
  </nav>
</header>
<main>${bodyHtml}</main>
<footer><p>© ${new Date().getFullYear()} <a href="${SITE_URL}">Esportsduniya</a> — Live scores + AI match intelligence</p></footer>
</body>
</html>`;
}

function renderMatchList(matches, sport) {
  if (!matches.length) {
    return `<p class="intro">No live ${escapeHtml(sport)} matches right now. Check back soon or <a href="${SITE_URL}">view all sports</a>.</p>`;
  }
  return `<ul class="match-list">${matches.slice(0, 40).map(m => {
    const url = `${SITE_URL}/match/${encodeURIComponent(m.id)}`;
    const scoreA = m.teamA?.score ?? '–';
    const scoreB = m.teamB?.score ?? '–';
    const status = m.status === 'live' ? '● LIVE' : m.status === 'upcoming' ? 'Upcoming' : 'Final';
    return `<li class="match-item">
      <a href="${url}">${escapeHtml(m.teamA?.name)} vs ${escapeHtml(m.teamB?.name)}</a>
      <div class="match-meta">${escapeHtml(m.league || '')} · <span class="score">${escapeHtml(String(scoreA))} – ${escapeHtml(String(scoreB))}</span> · ${escapeHtml(status)}</div>
    </li>`;
  }).join('')}</ul>`;
}

function buildItemListJsonLd(matches, listName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    itemListElement: matches.slice(0, 40).map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/match/${m.id}`,
      name: `${m.teamA?.name} vs ${m.teamB?.name}`,
    })),
  };
}

function buildSportsEventJsonLd(match) {
  const statusMap = { live: 'EventScheduled', upcoming: 'EventScheduled', finished: 'EventCompleted' };
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${match.teamA?.name} vs ${match.teamB?.name}`,
    description: `${match.league || match.sport} live score`,
    url: `${SITE_URL}/match/${match.id}`,
    sport: match.sport,
    eventStatus: statusMap[match.status] || 'EventScheduled',
    homeTeam: { '@type': 'SportsTeam', name: match.teamA?.name },
    awayTeam: { '@type': 'SportsTeam', name: match.teamB?.name },
    location: match.venue ? { '@type': 'Place', name: match.venue } : undefined,
  };
}

export function renderSportHubPage(sport, matches) {
  const seo = sportSeoFor(sport);
  const canonical = `${SITE_URL}/sport/${sport}`;
  const faq = sport === 'cricket'
    ? `<div class="faq"><h2>How to read live cricket score</h2><p>Team scores show runs/wickets (e.g. 145/3). Overs indicate balls bowled. Tap any match for ball-by-ball updates and AI analysis.</p></div>`
    : '';
  const bodyHtml = `
    <h1>${escapeHtml(seo.h1)}</h1>
    <p class="intro">${escapeHtml(seo.description)}</p>
    ${renderMatchList(matches, sport)}
    ${faq}
    <p style="margin-top:1.5rem"><a href="${SITE_URL}">Open full dashboard →</a></p>`;
  return pageShell({
    title: seo.title,
    description: seo.description,
    canonical,
    jsonLd: buildItemListJsonLd(matches, seo.h1),
    bodyHtml,
  });
}

export function renderMatchPage(match) {
  const title = `${match.teamA?.name} vs ${match.teamB?.name} — Live Score | Esportsduniya`;
  const description = `Live score for ${match.teamA?.name} vs ${match.teamB?.name}. ${match.league || ''} ${match.teamA?.score ?? ''} - ${match.teamB?.score ?? ''}. AI analysis and predictions.`;
  const canonical = `${SITE_URL}/match/${match.id}`;
  const scoreA = match.teamA?.score ?? '–';
  const scoreB = match.teamB?.score ?? '–';
  const bodyHtml = `
    <h1>${escapeHtml(match.teamA?.name)} vs ${escapeHtml(match.teamB?.name)}</h1>
    <p class="intro">${escapeHtml(match.league || match.sport)} · ${escapeHtml(match.status || 'live')}</p>
    <div class="match-item">
      <p><strong>${escapeHtml(match.teamA?.name)}</strong> <span class="score">${escapeHtml(String(scoreA))}</span></p>
      <p><strong>${escapeHtml(match.teamB?.name)}</strong> <span class="score">${escapeHtml(String(scoreB))}</span></p>
      ${match.venue ? `<p class="match-meta">${escapeHtml(match.venue)}</p>` : ''}
      ${match.minute ? `<p class="match-meta">${escapeHtml(match.minute)}</p>` : ''}
    </div>
    <p style="margin-top:1.5rem"><a href="${SITE_URL}/match/${encodeURIComponent(match.id)}">Open Match Command Center →</a> for AI narrative, momentum, and fan predictions.</p>
    <p><a href="${SITE_URL}/sport/${escapeHtml(match.sport)}">← More ${escapeHtml(match.sport)} scores</a></p>`;
  return pageShell({
    title,
    description,
    canonical,
    jsonLd: buildSportsEventJsonLd(match),
    bodyHtml,
  });
}

export function renderTopicalHubPage(hubKey, matches) {
  const hub = TOPICAL_HUBS[hubKey];
  if (!hub) return null;
  const canonical = `${SITE_URL}/${hubKey}`;
  const bodyHtml = `
    <h1>${escapeHtml(hub.h1)}</h1>
    <p class="intro">${escapeHtml(hub.intro)}</p>
    ${renderMatchList(matches, hub.sport)}
    <p style="margin-top:1.5rem"><a href="${SITE_URL}/sport/${hub.sport}">All ${escapeHtml(hub.sport)} live scores →</a></p>`;
  return pageShell({
    title: hub.title,
    description: hub.description,
    canonical,
    jsonLd: buildItemListJsonLd(matches, hub.h1),
    bodyHtml,
  });
}

export function buildSitemapXml(urlEntries) {
  const today = new Date().toISOString().split('T')[0];
  const urls = urlEntries.map(({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeHtml(loc)}</loc>
    <lastmod>${lastmod || today}</lastmod>
    <changefreq>${changefreq || 'daily'}</changefreq>
    <priority>${priority || '0.7'}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function buildSitemapIndex() {
  const today = new Date().toISOString().split('T')[0];
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE_URL}/sitemap-app.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-blog.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>${SITE_URL}/sitemap-matches.xml</loc><lastmod>${today}</lastmod></sitemap>
</sitemapindex>`;
}
