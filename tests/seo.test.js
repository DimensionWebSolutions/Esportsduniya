import { describe, it, expect } from 'vitest';
import { SITE_URL, sportSeoFor, STATIC_SITEMAP_PATHS, TOPICAL_HUBS, hubMatchFilter } from '../lib/seo-config.js';
import { escapeHtml, buildSitemapIndex, renderTopicalHubPage } from '../lib/seo-render.js';
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
    expect(paths).toContain('/quiz');
  });
});

describe('topical hubs', () => {
  it('gives every hub explainer content', () => {
    for (const hub of Object.values(TOPICAL_HUBS)) {
      expect(hub.keyFacts.length).toBeGreaterThanOrEqual(3);
      expect(hub.faqs.length).toBeGreaterThanOrEqual(3);
      for (const faq of hub.faqs) {
        expect(faq.q.endsWith('?')).toBe(true);
        expect(faq.a.length).toBeGreaterThan(60);
      }
    }
  });

  it('keeps only matches belonging to the hub', () => {
    const isIpl = hubMatchFilter('cricket/ipl-2026');
    expect(isIpl({ league: 'IPL 2026' })).toBe(true);
    expect(isIpl({ name: 'Indian Premier League — Qualifier 1' })).toBe(true);
    expect(isIpl({ league: 'The Ashes' })).toBe(false);

    const isEpl = hubMatchFilter('football/premier-league');
    expect(isEpl({ league: 'Premier League' })).toBe(true);
    expect(isEpl({ league: 'La Liga' })).toBe(false);
    expect(isEpl({ league: 'Serie A Play-offs' })).toBe(false);
  });

  it('treats an unknown hub as no filter', () => {
    expect(hubMatchFilter('nope/none')({ league: 'anything' })).toBe(true);
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

  it('renders hub facts and FAQ markup with FAQPage structured data', () => {
    const html = renderTopicalHubPage('cricket/ipl-2026', []);
    expect(html).toContain('net run rate');
    expect(html).toContain('class="facts"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"Question"');
  });

  it('returns null for an unknown hub', () => {
    expect(renderTopicalHubPage('cricket/no-such-hub', [])).toBeNull();
  });
});

describe('sport-seo (frontend)', () => {
  it('mirrors backend sport titles', () => {
    expect(helmetForSport('football').title).toContain('Football');
    expect(helmetForSport('all').title).toContain('Esportsduniya');
  });
});
