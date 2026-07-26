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
    matchFilter: 'ipl|indian premier league',
    keyFacts: [
      { label: 'Teams', value: '10 franchises' },
      { label: 'League games', value: '14 per team' },
      { label: 'Playoff spots', value: 'Top 4' },
      { label: 'Format', value: '20 overs a side' },
    ],
    faqs: [
      {
        q: 'How do IPL points tables work?',
        a: 'A win is worth 2 points and a no-result is worth 1 point each. When teams finish level on points, net run rate (runs scored per over minus runs conceded per over) decides who finishes higher.',
      },
      {
        q: 'How do the IPL playoffs work?',
        a: 'The top four teams advance. The top two meet in Qualifier 1 and the winner goes straight to the final; the loser gets a second chance in Qualifier 2 against the winner of the Eliminator between the third and fourth-placed teams.',
      },
      {
        q: 'What does a score like 186/4 mean?',
        a: 'The first number is runs scored and the second is wickets lost, so 186/4 means 186 runs for the loss of four wickets. The overs figure next to it tells you how many of the 20 overs have been bowled.',
      },
      {
        q: 'Where can I follow IPL scores live on Esportsduniya?',
        a: 'This hub refreshes cricket fixtures automatically. Open any match to get the ball-by-ball timeline, momentum read, AI commentary, and a prediction you can lock before the result lands.',
      },
    ],
  },
  'football/premier-league': {
    title: 'Premier League Live Score & Standings 2026 | Esportsduniya',
    description: 'EPL live scores, standings, fixtures, and AI match previews for Premier League 2025/26.',
    h1: 'Premier League — Live Scores & Standings',
    sport: 'football',
    intro: 'Track Premier League fixtures with live scores, league table, and predictive insights.',
    matchFilter: 'premier league|epl',
    keyFacts: [
      { label: 'Clubs', value: '20' },
      { label: 'Matches', value: '38 per club' },
      { label: 'Win', value: '3 points' },
      { label: 'Relegation', value: 'Bottom 3' },
    ],
    faqs: [
      {
        q: 'How is the Premier League table decided?',
        a: 'Clubs are ranked on points, then goal difference, then goals scored. If teams are still level and the position decides the title, relegation, or European qualification, a play-off match settles it.',
      },
      {
        q: 'How many Premier League clubs qualify for the Champions League?',
        a: 'The top four usually qualify, and England can earn an extra place when its clubs perform well in the UEFA coefficient rankings. Fifth place normally leads to the Europa League.',
      },
      {
        q: 'What time do Premier League matches start in India?',
        a: 'Most weekend kick-offs land between roughly 5:30pm and 1:30am IST, with midweek rounds usually starting later in the night. Each fixture card on this page shows its own local start time.',
      },
      {
        q: 'What is expected goals (xG)?',
        a: 'Expected goals estimate how likely a shot is to be scored based on factors such as distance, angle, and assist type. Comparing xG with the actual score shows whether a team was clinical or wasteful.',
      },
    ],
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
  { path: '/quiz', changefreq: 'daily', priority: '0.8' },
  { path: '/fifa', changefreq: 'daily', priority: '0.7' },
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

/** Predicate that keeps only the matches belonging to a topical hub (e.g. IPL fixtures). */
export function hubMatchFilter(hubKey) {
  const pattern = TOPICAL_HUBS[hubKey]?.matchFilter;
  if (!pattern) return () => true;
  const regex = new RegExp(pattern, 'i');
  return (match) => regex.test(`${match?.league || ''} ${match?.name || ''}`);
}

export function sportSeoFor(sport) {
  return SPORT_SEO[sport] || {
    title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Live Scores | Esportsduniya`,
    description: `Live ${sport} scores and AI match intelligence on Esportsduniya.`,
    h1: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Live Scores`,
    keywords: `${sport} live score`,
  };
}
