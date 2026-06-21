/**
 * API-Sports unified client — one APISPORTS_KEY for all sports on the dashboard.
 * @see https://dashboard.api-football.com (API-Sports)
 */
import { APISPORTS_SPORT_IDS, sportIcon } from './sports-registry.js';

/** API config key (may differ from frontend sport id, e.g. f1 → formula1) */
export const APISPORTS_CONFIG = {
  football: {
    host: 'v3.football.api-sports.io',
    baseUrl: 'https://v3.football.api-sports.io',
    kind: 'fixtures',
  },
  nba: {
    host: 'v2.nba.api-sports.io',
    baseUrl: 'https://v2.nba.api-sports.io',
    kind: 'games',
  },
  basketball: {
    host: 'v1.basketball.api-sports.io',
    baseUrl: 'https://v1.basketball.api-sports.io',
    kind: 'games',
  },
  tennis: {
    host: 'v1.tennis.api-sports.io',
    baseUrl: 'https://v1.tennis.api-sports.io',
    kind: 'games',
  },
  f1: {
    host: 'v1.formula-1.api-sports.io',
    baseUrl: 'https://v1.formula-1.api-sports.io',
    kind: 'races',
  },
  baseball: {
    host: 'v1.baseball.api-sports.io',
    baseUrl: 'https://v1.baseball.api-sports.io',
    kind: 'games',
  },
  hockey: {
    host: 'v1.hockey.api-sports.io',
    baseUrl: 'https://v1.hockey.api-sports.io',
    kind: 'games',
  },
  handball: {
    host: 'v1.handball.api-sports.io',
    baseUrl: 'https://v1.handball.api-sports.io',
    kind: 'games',
  },
  volleyball: {
    host: 'v1.volleyball.api-sports.io',
    baseUrl: 'https://v1.volleyball.api-sports.io',
    kind: 'games',
  },
  rugby: {
    host: 'v1.rugby.api-sports.io',
    baseUrl: 'https://v1.rugby.api-sports.io',
    kind: 'games',
  },
  mma: {
    host: 'v1.mma.api-sports.io',
    baseUrl: 'https://v1.mma.api-sports.io',
    kind: 'fights',
  },
  nfl: {
    host: 'v1.american-football.api-sports.io',
    baseUrl: 'https://v1.american-football.api-sports.io',
    kind: 'games',
  },
  afl: {
    host: 'v1.afl.api-sports.io',
    baseUrl: 'https://v1.afl.api-sports.io',
    kind: 'games',
  },
};

const LIVE_STATUS = new Set([
  '1H', '2H', 'HT', 'ET', 'BT', 'LIVE', 'LIVE ET',
  'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'HT',
  'P1', 'P2', 'P3', 'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9',
  'SET1', 'SET2', 'SET3', 'SET4', 'SET5',
  '1Q', '2Q', '3Q', '4Q',
]);

const FINISHED_STATUS = new Set([
  'FT', 'AET', 'PEN', 'AOT', 'Finished', 'CANC', 'ABD', 'AWD', 'WO', 'POST', 'INT',
]);

export function assertSportsApiPayload(data) {
  if (!data?.errors) return;
  const entries = Object.entries(data.errors).filter(([, v]) => v);
  if (!entries.length) return;
  throw new Error(entries.map(([k, v]) => `${k}: ${v}`).join('; '));
}

export function createApisportsClient({ apisportsKey, rapidKey, hasApisports, hasRapidAPI }) {
  function getHeaders(sportId) {
    const config = APISPORTS_CONFIG[sportId];
    if (!config) throw new Error(`Unknown API-Sports sport: ${sportId}`);
    if (hasApisports) {
      return { 'x-apisports-key': apisportsKey };
    }
    if (hasRapidAPI) {
      return {
        'x-rapidapi-key': rapidKey,
        'x-rapidapi-host': config.host,
      };
    }
    throw new Error('API-Sports not configured — set APISPORTS_KEY on the server');
  }

  async function fetchApi(sportId, endpoint) {
    const config = APISPORTS_CONFIG[sportId];
    const url = `${config.baseUrl}${endpoint}`;
    const response = await fetch(url, { headers: getHeaders(sportId) });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 403) {
        throw new Error(`Access denied (403) for ${sportId}. Check APISPORTS_KEY and subscription.`);
      }
      throw new Error(`API-Sports ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    assertSportsApiPayload(data);
    return data;
  }

  return { fetchApi, getHeaders };
}

function getMatchStatus(shortStatus, longStatus) {
  const short = String(shortStatus || '').toUpperCase();
  const long = String(longStatus || '').toLowerCase();
  if (LIVE_STATUS.has(short) || long.includes('live') || long.includes('progress')) return 'live';
  if (FINISHED_STATUS.has(short) || long.includes('finished') || long.includes('final')) return 'finished';
  return 'upcoming';
}

function scoreMomentum(home, away) {
  const h = Number(home) || 0;
  const a = Number(away) || 0;
  return Math.max(10, Math.min(90, 50 + (h - a) * 8));
}

export function normalizeFootballFixture(fixture) {
  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const league = fixture.league;
  return {
    id: f.id,
    sport: 'football',
    league: league?.name || 'Football',
    status: getMatchStatus(f.status?.short, f.status?.long),
    teamA: {
      name: teams.home.name,
      flag: sportIcon('football'),
      score: goals.home !== null && goals.home !== undefined ? String(goals.home) : '-',
      logo: teams.home.logo,
    },
    teamB: {
      name: teams.away.name,
      flag: sportIcon('football'),
      score: goals.away !== null && goals.away !== undefined ? String(goals.away) : '-',
      logo: teams.away.logo,
    },
    momentum: scoreMomentum(goals.home, goals.away),
    venue: f.venue?.name || league?.name || '',
    minute: f.status?.elapsed ? `${f.status.elapsed}'` : (f.status?.short === 'NS' ? formatKickoff(f.date) : (f.status?.long || '')),
    fixtureId: f.id,
    source: 'api-sports',
  };
}

function formatKickoff(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function normalizeGame(sportId, game) {
  const icon = sportIcon(sportId);
  const status = getMatchStatus(game.status?.short, game.status?.long);
  const homeScore = game.scores?.home?.total ?? game.scores?.home?.score ?? game.goals?.home;
  const awayScore = game.scores?.away?.total ?? game.scores?.away?.score ?? game.goals?.away;

  return {
    id: game.id,
    sport: sportId,
    league: game.league?.name || game.country?.name || sportId.toUpperCase(),
    status,
    teamA: {
      name: game.teams?.home?.name || 'Home',
      flag: icon,
      score: homeScore != null && homeScore !== '' ? String(homeScore) : '-',
      logo: game.teams?.home?.logo,
    },
    teamB: {
      name: game.teams?.away?.name || 'Away',
      flag: icon,
      score: awayScore != null && awayScore !== '' ? String(awayScore) : '-',
      logo: game.teams?.away?.logo,
    },
    momentum: scoreMomentum(homeScore, awayScore),
    venue: game.arena?.name || game.venue?.name || game.country?.name || '',
    minute: status === 'upcoming' ? formatKickoff(game.date) : (game.status?.long || game.status?.short || ''),
    fixtureId: game.id,
    source: 'api-sports',
  };
}

export function normalizeTennisGame(game) {
  const m = normalizeGame('tennis', game);
  m.teamA.score = game.scores?.home?.score ?? game.scores?.home?.total ?? m.teamA.score;
  m.teamB.score = game.scores?.away?.score ?? game.scores?.away?.total ?? m.teamB.score;
  return m;
}

export function normalizeF1Race(race) {
  const results = Array.isArray(race.results) ? race.results : [];
  const isLive = race.status && !['Scheduled', 'Completed'].includes(race.status);
  const isFinished = race.status === 'Completed';
  return {
    id: race.id,
    sport: 'f1',
    league: race.competition?.name || 'Formula 1',
    status: isFinished ? 'finished' : (isLive ? 'live' : 'upcoming'),
    teamA: {
      name: results[0]?.driver?.name || race.circuit?.name || 'Grand Prix',
      flag: sportIcon('f1'),
      score: results[0]?.position != null ? `P${results[0].position}` : '-',
    },
    teamB: {
      name: results[1]?.driver?.name || race.circuit?.city || 'Race',
      flag: sportIcon('f1'),
      score: results[1]?.position != null ? `P${results[1].position}` : '-',
    },
    momentum: 50,
    venue: race.circuit?.name || race.circuit?.city || '',
    minute: race.status || formatKickoff(race.date),
    source: 'api-sports',
  };
}

export function normalizeMmaFight(fight) {
  const status = getMatchStatus(fight.status?.short, fight.status?.long);
  const first = fight.fighters?.first || fight.fighters?.home;
  const second = fight.fighters?.second || fight.fighters?.away;
  return {
    id: fight.id,
    sport: 'mma',
    league: fight.category || fight.slug || 'MMA',
    status,
    teamA: {
      name: first?.name || 'Fighter A',
      flag: sportIcon('mma'),
      score: fight.winner?.id === first?.id ? 'W' : '-',
    },
    teamB: {
      name: second?.name || 'Fighter B',
      flag: sportIcon('mma'),
      score: fight.winner?.id === second?.id ? 'W' : '-',
    },
    momentum: 50,
    venue: fight.arena?.name || fight.country?.name || '',
    minute: status === 'upcoming' ? formatKickoff(fight.date) : (fight.status?.long || ''),
    source: 'api-sports',
  };
}

function dedupeById(items, idFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const id = idFn(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(item);
    }
  }
  return out;
}

export async function fetchApisportsLiveMatches(sportId, client, today) {
  const config = APISPORTS_CONFIG[sportId];
  if (!config) throw new Error(`Unsupported sport: ${sportId}`);

  const { fetchApi } = client;

  if (config.kind === 'fixtures') {
    const [liveData, todayData] = await Promise.all([
      fetchApi(sportId, '/fixtures?live=all'),
      fetchApi(sportId, `/fixtures?date=${today}`),
    ]);
    const fixtures = dedupeById(
      [...(liveData.response || []), ...(todayData.response || [])],
      f => f?.fixture?.id,
    );
    return fixtures.map(normalizeFootballFixture);
  }

  if (config.kind === 'games') {
    const [liveData, todayData] = await Promise.all([
      fetchApi(sportId, '/games?live=all'),
      fetchApi(sportId, `/games?date=${today}`),
    ]);
    const games = dedupeById(
      [...(liveData.response || []), ...(todayData.response || [])],
      g => g?.id,
    );
    const normalizer = sportId === 'tennis' ? normalizeTennisGame : (g) => normalizeGame(sportId, g);
    return games.map(normalizer);
  }

  if (config.kind === 'fights') {
    const data = await fetchApi(sportId, `/fights?date=${today}`);
    return (data.response || []).map(normalizeMmaFight);
  }

  if (config.kind === 'races') {
    const season = new Date().getFullYear();
    const [current, seasonData] = await Promise.all([
      fetchApi(sportId, '/races?current=true').catch(() => ({ response: [] })),
      fetchApi(sportId, `/races?season=${season}&type=Race`),
    ]);
    const races = dedupeById(
      [...(current.response || []), ...(seasonData.response || [])],
      r => r?.id,
    );
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    return races
      .filter(r => {
        const t = new Date(r.date).getTime();
        return Math.abs(t - now) < weekMs || r.status === 'Live' || r.status === 'In Progress';
      })
      .map(normalizeF1Race);
  }

  return [];
}

export function isApisportsSport(sportId) {
  return APISPORTS_SPORT_IDS.includes(sportId);
}

export { APISPORTS_SPORT_IDS };
