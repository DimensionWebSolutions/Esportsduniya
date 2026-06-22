/**
 * Sports news ingestion — Google News RSS, publisher RSS, optional NewsAPI.
 */
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'Esportsduniya/1.0 (+https://esportsduniya.in)' },
});

/** Sport id → Google News search query (India-focused) */
export const SPORT_NEWS_QUERIES = {
  cricket: 'IPL OR India cricket OR ICC',
  football: 'Premier League OR Champions League OR Indian football',
  nba: 'NBA basketball',
  tennis: 'ATP OR WTA OR tennis Grand Slam',
  f1: 'Formula 1 OR F1 Grand Prix',
  general: 'sports news India',
};

/** Optional direct publisher RSS feeds */
export const PUBLISHER_FEEDS = [
  { url: 'https://www.espncricinfo.com/rss/content/story/feeds/0.xml', category: 'cricket', sourceName: 'ESPNcricinfo' },
  { url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'general', sourceName: 'BBC Sport' },
];

function hashUrl(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h) + url.charCodeAt(i);
    h |= 0;
  }
  return `news-${Math.abs(h).toString(36)}`;
}

function stripHtml(text) {
  return String(text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function googleNewsRssUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-IN&gl=IN&ceid=IN:en`;
}

function parseGoogleNewsSource(item) {
  const raw = item.source?.title || item.creator || '';
  if (raw) return raw;
  const title = item.title || '';
  const dash = title.lastIndexOf(' - ');
  if (dash > 0) return title.slice(dash + 3).trim();
  return 'News';
}

function resolveLink(item) {
  const link = item.link || item.guid || '';
  if (link && !link.includes('news.google.com')) return link;
  return item.link || item.guid || '';
}

export function normalizeNewsItem(raw, category = 'general') {
  const sourceUrl = resolveLink(raw);
  if (!sourceUrl || !raw.title) return null;

  const snippet = stripHtml(raw.contentSnippet || raw.content || raw.summary || '');
  const metaDescription = (snippet || raw.title).slice(0, 160);
  const sourceName = raw.sourceName || parseGoogleNewsSource(raw);
  const publishedAt = raw.pubDate ? new Date(raw.pubDate) : new Date();
  const imageUrl = raw.enclosure?.url || raw.imageUrl || '';

  const contentHtml = snippet
    ? `<p>${escapeHtml(snippet)}</p>`
    : `<p>${escapeHtml(raw.title)}</p>`;

  const wordCount = snippet.split(/\s+/).filter(Boolean).length || 0;

  return {
    slug: hashUrl(sourceUrl),
    title: stripHtml(raw.title).slice(0, 300),
    metaDescription,
    category,
    keywords: [],
    contentHtml,
    wordCount,
    readTime: Math.max(1, Math.ceil(wordCount / 200)) || 1,
    publishedAt,
    imageUrl,
    sourceUrl,
    sourceName,
    isExternal: true,
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchRssFeed(url, category, sourceNameOverride) {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map(item => {
      const enriched = sourceNameOverride ? { ...item, sourceName: sourceNameOverride } : item;
      return normalizeNewsItem(enriched, category);
    }).filter(Boolean);
  } catch (err) {
    console.warn(`   ⚠️  News RSS failed (${url}):`, err.message);
    return [];
  }
}

async function fetchGoogleNewsForSport(sportId, query) {
  const url = googleNewsRssUrl(query);
  return fetchRssFeed(url, sportId);
}

async function fetchNewsApiHeadlines(apiKey) {
  if (!apiKey) return [];
  const url = `https://newsapi.org/v2/top-headlines?category=sports&pageSize=20&apiKey=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
    const data = await res.json();
    return (data.articles || []).map(article => normalizeNewsItem({
      title: article.title,
      link: article.url,
      pubDate: article.publishedAt,
      contentSnippet: article.description,
      sourceName: article.source?.name || 'News',
      imageUrl: article.urlToImage || '',
    }, 'general')).filter(Boolean);
  } catch (err) {
    console.warn('   ⚠️  NewsAPI fetch failed:', err.message);
    return [];
  }
}

function dedupeByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item?.sourceUrl || seen.has(item.sourceUrl)) continue;
    seen.add(item.sourceUrl);
    out.push(item);
  }
  return out;
}

/**
 * Fetch sports headlines from all configured sources.
 */
export async function fetchAllSportsNews({ newsApiKey } = {}) {
  const tasks = Object.entries(SPORT_NEWS_QUERIES).map(([sport, query]) =>
    fetchGoogleNewsForSport(sport, query),
  );
  const publisherTasks = PUBLISHER_FEEDS.map(f =>
    fetchRssFeed(f.url, f.category, f.sourceName),
  );

  const chunks = await Promise.all([...tasks, ...publisherTasks]);
  let items = chunks.flat();

  if (newsApiKey) {
    const apiItems = await fetchNewsApiHeadlines(newsApiKey);
    items = items.concat(apiItems);
  }

  items = dedupeByUrl(items);
  items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return items.slice(0, 80);
}
