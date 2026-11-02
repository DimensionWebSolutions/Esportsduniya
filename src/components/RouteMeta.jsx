import { Helmet } from 'react-helmet-async';
import { useLocation, Link } from 'react-router-dom';

const SITE = 'https://esportsduniya.in';

/**
 * Unique <title>, description and canonical for routes whose page component
 * does not set its own. Pages that render their own <Helmet> override these
 * (the innermost Helmet wins).
 */
const ROUTE_META = {
  '/blog': {
    title: 'Sports News, Guides & Analysis | Esportsduniya',
    description: 'Sports explainers, match guides and news for cricket, football, NBA, tennis and F1: rules, formats, stats and how to follow every game.',
  },
  '/standings': {
    title: 'League Standings & Points Tables | Esportsduniya',
    description: 'Up-to-date league tables for the Premier League, La Liga, Serie A and more, with points, goal difference and form.',
  },
  '/crowdpulse': {
    title: 'Crowd Pulse — Live Fan Sentiment Across Sports | Esportsduniya',
    description: 'See how fans around the world feel during live matches with real-time crowd sentiment, reactions and trending moments.',
  },
  '/fifa': {
    title: 'FIFA World Cup Hub — Fixtures, Groups & Analysis | Esportsduniya',
    description: 'Follow FIFA World Cup fixtures, groups, results and match analysis in one place.',
  },
  '/leaderboard': {
    title: 'Prediction Leaderboard — Top Fans & Rankings | Esportsduniya',
    description: 'See the best predictors on Esportsduniya. Rankings by FanPoints for today, this week and all time.',
  },
  '/timemachine': {
    title: 'Sports Time Machine — Relive Legendary Matches | Esportsduniya',
    description: 'Relive iconic matches and moments from cricket, football, tennis, F1 and more with context, key moments and stats.',
  },
  '/analytics': {
    title: 'Sports Analytics & Trends | Esportsduniya',
    description: 'Charts and trends from across the Esportsduniya community: predictions, engagement and sport popularity.',
  },
  '/profile': { title: 'Your Profile | Esportsduniya', noindex: true },
  '/admin': { title: 'Admin | Esportsduniya', noindex: true },
  '/forgot-password': { title: 'Forgot Password | Esportsduniya', noindex: true },
  '/reset-password': { title: 'Reset Password | Esportsduniya', noindex: true },
  '/verify-email': { title: 'Verify Email | Esportsduniya', noindex: true },
};

// Indexable routes that set their own title/description (or are fine with the defaults)
const OTHER_INDEXABLE = ['/', '/arena', '/pricing', '/quiz', '/fantasy', '/privacy', '/terms', '/about', '/contact', '/editorial-policy', '/disclaimer'];
const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

export default function RouteMeta() {
  const { pathname } = useLocation();
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const meta = ROUTE_META[key];
  if (!meta) {
    if (!OTHER_INDEXABLE.includes(key)) return null;
    return (
      <Helmet>
        <meta name="robots" content={INDEX_ROBOTS} />
        <link rel="canonical" href={key === '/' ? `${SITE}/` : `${SITE}${key}`} />
      </Helmet>
    );
  }
  return (
    <Helmet>
      <title>{meta.title}</title>
      {meta.description && <meta name="description" content={meta.description} />}
      {meta.description && <meta property="og:title" content={meta.title} />}
      {meta.description && <meta property="og:description" content={meta.description} />}
      {meta.noindex
        ? <meta name="robots" content="noindex, nofollow" />
        : <meta name="robots" content={INDEX_ROBOTS} />}
      {!meta.noindex && <link rel="canonical" href={`${SITE}${key}`} />}
    </Helmet>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <Helmet>
        <title>Page not found | Esportsduniya</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <p className="font-data text-sm text-muted">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground">We couldn't find that page</h1>
      <p className="mt-3 text-muted">The page may have moved or never existed. Try one of these instead:</p>
      <ul className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <li><Link className="rounded-lg border border-border px-4 py-2 text-accent hover:bg-surface-2" to="/">Live scores</Link></li>
        <li><Link className="rounded-lg border border-border px-4 py-2 text-accent hover:bg-surface-2" to="/blog">Sports guides</Link></li>
        <li><Link className="rounded-lg border border-border px-4 py-2 text-accent hover:bg-surface-2" to="/standings">Standings</Link></li>
      </ul>
    </div>
  );
}
