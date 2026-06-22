/**
 * football-data.org v4 — free tier (10 req/min, major leagues).
 * @see https://www.football-data.org/documentation/quickstart
 */
import { sportIcon } from './sports-registry.js';

const API_BASE = 'https://api.football-data.org/v4';

/** API-Sports numeric league id → football-data competition code */
export const LEAGUE_ID_TO_COMPETITION = {
  39: 'PL',
  140: 'PD',
  78: 'BL1',
  135: 'SA',
  61: 'FL1',
  2: 'CL',
};

export function createFootballDataClient(apiKey) {
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_KEY not configured');
  }

  async function fetchPath(path) {
    const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Football-Data ${response.status}: ${text.slice(0, 200)}`);
    }
    return response.json();
  }

  return { fetchPath };
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getStatus(status) {
  if (['LIVE', 'IN_PLAY', 'PAUSED'].includes(status)) return 'live';
  if (['FINISHED', 'AWARDED', 'SUSPENDED', 'INTERRUPTED'].includes(status)) return 'finished';
  return 'upcoming';
}

function scoreMomentum(home, away) {
  const h = Number(home) || 0;
  const a = Number(away) || 0;
  return Math.max(10, Math.min(90, 50 + (h - a) * 8));
}

export function normalizeFootballDataMatch(match) {
  const home = match.homeTeam || {};
  const away = match.awayTeam || {};
  const score = match.score || {};
  const fullTime = score.fullTime || {};
  const status = getStatus(match.status);
  const scoreHome = fullTime.home !== null && fullTime.home !== undefined ? String(fullTime.home) : '-';
  const scoreAway = fullTime.away !== null && fullTime.away !== undefined ? String(fullTime.away) : '-';
  const kickoff = match.utcDate ? new Date(match.utcDate) : null;

  return {
    id: match.id,
    sport: 'football',
    league: match.competition?.name || 'Football',
    status,
    teamA: {
      name: home.shortName || home.name || 'Home',
      flag: sportIcon('football'),
      score: scoreHome,
      logo: home.crest || null,
    },
    teamB: {
      name: away.shortName || away.name || 'Away',
      flag: sportIcon('football'),
      score: scoreAway,
      logo: away.crest || null,
    },
    momentum: scoreMomentum(fullTime.home, fullTime.away),
    venue: match.venue || '',
    minute: status === 'live'
      ? (match.minute != null ? `${match.minute}'` : 'LIVE')
      : status === 'upcoming' && kickoff
        ? kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'FT',
    fixtureId: match.id,
    source: 'football-data',
  };
}

export async function fetchFootballDataMatches(client, today) {
  const end = addDays(today, 1);
  const data = await client.fetchPath(`/matches?dateFrom=${today}&dateTo=${end}`);
  return (data.matches || []).map(normalizeFootballDataMatch);
}

export async function fetchFootballDataUpcoming(client, limit = 10) {
  const today = new Date().toISOString().slice(0, 10);
  const end = addDays(today, 7);
  const data = await client.fetchPath(`/matches?dateFrom=${today}&dateTo=${end}`);
  return (data.matches || [])
    .filter(m => getStatus(m.status) === 'upcoming')
    .slice(0, limit)
    .map(normalizeFootballDataMatch);
}

export async function fetchFootballDataStandings(client, competition = 'PL') {
  const data = await client.fetchPath(`/competitions/${competition}/standings`);
  const table = Array.isArray(data.standings)
    ? data.standings.find(s => s.type === 'TOTAL')?.table
    : null;
  if (!Array.isArray(table)) return [];
  return table.map(row => ({
    team: row.team?.name || 'Unknown',
    wins: row.won ?? 0,
    losses: row.lost ?? 0,
    draws: row.draw ?? 0,
    points: row.points ?? 0,
  }));
}

export async function fetchFootballDataMatch(client, matchId) {
  return client.fetchPath(`/matches/${matchId}`);
}

export async function fetchFootballDataLeagueMatches(client, leagueId, limit = 10) {
  const code = LEAGUE_ID_TO_COMPETITION[leagueId] || leagueId;
  const data = await client.fetchPath(`/competitions/${code}/matches?status=SCHEDULED`);
  return (data.matches || []).slice(0, limit).map(normalizeFootballDataMatch);
}

export function footballDataMatchToTimeline(match) {
  const home = match.homeTeam?.name || 'Home';
  const away = match.awayTeam?.name || 'Away';
  const ft = match.score?.fullTime || {};
  const events = [];

  if (match.status) {
    events.push({
      time: { elapsed: match.minute ?? null },
      type: match.status,
      detail: match.status,
      player: { name: '' },
    });
  }

  if (ft.home != null && ft.away != null) {
    events.push({
      time: { elapsed: 90 },
      type: 'FT',
      detail: `${home} ${ft.home} - ${ft.away} ${away}`,
      player: { name: '' },
    });
  }

  return events;
}
