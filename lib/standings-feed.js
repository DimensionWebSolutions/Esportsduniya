/**
 * Standings from free APIs — football-data.org, Jolpica F1, TheSportsDB NBA.
 */
import { fetchFootballDataStandings } from './football-data.js';

const F1_STANDINGS_URL = 'https://api.jolpi.ca/ergast/f1/current/driverStandings.json';

export async function fetchF1DriverStandings() {
  const res = await fetch(F1_STANDINGS_URL);
  if (!res.ok) throw new Error(`F1 standings HTTP ${res.status}`);
  const data = await res.json();
  const rows = data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  return rows.map(row => {
    const driver = row.Driver || {};
    const name = [driver.givenName, driver.familyName].filter(Boolean).join(' ') || 'Driver';
    return {
      team: name,
      wins: Number(row.wins) || 0,
      losses: 0,
      draws: 0,
      points: Number(row.points) || 0,
    };
  });
}

export async function fetchNbaStandingsFromTsd(client) {
  const data = await client.fetchPath('lookuptable.php?l=4387&s=2024-2025');
  const rows = data.table || [];
  return rows.map(row => ({
    team: row.strTeam || 'Unknown',
    wins: Number(row.intWin) || 0,
    losses: Number(row.intLoss) || 0,
    draws: 0,
    points: Number(row.intPoints) || 0,
  }));
}

async function fetchCricketStandingsFromCricapi(apiKey) {
  const seriesRes = await fetch(`https://api.cricapi.com/v1/series?apikey=${apiKey}&offset=0`);
  if (!seriesRes.ok) throw new Error(`CricAPI series HTTP ${seriesRes.status}`);
  const seriesData = await seriesRes.json();
  const seriesList = seriesData.data || [];
  const target = seriesList.find(s => /ipl|indian premier/i.test(s.name || ''))
    || seriesList.find(s => /world cup|t20|odi|test/i.test(s.name || ''))
    || seriesList[0];
  if (!target?.id) return [];

  const infoRes = await fetch(`https://api.cricapi.com/v1/series_info?apikey=${apiKey}&id=${target.id}`);
  if (!infoRes.ok) throw new Error(`CricAPI series_info HTTP ${infoRes.status}`);
  const infoData = await infoRes.json();
  const info = infoData.data || {};

  const points = info.pointsTable || info.pointTable || info.standings || [];
  if (Array.isArray(points) && points.length) {
    return points.map(row => ({
      team: row.team || row.teamName || row.name || 'Team',
      wins: Number(row.wins ?? row.w ?? row.W) || 0,
      losses: Number(row.losses ?? row.l ?? row.L) || 0,
      draws: Number(row.draws ?? row.nr ?? row.tied ?? 0) || 0,
      points: Number(row.points ?? row.pts ?? row.Pts) || 0,
    }));
  }

  const teams = info.teams || info.teamInfo || [];
  if (Array.isArray(teams) && teams.length) {
    return teams.map(t => ({
      team: t.name || t.teamName || t.shortname || 'Team',
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
    }));
  }
  return [];
}

export async function fetchStandingsForLeague(league, { footballClient, tsdClient, cricapiKey } = {}) {
  if (league === 'football' && footballClient) {
    return fetchFootballDataStandings(footballClient, 'PL');
  }
  if (league === 'f1') {
    return fetchF1DriverStandings();
  }
  if (league === 'nba' && tsdClient) {
    return fetchNbaStandingsFromTsd(tsdClient);
  }
  if (league === 'cricket' && cricapiKey) {
    return fetchCricketStandingsFromCricapi(cricapiKey);
  }
  return null;
}

export const STANDINGS_SUPPORTED = new Set(['football', 'f1', 'nba', 'cricket']);
