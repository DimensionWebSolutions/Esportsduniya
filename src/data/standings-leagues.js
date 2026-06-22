/** Leagues with real standings data on the backend */
export const STANDINGS_SUPPORTED = ['football', 'f1', 'nba'];

const LABELS = {
  football: 'Football',
  f1: 'F1',
  nba: 'NBA',
  cricket: 'Cricket',
  tennis: 'Tennis',
};

const LEAGUES = STANDINGS_SUPPORTED.map(id => ({
  id,
  label: LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
  supported: true,
}));

export default LEAGUES;
