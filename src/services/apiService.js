export async function fetchStandings(league) {
    if (!apiAvailable) {
        throw new Error('Sports standings API service is unavailable.');
    }
    try {
        const res = await fetch(`${API_BASE}/api/sports/standings/${league}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`[apiService] Standings fetch failed for ${league}:`, err);
        throw err;
    }
}
/* ============================================
   ESPORTSDUNIYA — API Service Layer
   ============================================
   Fetches from the backend proxy (/api/*).
   PRIMARY: football-data.org (football) + TheSportsDB (other sports) + CricAPI (cricket)
   FALLBACK: Last-known-good server snapshot
   AI (Gemini): Optional — match commentary/momentum only, NOT live scores
   ============================================ */

import { getWebSocketUrl } from './webSocketUrl.js';
import { API_BASE, apiUrl } from '../config/apiBase.js';

export { API_BASE, apiUrl };

let apiAvailable = null;
let aiScoresAvailable = false;
let rapidApiAvailable = false;
let cricApiAvailable = false;

/** Metadata from the last fetchLiveMatches call — for Dashboard status bar */
let lastLiveMeta = {
    source: null,
    fetchedAt: null,
    stale: false,
    error: null,
    matchCount: 0,
};

function timeoutSignal(ms) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
    }
    if (typeof AbortController === 'undefined') return undefined;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

export function getLiveScoresMeta() {
    return {
        fetchedAt: lastLiveMeta.fetchedAt,
        stale: lastLiveMeta.stale,
        matchCount: lastLiveMeta.matchCount,
        error: userFacingScoreError(lastLiveMeta.error),
    };
}

function userFacingScoreError(err) {
    if (!err) return null;
    if (/gemini|429|quota|generativelanguage|ai-search/i.test(String(err))) return null;
    if (/key not configured|apisports|football.data|cricapi|thesportsdb|unavailable/i.test(String(err))) {
        return 'scores_unavailable';
    }
    return 'scores_unavailable';
}

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

/**
 * Check if the backend API server is running and has keys configured
 */
export async function checkApiHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health?t=${Date.now()}`, {
            cache: 'no-store',
            signal: timeoutSignal(15000),
        });
        const data = await res.json();
        apiAvailable = data.status === 'ok';
        aiScoresAvailable = data.apis?.aiScores === 'configured';
        rapidApiAvailable = data.apis?.football === 'configured';
        cricApiAvailable = data.apis?.cricapi === 'configured';
        console.log('🔌 API Server:', apiAvailable ? 'Connected' : 'Unavailable');
        console.log('   🏏 CricAPI:', cricApiAvailable ? 'Enabled' : 'Not configured');
        console.log('   ⚽ Football-Data:', rapidApiAvailable ? 'Enabled' : 'Not configured');
        console.log('   🏟️ TheSportsDB: free v1 (server-side)');
        return data;
    } catch (err) {
        apiAvailable = false;
        aiScoresAvailable = false;
        rapidApiAvailable = false;
        cricApiAvailable = false;
        console.log('🔌 API Server: Unavailable');
        return null;
    }
}

// ============================================
// DATA NORMALIZERS (for upcoming / legacy routes)
// ============================================

function getStatus(shortStatus) {
    const live = ['1H', '2H', 'HT', 'ET', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'LIVE'];
    if (live.includes(shortStatus)) return 'live';
    if (['FT', 'AET', 'PEN', 'AOT', 'Finished'].includes(shortStatus)) return 'finished';
    return 'upcoming';
}

function normalizeFootballMatch(fixture) {
    const f = fixture.fixture;
    const teams = fixture.teams;
    const goals = fixture.goals;
    const league = fixture.league;

    return {
        id: f.id,
        sport: 'football',
        league: league.name,
        status: getStatus(f.status.short),
        teamA: {
            name: teams.home.name,
            flag: '⚽',
            score: goals.home !== null ? String(goals.home) : '-',
            logo: teams.home.logo,
        },
        teamB: {
            name: teams.away.name,
            flag: '⚽',
            score: goals.away !== null ? String(goals.away) : '-',
            logo: teams.away.logo,
        },
        momentum: 50 + (((goals.home || 0) - (goals.away || 0)) * 10),
        venue: f.venue?.name || league.name,
        minute: f.status.elapsed ? `${f.status.elapsed}'` : (f.status.short === 'NS' ? new Date(f.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : f.status.long),
        fixtureId: f.id,
        source: 'api-football',
    };
}

function normalizeNBAMatch(game) {
    return {
        id: game.id,
        sport: 'nba',
        league: 'NBA',
        status: getStatus(game.status.short),
        teamA: {
            name: game.teams.home.name,
            flag: '🏀',
            score: game.scores?.home?.total != null ? String(game.scores.home.total) : '-',
            logo: game.teams.home.logo,
        },
        teamB: {
            name: game.teams.away.name,
            flag: '🏀',
            score: game.scores?.away?.total != null ? String(game.scores.away.total) : '-',
            logo: game.teams.away.logo,
        },
        momentum: 50,
        venue: game.arena?.name || 'NBA Arena',
        minute: game.status.short === 'NS' ? new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (game.status.long || ''),
        source: 'api-football',
    };
}

function normalizeTennisMatch(game) {
    return {
        id: game.id,
        sport: 'tennis',
        league: game.league?.name || 'ATP',
        status: getStatus(game.status?.short),
        teamA: {
            name: game.teams?.home?.name || 'Player 1',
            flag: '🎾',
            score: game.scores?.home?.score || '-',
        },
        teamB: {
            name: game.teams?.away?.name || 'Player 2',
            flag: '🎾',
            score: game.scores?.away?.score || '-',
        },
        momentum: 50,
        venue: 'Court',
        minute: game.status?.short === 'NS' ? new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        source: 'api-football',
    };
}

function normalizeF1Race(race) {
    let teamA = { name: 'Grand Prix', flag: '🏁', score: '' };
    let teamB = { name: 'Track', flag: '🏎️', score: '' };
    if (race.results && Array.isArray(race.results) && race.results.length >= 2) {
        teamA = { name: race.results[0].driver?.name || 'Driver 1', flag: '🏁', score: race.results[0].position || '1' };
        teamB = { name: race.results[1].driver?.name || 'Driver 2', flag: '🏁', score: race.results[1].position || '2' };
    }
    return {
        id: race.id,
        sport: 'f1',
        league: 'Formula 1',
        status: race.status === 'Scheduled' ? 'upcoming' : 'live',
        teamA,
        teamB,
        momentum: 50,
        venue: race.circuit?.city || '',
        minute: new Date(race.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(race.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'api-football',
    };
}

function normalizeCricketMatch(game) {
    const isLive = game.matchStarted && !game.matchEnded;
    const isUpcoming = !game.matchStarted;

    return {
        id: game.id,
        sport: 'cricket',
        league: game.name || game.series_id || 'Cricket',
        status: isLive ? 'live' : (isUpcoming ? 'upcoming' : 'finished'),
        teamA: {
            name: game.teamInfo?.[0]?.shortname || game.teamInfo?.[0]?.name || 'Team A',
            flag: '🏏',
            score: game.score?.[0]?.r ? `${game.score[0].r}/${game.score[0].w}` : '-',
        },
        teamB: {
            name: game.teamInfo?.[1]?.shortname || game.teamInfo?.[1]?.name || 'Team B',
            flag: '🏏',
            score: game.score?.[1]?.r ? `${game.score[1].r}/${game.score[1].w}` : '-',
        },
        momentum: 50,
        venue: game.venue || 'Cricket Ground',
        minute: isUpcoming ? new Date(game.dateTimeGMT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (game.status || ''),
        source: 'cricapi',
    };
}

async function fetchInternal(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.response || data.matches || [];
}

function adoptMatches(items, normalizer) {
    if (!Array.isArray(items) || !items.length) return [];
    if (items[0]?.teamA && items[0]?.teamB) return items;
    return items.map(normalizer);
}

function sanitizeScoreError(err) {
    if (!err) return null;
    if (/gemini|429|quota|generativelanguage|ai-search/i.test(String(err))) return null;
    if (/key not configured|apisports|football.data|cricapi|thesportsdb/i.test(String(err))) return null;
    return null;
}

/**
 * Fetch live matches via unified backend endpoint.
 * All sports: football-data.org (football) + TheSportsDB (others) + CricAPI (cricket).
 */
export async function fetchLiveMatches(sport = 'all', options = {}) {
    if (apiAvailable === null) {
        await checkApiHealth();
    }

    const refreshParam = options.forceRefresh ? '&refresh=1' : '';
    const url = `${API_BASE}/api/sports/live/${sport}?t=${Date.now()}${refreshParam}`;
    const timeoutMs = sport === 'all' ? 120_000 : 45_000;

    let res;
    try {
        res = await fetch(url, { cache: 'no-store', signal: timeoutSignal(timeoutMs) });
    } catch (err) {
        lastLiveMeta = { source: null, fetchedAt: null, stale: false, error: err.message, matchCount: 0 };
        throw new Error('Could not reach scores server. Check your connection.');
    }

    const data = await res.json().catch(() => ({}));
    const matches = Array.isArray(data.matches) ? data.matches : [];

    lastLiveMeta = {
        source: data.source || null,
        fetchedAt: data.fetchedAt || null,
        stale: Boolean(data.stale),
        error: sanitizeScoreError(data.error || (!res.ok && !matches.length ? (data.error || `HTTP ${res.status}`) : null)),
        matchCount: matches.length,
    };

    if (!res.ok && matches.length === 0) {
        const msg = sanitizeScoreError(data.error) || 'Could not load live scores. Please try again.';
        throw new Error(msg);
    }

    return matches.map(m => ({
        ...m,
        stale: m.stale ?? data.stale ?? false,
        fetchedAt: data.fetchedAt,
    }));
}

/**
 * Fetch Upcoming Matches (Schedule) for a specific sport
 */
export async function fetchUpcomingMatches(sport) {
    if (!apiAvailable) return [];

    let results = [];

    try {
        if (sport === 'all' || sport === 'football') {
            const data = await fetchInternal('/api/sports/football/upcoming');
            results.push(...adoptMatches(data, normalizeFootballMatch));
        }

        if (sport === 'all' || sport === 'nba') {
            const data = await fetchInternal('/api/sports/nba/upcoming');
            results.push(...adoptMatches(data, normalizeNBAMatch));
        }

        if (sport === 'all' || sport === 'tennis') {
            const data = await fetchInternal('/api/sports/tennis/upcoming');
            results.push(...adoptMatches(data, normalizeTennisMatch));
        }

        if (sport === 'all' || sport === 'f1') {
            const data = await fetchInternal('/api/sports/f1/upcoming');
            results.push(...adoptMatches(data, normalizeF1Race));
        }

        if (sport === 'all' || sport === 'cricket') {
            const data = await fetchInternal('/api/sports/cricket/upcoming');
            results.push(...adoptMatches(data, normalizeCricketMatch));
        }
    } catch (err) {
        console.warn('[apiService] Upcoming matches fetch failed:', err.message);
    }

    return results;
}

// ============================================
// AI NARRATIVES
// ============================================

export async function fetchAINarrative(matchContext, tone = 'hype') {
    if (!apiAvailable) {
        return { text: null, source: 'unavailable', unavailable: true };
    }
    try {
        const res = await authFetch(`${API_BASE}/api/ai/narrative`, {
            method: 'POST',
            body: JSON.stringify({ matchContext, tone }),
            signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        if (data.fallback || data.error || data.unavailable || !data.narrative) {
            return { text: null, source: 'unavailable', unavailable: true };
        }
        return { text: data.narrative, source: data.source || 'ai', provider: data.provider || 'unknown' };
    } catch (err) {
        console.error('AI narrative error:', err);
        return { text: null, source: 'unavailable', unavailable: true };
    }
}

export async function fetchPreGamePreview(matchContext) {
    if (!apiAvailable) {
        return { unavailable: true, source: 'unavailable' };
    }

    try {
        const res = await authFetch(`${API_BASE}/api/ai/preview`, {
            method: 'POST',
            body: JSON.stringify({ matchContext }),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.error || data.fallback) return { unavailable: true, source: 'unavailable' };
        return { ...data, source: 'ai' };
    } catch (err) {
        console.warn('[apiService] Pre-game preview fetch failed:', err.message);
        return { unavailable: true, source: 'unavailable' };
    }
}

export async function fetchMomentumAnalysis(matchContext, events) {
    if (!apiAvailable) return { unavailable: true, source: 'unavailable' };
    try {
        const res = await authFetch(`${API_BASE}/api/ai/momentum`, {
            method: 'POST',
            body: JSON.stringify({ matchContext, events }),
            signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        if (data.fallback || data.error || data.unavailable) return { unavailable: true, source: 'unavailable' };

        return {
            teamA: data.teamA,
            teamB: data.teamB,
            probA: data.probA,
            probB: data.probB,
            points: data.points || [],
            keyMoments: data.keyMoments || [],
            narrative: data.narrative || '',
            momentum_team: data.momentum_team || '',
            summary: data.summary || data.narrative || '',
            source: data.source || 'ai',
            provider: data.provider || 'unknown',
        };
    } catch (err) {
        console.error('AI momentum error:', err);
        return { unavailable: true, source: 'unavailable' };
    }
}

export async function fetchSocialSentiment(matchContext) {
    if (!apiAvailable) {
        return null;
    }
    try {
        const res = await authFetch(`${API_BASE}/api/ai/social-sentiment`, {
            method: 'POST',
            body: JSON.stringify({ matchContext }),
            signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        return data;
    } catch (err) {
        console.error('Social sentiment error:', err);
        return null;
    }
}

export function buildMatchContext(match) {
    return `${match.sport.toUpperCase()} — ${match.league}
${match.teamA.name} ${match.teamA.score} vs ${match.teamB.name} ${match.teamB.score}
Status: ${match.status} ${match.minute || ''}
Venue: ${match.venue}`;
}

export function connectWebSocket(onMessage) {
    const wsUrl = getWebSocketUrl();
    const socket = new WebSocket(wsUrl);

    if (onMessage) {
        socket.addEventListener('message', (event) => {
            try {
                onMessage(JSON.parse(event.data));
            } catch {
                onMessage(event.data);
            }
        });
    }

    return socket;
}

export { cricApiAvailable, rapidApiAvailable, aiScoresAvailable };
