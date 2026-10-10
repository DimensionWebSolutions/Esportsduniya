import { describe, expect, it } from 'vitest';
import {
  isTeamFollowed,
  normalizeFollowedTeams,
  toggleFollowedTeam,
} from '../src/lib/followed-teams.js';

describe('followed teams', () => {
  it('normalizes names and removes duplicate or malformed entries', () => {
    expect(normalizeFollowedTeams([
      { name: ' Mumbai Indians ', sport: 'Cricket' },
      { name: 'mumbai indians', sport: 'cricket' },
      { name: '', sport: 'football' },
      null,
    ])).toEqual([{ name: 'Mumbai Indians', sport: 'cricket' }]);
  });

  it('keeps same-named teams in different sports separate', () => {
    const teams = [{ name: 'United', sport: 'football' }];

    expect(isTeamFollowed(teams, 'united', 'FOOTBALL')).toBe(true);
    expect(isTeamFollowed(teams, 'United', 'cricket')).toBe(false);
  });

  it('toggles a followed team on and off', () => {
    const followed = toggleFollowedTeam([], 'India', 'cricket');

    expect(followed).toEqual([{ name: 'India', sport: 'cricket' }]);
    expect(toggleFollowedTeam(followed, 'india', 'CRICKET')).toEqual([]);
    expect(toggleFollowedTeam([], '', 'cricket')).toEqual([]);
  });
});
