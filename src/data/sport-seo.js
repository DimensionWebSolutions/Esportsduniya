/** Per-sport Helmet meta — mirrors lib/seo-config.js for the SPA. */
export const SPORT_HELMET = {
  cricket: {
    title: 'Cricket Live Score Today | Esportsduniya',
    description: 'Live cricket scores for IPL, international matches, and T20. AI match analysis and predictions for India.',
  },
  football: {
    title: 'Football Live Score Today | Esportsduniya',
    description: 'Live football scores — Premier League, Champions League, and international fixtures with AI insights.',
  },
  nba: {
    title: 'NBA Live Score Today | Esportsduniya',
    description: 'NBA live scores, standings, and game updates with AI-powered match intelligence.',
  },
  basketball: {
    title: 'Basketball Live Scores | Esportsduniya',
    description: 'Live basketball scores and results from leagues worldwide.',
  },
  tennis: {
    title: 'Tennis Live Score Today | Esportsduniya',
    description: 'Live tennis scores from ATP, WTA, and Grand Slam tournaments.',
  },
  f1: {
    title: 'F1 Live Results & Standings | Esportsduniya',
    description: 'Formula 1 live race results, driver standings, and session updates.',
  },
  baseball: { title: 'Baseball Live Scores | Esportsduniya', description: 'MLB and baseball live scores.' },
  hockey: { title: 'Hockey Live Scores | Esportsduniya', description: 'NHL and hockey live scores.' },
  mma: { title: 'MMA Live Results | Esportsduniya', description: 'UFC and MMA fight results.' },
  nfl: { title: 'NFL Live Scores | Esportsduniya', description: 'NFL live scores and game updates.' },
};

export const DEFAULT_HELMET = {
  title: 'Esportsduniya — Live Sports Scores & AI Insights',
  description: 'Real-time cricket, football, NBA, tennis & F1 scores with AI match intelligence and prediction arena — built for India.',
};

export function helmetForSport(sport) {
  if (!sport || sport === 'all') return DEFAULT_HELMET;
  return SPORT_HELMET[sport] || {
    title: `${sport.charAt(0).toUpperCase() + sport.slice(1)} Live Scores | Esportsduniya`,
    description: `Live ${sport} scores and AI match intelligence on Esportsduniya.`,
  };
}
