/**
 * Canonical sport list — shared by frontend (via mockData) and backend (server.js).
 * Cricket uses CricAPI; all others use API-Sports (single APISPORTS_KEY).
 */
export const SPORTS = [
  { id: 'all', label: 'All Sports', icon: '🌍', apisports: false },
  { id: 'cricket', label: 'Cricket', icon: '🏏', apisports: false },
  { id: 'football', label: 'Football', icon: '⚽', apisports: true },
  { id: 'nba', label: 'NBA', icon: '🏀', apisports: true },
  { id: 'basketball', label: 'Basketball', icon: '🏀', apisports: true },
  { id: 'f1', label: 'F1', icon: '🏎️', apisports: true },
  { id: 'baseball', label: 'Baseball', icon: '⚾', apisports: true },
  { id: 'hockey', label: 'Hockey', icon: '🏒', apisports: true },
  { id: 'handball', label: 'Handball', icon: '🤾', apisports: true },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐', apisports: true },
  { id: 'rugby', label: 'Rugby', icon: '🏉', apisports: true },
  { id: 'mma', label: 'MMA', icon: '🥊', apisports: true },
  { id: 'nfl', label: 'NFL', icon: '🏈', apisports: true },
  { id: 'afl', label: 'AFL', icon: '🏉', apisports: true },
  { id: 'tennis', label: 'Tennis', icon: '🎾', apisports: true },
];

export const APISPORTS_SPORT_IDS = SPORTS.filter(s => s.apisports).map(s => s.id);

export const LIVE_SPORT_IDS = ['cricket', ...APISPORTS_SPORT_IDS];

export const SPORT_BY_ID = Object.fromEntries(SPORTS.map(s => [s.id, s]));

export function sportIcon(id) {
  return SPORT_BY_ID[id]?.icon || '🏅';
}
