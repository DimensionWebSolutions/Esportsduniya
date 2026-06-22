/**
 * Canonical sport list — shared by frontend and backend.
 * Football → football-data.org · Cricket → CricAPI · Others → TheSportsDB (free v1)
 */
export const SPORTS = [
  { id: 'all', label: 'All Sports', icon: '🌍', provider: null },
  { id: 'cricket', label: 'Cricket', icon: '🏏', provider: 'cricapi' },
  { id: 'football', label: 'Football', icon: '⚽', provider: 'football-data' },
  { id: 'nba', label: 'NBA', icon: '🏀', provider: 'thesportsdb' },
  { id: 'basketball', label: 'Basketball', icon: '🏀', provider: 'thesportsdb' },
  { id: 'f1', label: 'F1', icon: '🏎️', provider: 'thesportsdb' },
  { id: 'baseball', label: 'Baseball', icon: '⚾', provider: 'thesportsdb' },
  { id: 'hockey', label: 'Hockey', icon: '🏒', provider: 'thesportsdb' },
  { id: 'handball', label: 'Handball', icon: '🤾', provider: 'thesportsdb' },
  { id: 'volleyball', label: 'Volleyball', icon: '🏐', provider: 'thesportsdb' },
  { id: 'rugby', label: 'Rugby', icon: '🏉', provider: 'thesportsdb' },
  { id: 'mma', label: 'MMA', icon: '🥊', provider: 'thesportsdb' },
  { id: 'nfl', label: 'NFL', icon: '🏈', provider: 'thesportsdb' },
  { id: 'afl', label: 'AFL', icon: '🏉', provider: 'thesportsdb' },
  { id: 'tennis', label: 'Tennis', icon: '🎾', provider: 'thesportsdb' },
];

export const THESPORTSDB_SPORT_IDS = SPORTS.filter(s => s.provider === 'thesportsdb').map(s => s.id);

/** @deprecated use THESPORTSDB_SPORT_IDS */
export const APISPORTS_SPORT_IDS = THESPORTSDB_SPORT_IDS;

export const LIVE_SPORT_IDS = ['cricket', 'football', ...THESPORTSDB_SPORT_IDS];

export const SPORT_BY_ID = Object.fromEntries(SPORTS.map(s => [s.id, s]));

export function sportIcon(id) {
  return SPORT_BY_ID[id]?.icon || '🏅';
}
