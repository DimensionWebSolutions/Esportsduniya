export const FOLLOWED_TEAMS_STORAGE_KEY = 'esd_followed_teams';

export function normalizeFollowedTeams(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  return value.reduce((teams, team) => {
    if (typeof team?.name !== 'string' || typeof team?.sport !== 'string') return teams;

    const name = team.name.trim();
    const sport = team.sport.trim().toLowerCase();
    if (!name || !sport) return teams;

    const key = `${sport}:${name.toLocaleLowerCase()}`;
    if (seen.has(key)) return teams;
    seen.add(key);
    teams.push({ name, sport });
    return teams;
  }, []);
}

export function isTeamFollowed(teams, name, sport) {
  if (typeof name !== 'string' || typeof sport !== 'string') return false;
  const teamKey = `${sport}:${name}`.toLocaleLowerCase();
  return normalizeFollowedTeams(teams).some(
    team => `${team.sport}:${team.name}`.toLocaleLowerCase() === teamKey,
  );
}

export function toggleFollowedTeam(teams, name, sport) {
  if (typeof name !== 'string' || typeof sport !== 'string' || !name.trim() || !sport.trim()) {
    return normalizeFollowedTeams(teams);
  }
  const normalizedTeams = normalizeFollowedTeams(teams);
  if (isTeamFollowed(normalizedTeams, name, sport)) {
    return normalizedTeams.filter(
      team => `${team.sport}:${team.name}`.toLocaleLowerCase()
        !== `${sport}:${name}`.toLocaleLowerCase(),
    );
  }
  return normalizeFollowedTeams([...normalizedTeams, { name, sport }]);
}
