/** Canonical site URL — apex domain (www redirects via Cloudflare). */
export const SITE_URL = 'https://esportsduniya.in';

export const SPORT_SEO = {
  cricket: {
    title: 'Cricket Live Score Today | Esportsduniya',
    description: 'Live cricket scores for IPL, international matches, and T20. AI match analysis and predictions for India.',
    h1: 'Cricket Live Scores Today',
    keywords: 'cricket live score, IPL live score, India cricket, T20 live score',
  },
  football: {
    title: 'Football Live Score Today | Esportsduniya',
    description: 'Live football scores — Premier League, Champions League, and international fixtures with AI insights.',
    h1: 'Football Live Scores Today',
    keywords: 'football live score, Premier League scores, EPL live score India',
  },
  nba: {
    title: 'NBA Live Score Today | Esportsduniya',
    description: 'NBA live scores, standings, and game updates with AI-powered match intelligence.',
    h1: 'NBA Live Scores Today',
    keywords: 'NBA scores today, NBA live score India',
  },
  basketball: {
    title: 'Basketball Live Scores | Esportsduniya',
    description: 'Live basketball scores and results from leagues worldwide.',
    h1: 'Basketball Live Scores',
    keywords: 'basketball live score',
  },
  tennis: {
    title: 'Tennis Live Score Today | Esportsduniya',
    description: 'Live tennis scores from ATP, WTA, and Grand Slam tournaments.',
    h1: 'Tennis Live Scores Today',
    keywords: 'tennis live score, tennis scores today',
  },
  f1: {
    title: 'F1 Live Results & Standings | Esportsduniya',
    description: 'Formula 1 live race results, driver standings, and session updates.',
    h1: 'F1 Live Results',
    keywords: 'F1 results, Formula 1 live, F1 standings',
  },
  baseball: { title: 'Baseball Live Scores | Esportsduniya', description: 'MLB and baseball live scores.', h1: 'Baseball Live Scores', keywords: 'baseball live score' },
  hockey: { title: 'Hockey Live Scores | Esportsduniya', description: 'NHL and hockey live scores.', h1: 'Hockey Live Scores', keywords: 'hockey live score' },
  mma: { title: 'MMA Live Results | Esportsduniya', description: 'UFC and MMA fight results.', h1: 'MMA Live Results', keywords: 'MMA live results' },
  nfl: { title: 'NFL Live Scores | Esportsduniya', description: 'NFL live scores and game updates.', h1: 'NFL Live Scores', keywords: 'NFL scores today' },
};

export const TOPICAL_HUBS = {
  'cricket/ipl-2026': {
    title: 'IPL 2026 Live Score & Schedule | Esportsduniya',
    description: 'IPL 2026 live scores, points table, match schedule, and AI predictions for Indian Premier League.',
    h1: 'IPL 2026 — Live Scores & Schedule',
    sport: 'cricket',
    intro: 'Follow every IPL 2026 match with live scores, standings, and AI-powered match analysis.',
  },
  'football/premier-league': {
    title: 'Premier League Live Score & Standings 2026 | Esportsduniya',
    description: 'EPL live scores, standings, fixtures, and AI match previews for Premier League 2025/26.',
    h1: 'Premier League — Live Scores & Standings',
    sport: 'football',
    intro: 'Track Premier League fixtures with live scores, league table, and predictive insights.',
  },
};

export const STATIC_SITEMAP_PATHS = [
  { path: '/', changefreq: 'always', priority: '1.0' },
  { path: '/blog', changefreq: 'daily', priority: '0.9' },
  { path: '/standings', changefreq: 'daily', priority: '0.8' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.7' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/arena', changefreq: 'daily', priority: '0.8' },
  { path: '/crowdpulse', changefreq: 'hourly', priority: '0.7' },
  { path: '/timemachine', changefreq: 'monthly', priority: '0.6' },
  { path: '/leaderboard', changefreq: 'hourly', priority: '0.7' },
  { path: '/cricket/ipl-2026', changefreq: 'always', priority: '0.9' },
  { path: '/football/premier-league', changefreq: 'always', priority: '0.9' },
  ...Object.keys(SPORT_SEO).map(sport => ({
    path: `/sport/${sport}`,
    changefreq: 'always',
    priority: '0.9',
  })),
];

export function sportSeoFor(sport) {
  return SPORT_SEO[sport] || {
    title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Live Scores | Esportsduniya`,
    description: `Live ${sport} scores and AI match intelligence on Esportsduniya.`,
    h1: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Live Scores`,
    keywords: `${sport} live score`,
  };
}
