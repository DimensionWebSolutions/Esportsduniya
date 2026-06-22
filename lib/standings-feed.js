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

export async function fetchStandingsForLeague(league, { footballClient, tsdClient } = {}) {
  if (league === 'football' && footballClient) {
    return fetchFootballDataStandings(footballClient, 'PL');
  }
  if (league === 'f1') {
    return fetchF1DriverStandings();
  }
  if (league === 'nba' && tsdClient) {
    return fetchNbaStandingsFromTsd(tsdClient);
  }
  return null;
}

export const STANDINGS_SUPPORTED = new Set(['football', 'f1', 'nba']);
