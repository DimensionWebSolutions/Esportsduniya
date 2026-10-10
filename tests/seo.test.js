import { describe, it, expect } from 'vitest';
import { SITE_URL, sportSeoFor, STATIC_SITEMAP_PATHS } from '../lib/seo-config.js';
import { escapeHtml, buildSitemapIndex } from '../lib/seo-render.js';
import { normalizeNewsItem } from '../lib/news-feed.js';
import { helmetForSport } from '../src/data/sport-seo.js';

describe('seo-config', () => {
  it('uses apex canonical domain', () => {
    expect(SITE_URL).toBe('https://esportsduniya.in');
    expect(SITE_URL).not.toContain('www.');
  });

  it('provides cricket India-focused meta', () => {
    const cricket = sportSeoFor('cricket');
    expect(cricket.title.toLowerCase()).toContain('cricket');
    expect(cricket.description.toLowerCase()).toContain('ipl');
  });

  it('includes standings and hub routes in sitemap', () => {
    const paths = STATIC_SITEMAP_PATHS.map(p => p.path);
    expect(paths).toContain('/standings');
    expect(paths).toContain('/cricket/ipl-2026');
    expect(paths).toContain('/sport/cricket');
  });
});

describe('seo-render', () => {
  it('escapes HTML in user content', () => {
    expect(escapeHtml('<script>"x"&</script>')).toBe('&lt;script&gt;&quot;x&quot;&amp;&lt;/script&gt;');
  });

  it('builds sitemap index with child sitemaps', () => {
    const xml = buildSitemapIndex();
    expect(xml).toContain('sitemap-app.xml');
    expect(xml).toContain('sitemap-matches.xml');
    expect(xml).toContain('sitemap-blog.xml');
  });
});

describe('sports news classification', () => {
  it('corrects an obvious cross-sport headline instead of preserving a wrong tag', () => {
    const item = normalizeNewsItem({
      title: 'Macklin Celebrini injury update for the Sharks',
      link: 'https://example.com/sharks-injury',
    }, 'football');

    expect(item.category).toBe('hockey');
  });

  it('keeps supported sport labels when the headline confirms the sport', () => {
    const item = normalizeNewsItem({
      title: 'Arsenal score a late goal in the Premier League',
      link: 'https://example.com/arsenal',
    }, 'football');

    expect(item.category).toBe('football');
  });
});

describe('sport-seo (frontend)', () => {
  it('mirrors backend sport titles', () => {
    expect(helmetForSport('football').title).toContain('Football');
    expect(helmetForSport('all').title).toContain('Esportsduniya');
  });
});
