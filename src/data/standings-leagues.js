import { APISPORTS_SPORT_IDS } from '../../lib/sports-registry.js';

function labelFor(id) {
  const labels = {
    f1: 'F1',
    nba: 'NBA',
    nfl: 'NFL',
    mma: 'MMA',
    afl: 'AFL',
  };
  return labels[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

const LEAGUES = [
  { id: 'cricket', label: 'Cricket' },
  ...APISPORTS_SPORT_IDS.map(id => ({ id, label: labelFor(id) })),
];

export default LEAGUES;
