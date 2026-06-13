const API_BASE = 'https://api.football-data.org/v4';
const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;

function getAuthHeaders() {
  if (!API_KEY) {
    throw new Error('Missing VITE_FOOTBALL_API_KEY. Set it in your .env file.');
  }
  return {
    'X-Auth-Token': API_KEY,
    'Content-Type': 'application/json',
  };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getStatus(status) {
  if (['LIVE', 'IN_PLAY', 'PAUSED'].includes(status)) return 'live';
  if (['FINISHED', 'AWARDED', 'SUSPENDED', 'INTERRUPTED'].includes(status)) return 'finished';
  return 'upcoming';
}

function normalizeFifaMatch(match) {
  const home = match.homeTeam || {};
  const away = match.awayTeam || {};
  const score = match.score || {};
  const fullTime = score.fullTime || {};
  const status = getStatus(match.status);
  const scoreHome = fullTime.home !== null && fullTime.home !== undefined ? String(fullTime.home) : '-';
  const scoreAway = fullTime.away !== null && fullTime.away !== undefined ? String(fullTime.away) : '-';
  const date = new Date(match.utcDate);

  return {
    id: match.id || `${home.id}-${away.id}-${match.utcDate}`,
    stage: match.stage || match.group || match.stage || '',
    status,
    matchday: match.matchday || null,
    competition: match.competition?.name || 'FIFA World Cup 2026',
    group: match.group || match.stage || '',
    homeTeam: {
      id: home.id,
      name: home.name || home.shortName || 'Home',
      shortName: home.shortName || home.name || 'Home',
      score: scoreHome,
    },
    awayTeam: {
      id: away.id,
      name: away.name || away.shortName || 'Away',
      shortName: away.shortName || away.name || 'Away',
      score: scoreAway,
    },
    venue: match.venue || match.location || '',
    utcDate: match.utcDate,
    localTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateString: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    minute: status === 'live' ? (match.minute ? `${match.minute}'` : 'LIVE') : status === 'upcoming' ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'FT',
    source: 'football-data',
    raw: match,
  };
}

async function fetchFootballData(path) {
  const url = `${API_BASE}${path}`;
  console.log('[footballApi] Fetch start', url);
  const response = await fetch(url, {
    headers: getAuthHeaders(),
    cache: 'no-store',
    mode: 'cors',
  });
  console.log('[footballApi] Response status', response.status, path);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football-Data API ${response.status}: ${text}`);
  }
  const data = await response.json();
  console.log('[footballApi] Data parsed', path, data);
  return data;
}

export async function fetchFifaLiveMatches() {
  const data = await fetchFootballData('/competitions/WC/matches?status=LIVE');
  return (data.matches || []).map(normalizeFifaMatch);
}

export async function fetchFifaMatchesByDateRange(dateFrom, dateTo) {
  const from = formatDate(dateFrom);
  const to = formatDate(dateTo);
  const data = await fetchFootballData(`/competitions/WC/matches?dateFrom=${from}&dateTo=${to}`);
  return (data.matches || []).map(normalizeFifaMatch);
}

export async function fetchFifaStandings() {
  const data = await fetchFootballData('/competitions/WC/standings');
  const table = Array.isArray(data.standings) ? data.standings.find(s => s.type === 'TOTAL') : null;
  if (!table || !Array.isArray(table.table)) {
    throw new Error('Invalid standings payload from Football-Data.org');
  }
  return table.table.map(entry => ({
    position: entry.position,
    team: entry.team.name,
    playedGames: entry.playedGames,
    won: entry.won,
    draw: entry.draw,
    lost: entry.lost,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,
    points: entry.points,
    teamId: entry.team.id,
    crestUrl: entry.team.crestUrl,
  }));
}

export async function fetchFifaKnockoutMatches() {
  const stages = ['ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];
  const results = [];
  for (const stage of stages) {
    const data = await fetchFootballData(`/competitions/WC/matches?stage=${stage}`);
    const matches = (data.matches || []).map(normalizeFifaMatch);
    results.push(...matches);
  }
  return results;
}

function buildForm(matches, teamId) {
  return (matches || []).slice(-5).map(match => {
    const isHome = match.homeTeam?.id === teamId;
    const teamScore = Number(isHome ? match.score?.fullTime?.home : match.score?.fullTime?.away);
    const opponentScore = Number(isHome ? match.score?.fullTime?.away : match.score?.fullTime?.home);
    if (Number.isNaN(teamScore) || Number.isNaN(opponentScore)) return 'D';
    if (teamScore > opponentScore) return 'W';
    if (teamScore < opponentScore) return 'L';
    return 'D';
  });
}

export async function fetchTeamStats(teamId) {
  if (!teamId) throw new Error('Team ID is required for team stats');
  const team = await fetchFootballData(`/teams/${teamId}`);
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 60);
  const matchData = await fetchFootballData(`/teams/${teamId}/matches?status=FINISHED&dateFrom=${formatDate(fromDate)}&dateTo=${formatDate(today)}`);
  const finished = Array.isArray(matchData.matches) ? matchData.matches : [];

  const lastFive = finished.slice(-5).map(m => ({
    id: m.id,
    date: m.utcDate,
    competition: m.competition?.name,
    home: m.homeTeam?.name,
    away: m.awayTeam?.name,
    scoreHome: m.score?.fullTime?.home,
    scoreAway: m.score?.fullTime?.away,
  }));

  const goals = finished.reduce((acc, m) => {
    const isHome = m.homeTeam?.id === teamId;
    const gf = Number(isHome ? m.score?.fullTime?.home : m.score?.fullTime?.away) || 0;
    const ga = Number(isHome ? m.score?.fullTime?.away : m.score?.fullTime?.home) || 0;
    return { goalsFor: acc.goalsFor + gf, goalsAgainst: acc.goalsAgainst + ga };
  }, { goalsFor: 0, goalsAgainst: 0 });

  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    tla: team.tla,
    venue: team.venue,
    founded: team.founded,
    country: team.area?.name,
    crestUrl: team.crestUrl,
    lastFive: lastFive,
    recentForm: buildForm(finished, teamId),
    averageGoalsFor: finished.length ? (goals.goalsFor / finished.length).toFixed(1) : '0.0',
    averageGoalsAgainst: finished.length ? (goals.goalsAgainst / finished.length).toFixed(1) : '0.0',
    recentMatches: lastFive,
  };
}
