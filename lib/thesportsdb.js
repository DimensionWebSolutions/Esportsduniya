/**
 * TheSportsDB v1 (free plan) — schedules & scores via eventsday.php
 * @see https://www.thesportsdb.com/free_sports_api
 */
import { sportIcon } from './sports-registry.js';

/** App sport id → TheSportsDB strSport (exact spelling) */
export const SPORT_TO_TSD = {
  nba: 'Basketball',
  basketball: 'Basketball',
  f1: 'Motorsport',
  baseball: 'Baseball',
  hockey: 'Ice Hockey',
  handball: 'Handball',
  volleyball: 'Volleyball',
  rugby: 'Rugby',
  mma: 'Fighting',
  nfl: 'American Football',
  afl: 'Australian Football',
  tennis: 'Tennis',
};

export const THESPORTSDB_SPORT_IDS = Object.keys(SPORT_TO_TSD);

const LIVE_STATUS = new Set([
  '1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', 'LIVE ET',
  'Q1', 'Q2', 'Q3', 'Q4', 'OT',
  'P1', 'P2', 'P3', 'PT',
  'IN1', 'IN2', 'IN3', 'IN4', 'IN5', 'IN6', 'IN7', 'IN8', 'IN9',
  'S1', 'S2', 'S3', 'S4', 'S5',
  '1Q', '2Q', '3Q', '4Q',
]);

const FINISHED_STATUS = new Set([
  'FT', 'AET', 'PEN', 'AOT', 'AP', 'CANC', 'ABD', 'AWD', 'WO', 'POST', 'PST',
  'INTR', 'SUSP', 'AW', 'FINAL',
]);

export function isTheSportsDbSport(sportId) {
  return THESPORTSDB_SPORT_IDS.includes(sportId);
}

export function createTheSportsDbClient(apiKey = '123') {
  const key = apiKey || '123';
  const baseUrl = `https://www.thesportsdb.com/api/v1/json/${key}`;

  async function fetchPath(path) {
    const url = `${baseUrl}/${path.replace(/^\//, '')}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TheSportsDB HTTP ${response.status}`);
    }
    return response.json();
  }

  return { fetchPath, apiKey: key };
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatKickoff(dateEvent, strTime) {
  if (!dateEvent) return '';
  const time = strTime ? strTime.slice(0, 5) : '';
  if (time) return time;
  return new Date(`${dateEvent}T12:00:00Z`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseEventStatus(event) {
  const status = String(event.strStatus || '').trim().toUpperCase();
  const postponed = event.strPostponed === 'yes';

  if (status && LIVE_STATUS.has(status)) return 'live';
  if (status && FINISHED_STATUS.has(status)) return 'finished';
  if (postponed) return 'upcoming';

  if (status === 'NS' || status === 'TBD' || !status) {
    const kickoff = event.strTimestamp ? new Date(event.strTimestamp).getTime() : NaN;
    if (!Number.isNaN(kickoff) && kickoff <= Date.now()) {
      const hasScore = event.intHomeScore != null && event.intHomeScore !== ''
        && event.intAwayScore != null && event.intAwayScore !== '';
      if (hasScore) return 'live';
    }
    return 'upcoming';
  }

  if (/^\d/.test(status) || status.includes("'") || status.includes(':')) return 'live';
  return 'finished';
}

function scoreMomentum(home, away) {
  const h = Number(home) || 0;
  const a = Number(away) || 0;
  return Math.max(10, Math.min(90, 50 + (h - a) * 8));
}

export function normalizeTheSportsDbEvent(event, sportId) {
  const icon = sportIcon(sportId);
  const status = parseEventStatus(event);
  const homeScore = event.intHomeScore != null && event.intHomeScore !== '' ? String(event.intHomeScore) : '-';
  const awayScore = event.intAwayScore != null && event.intAwayScore !== '' ? String(event.intAwayScore) : '-';

  return {
    id: event.idEvent,
    sport: sportId,
    league: event.strLeague || SPORT_TO_TSD[sportId] || 'Sport',
    status,
    teamA: {
      name: event.strHomeTeam || 'Home',
      flag: icon,
      score: homeScore,
      logo: event.strHomeTeamBadge || null,
    },
    teamB: {
      name: event.strAwayTeam || 'Away',
      flag: icon,
      score: awayScore,
      logo: event.strAwayTeamBadge || null,
    },
    momentum: scoreMomentum(event.intHomeScore, event.intAwayScore),
    venue: [event.strVenue, event.strCity, event.strCountry].filter(Boolean).join(', ') || '',
    minute: status === 'live'
      ? (event.strStatus || 'Live')
      : status === 'upcoming'
        ? formatKickoff(event.dateEvent, event.strTime)
        : (event.strStatus || 'Final'),
    fixtureId: event.idEvent,
    source: 'thesportsdb',
    thumb: event.strThumb || null,
  };
}

function dedupeEvents(events) {
  const seen = new Set();
  const out = [];
  for (const ev of events) {
    if (ev?.idEvent && !seen.has(ev.idEvent)) {
      seen.add(ev.idEvent);
      out.push(ev);
    }
  }
  return out;
}

export async function fetchTheSportsDbSportEvents(sportId, client, today) {
  const tsdSport = SPORT_TO_TSD[sportId];
  if (!tsdSport) throw new Error(`Unsupported sport: ${sportId}`);

  const dates = [today, addDays(today, 1)];
  const chunks = await Promise.all(
    dates.map(d => client.fetchPath(`eventsday.php?d=${d}&s=${encodeURIComponent(tsdSport)}`)),
  );

  const events = dedupeEvents(chunks.flatMap(c => c.events || []));
  return events.map(ev => normalizeTheSportsDbEvent(ev, sportId));
}

export async function fetchTheSportsDbUpcoming(sportId, client, today, limit = 10) {
  const matches = await fetchTheSportsDbSportEvents(sportId, client, today);
  return matches.filter(m => m.status === 'upcoming').slice(0, limit);
}

export async function lookupEvent(client, eventId) {
  const data = await client.fetchPath(`lookupevent.php?id=${eventId}`);
  return data.events?.[0] || null;
}
