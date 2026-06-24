import { describe, it, expect } from 'vitest';
import { SITE_URL, sportSeoFor, STATIC_SITEMAP_PATHS } from '../lib/seo-config.js';
import { escapeHtml, buildSitemapIndex } from '../lib/seo-render.js';
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

describe('sport-seo (frontend)', () => {
  it('mirrors backend sport titles', () => {
    expect(helmetForSport('football').title).toContain('Football');
    expect(helmetForSport('all').title).toContain('Esportsduniya');
  });
});
