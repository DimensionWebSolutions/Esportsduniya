// Standings mock data (replace with real API if available)
const MOCK_STANDINGS = {
    football: [
        { team: 'Man City', wins: 24, losses: 3, draws: 5, points: 77 },
        { team: 'Arsenal', wins: 23, losses: 4, draws: 5, points: 74 },
        { team: 'Liverpool', wins: 22, losses: 5, draws: 5, points: 71 },
    ],
    cricket: [
        { team: 'MI', wins: 9, losses: 5, draws: 0, points: 18 },
        { team: 'CSK', wins: 8, losses: 6, draws: 0, points: 16 },
        { team: 'RCB', wins: 7, losses: 7, draws: 0, points: 14 },
    ],
    nba: [
        { team: 'Lakers', wins: 52, losses: 30, draws: 0, points: 104 },
        { team: 'Celtics', wins: 50, losses: 32, draws: 0, points: 100 },
        { team: 'Warriors', wins: 48, losses: 34, draws: 0, points: 96 },
    ],
    tennis: [
        { team: 'Djokovic', wins: 38, losses: 4, draws: 0, points: 9000 },
        { team: 'Alcaraz', wins: 35, losses: 7, draws: 0, points: 8500 },
        { team: 'Sinner', wins: 33, losses: 8, draws: 0, points: 8200 },
    ],
    f1: [
        { team: 'Verstappen', wins: 10, losses: 2, draws: 0, points: 250 },
        { team: 'Hamilton', wins: 7, losses: 5, draws: 0, points: 200 },
        { team: 'Leclerc', wins: 5, losses: 7, draws: 0, points: 180 },
    ],
};

export async function fetchStandings(league) {
    if (!apiAvailable) {
        return MOCK_STANDINGS[league] || [];
    }
    try {
        const res = await fetch(`${API_BASE}/api/sports/standings/${league}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`[apiService] Standings fetch failed for ${league}, using mock fallback:`, err);
        return MOCK_STANDINGS[league] || [];
    }
}
/* ============================================
   ESPORTSDUNIYA — API Service Layer
   ============================================
   Fetches from the backend proxy (/api/*).
   PRIMARY: AI-powered scores (Gemini + Google Search)
   FALLBACK 1: RapidAPI endpoints (if configured)
   FALLBACK 2: Mock data (offline mode)
   ============================================ */

import { LIVE_MATCHES, AI_NARRATIVES, MOMENTUM_DATA } from '../data/mockData.js';

// In production, VITE_API_URL is set to your Railway backend URL.
// In development, it's empty so Vite's proxy handles /api/* → localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || '';

let apiAvailable = null; // null = unchecked, true/false after check
let aiScoresAvailable = false; // whether AI-powered scores are ready
let lastAllAiMatches = null;

function getDemoMatches(sport = 'all') {
    const matches = sport === 'all' ? LIVE_MATCHES : LIVE_MATCHES.filter(m => m.sport === sport);
    return matches.map(match => ({ ...match, source: 'demo' }));
}

/**
 * Check if the backend API server is running and has keys configured
 */
export async function checkApiHealth() {
    try {
        const res = await fetch(`${API_BASE}/api/health?t=${Date.now()}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        apiAvailable = data.status === 'ok';
        aiScoresAvailable = data.apis?.aiScores === 'configured';
        console.log('🔌 API Server:', apiAvailable ? 'Connected' : 'Unavailable');
        console.log('   🔍 AI Scores:', aiScoresAvailable ? 'Enabled (Gemini + Google Search)' : 'Not configured');
        console.log('   Sports API (RapidAPI):', data.apis?.sports || 'unknown');
        console.log('   AI Narrative:', data.apis?.openai || data.apis?.gemini || 'unknown');
        return data;
    } catch {
        apiAvailable = false;
        aiScoresAvailable = false;
        console.log('🔌 API Server: Unavailable (using mock data)');
        return null;
    }
}

// ============================================
// DATA NORMALIZERS
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
    };
}

function normalizeTennisMatch(game) {
    // Determine status (tennis statuses are often different, but let's assume standard API-Sports)
    return {
        id: game.id,
        sport: 'tennis',
        league: game.league?.name || 'ATP',
        status: getStatus(game.status?.short),
        teamA: {
            name: game.teams?.home?.name || 'Player 1',
            flag: '\ud83c\udfbe', // 🎾
            score: game.scores?.home?.score || '-', // simplified
        },
        teamB: {
            name: game.teams?.away?.name || 'Player 2',
            flag: '\ud83c\udfbe', // 🎾
            score: game.scores?.away?.score || '-',
        },
        momentum: 50,
        venue: 'Court',
        minute: game.status?.short === 'NS' ? new Date(game.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    };
}

function normalizeF1Race(race) {
    // F1 race object — show top driver vs runner-up if available
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
    };
}

function normalizeCricketMatch(game) {
    // CricAPI 'currentMatches' returns mixed status
    const isLive = game.matchStarted && !game.matchEnded;
    const isUpcoming = !game.matchStarted;

    return {
        id: game.id,
        sport: 'cricket',
        league: game.series_id || 'Cricket', // series name often better
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
        minute: isUpcoming ? new Date(game.dateTimeGMT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    };
}


// ============================================
// DATA FETCHING
// ============================================

async function fetchInternal(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        const data = await res.json();
        return data.response || []; // API-Sports usually puts data in 'response'
    } catch (e) {
        console.error(`Fetch error for ${endpoint}:`, e);
        return [];
    }
}

/**
 * Fetch live scores via AI (Gemini + Google Search)
 * This is the PRIMARY data source — searches the internet for real-time scores.
 */
async function fetchAIScores(sport = 'all') {
    try {
        if (sport !== 'all' && lastAllAiMatches) {
            return lastAllAiMatches.filter(match => match.sport === sport);
        }

        const res = await fetch(`${API_BASE}/api/sports/ai-scores/${sport}?t=${Date.now()}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(30000), // AI search may take up to 30s
        });
        const data = await res.json();

        if (data.error || data.fallback) {
            console.warn('⚠️ AI Scores returned error:', data.error);
            return null;
        }

        const matches = data.response || [];
        if (sport === 'all') {
            lastAllAiMatches = matches;
        }
        console.log(`🔍 AI Scores: ${matches.length} matches (source: ${data.source}, next refresh: ${data.nextRefresh}s)`);
        return matches;
    } catch (err) {
        console.error('❌ AI Scores fetch failed:', err.message);
        return null;
    }
}

/**
 * Fetch Upcoming Matches (Schedule) for a specific sport
 */
export async function fetchUpcomingMatches(sport) {
    if (!apiAvailable) return [];

    let results = [];

    if (sport === 'all' || sport === 'football') {
        const data = await fetchInternal('/api/sports/football/upcoming');
        if (Array.isArray(data)) results.push(...data.map(normalizeFootballMatch));
    }

    if (sport === 'all' || sport === 'nba') {
        const data = await fetchInternal('/api/sports/nba/upcoming');
        if (Array.isArray(data)) results.push(...data.map(normalizeNBAMatch));
    }

    if (sport === 'all' || sport === 'tennis') {
        const data = await fetchInternal('/api/sports/tennis/upcoming');
        if (Array.isArray(data)) results.push(...data.map(normalizeTennisMatch));
    }

    if (sport === 'all' || sport === 'f1') {
        const data = await fetchInternal('/api/sports/f1/upcoming');
        if (Array.isArray(data)) results.push(...data.map(normalizeF1Race));
    }

    if (sport === 'all' || sport === 'cricket') {
        // For cricket, fetch upcoming matches from the cricket API endpoint
        const data = await fetchInternal('/api/sports/cricket/upcoming');
        if (Array.isArray(data)) results.push(...data.map(normalizeCricketMatch));
    }

    return results;
}


/**
 * Fetch live matches across all sports.
 * PRIMARY: AI-powered scores (Gemini + Google Search)
 * FALLBACK 1: RapidAPI endpoints
 * FALLBACK 2: Mock data
 */
export async function fetchLiveMatches(sport = 'all') {
    if (!apiAvailable) {
        console.log('📋 Using mock match data');
        return getDemoMatches(sport);
    }

    if (!aiScoresAvailable) {
        console.log('📋 AI live scores are not configured; using demo match data');
        return getDemoMatches(sport);
    }

    // ── PRIMARY: Try AI-powered scores ──
    if (aiScoresAvailable) {
        const aiMatches = await fetchAIScores(sport);
        if (aiMatches && aiMatches.length > 0) {
            return aiMatches;
        }
        // AI returned empty or failed — fall through to RapidAPI
        console.log('📋 AI returned no matches, trying RapidAPI fallback...');
    }

    // ── FALLBACK 1: RapidAPI endpoints ──
    const results = [];

    try {
        if (sport === 'all' || sport === 'football') {
            const data = await fetchInternal('/api/sports/football/live');
            if (Array.isArray(data)) results.push(...data.map(normalizeFootballMatch));
        }

        if (sport === 'all' || sport === 'nba') {
            const data = await fetchInternal('/api/sports/nba/live');
            if (Array.isArray(data)) results.push(...data.map(normalizeNBAMatch));
        }

        if (sport === 'all' || sport === 'tennis') {
            const data = await fetchInternal('/api/sports/tennis/live');
            if (Array.isArray(data)) results.push(...data.map(normalizeTennisMatch));
        }

        if (sport === 'all' || sport === 'cricket') {
            const res = await fetch(`${API_BASE}/api/sports/cricket/live`);
            const json = await res.json();
            const list = json.response || [];
            if (Array.isArray(list)) results.push(...list.map(normalizeCricketMatch));
        }

        // If RapidAPI got results, return them
        if (results.length > 0) return results;

        // Try upcoming as a last resort
        console.log('📋 No live matches from RapidAPI. Fetching upcoming...');
        const upcoming = await fetchUpcomingMatches(sport);
        if (upcoming.length > 0) return upcoming;

        console.log('📋 No live or upcoming matches returned; using demo data');
        return getDemoMatches(sport);

    } catch (err) {
        console.error('Error fetching matches:', err);
        return getDemoMatches(sport);
    }
}

// ============================================
// AI NARRATIVES
// ============================================

export async function fetchAINarrative(matchContext, tone = 'hype') {
    if (!apiAvailable) {
        return { text: AI_NARRATIVES[tone] || AI_NARRATIVES.hype, source: 'mock' };
    }
    try {
        const res = await fetch(`${API_BASE}/api/ai/narrative`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchContext, tone }),
            signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        if (data.fallback || data.error) return { text: AI_NARRATIVES[tone] || AI_NARRATIVES.hype, source: 'mock' };
        return { text: data.narrative, source: data.source || 'ai', provider: data.provider || 'unknown' };
    } catch (err) {
        console.error('AI narrative error:', err);
        return { text: AI_NARRATIVES[tone] || AI_NARRATIVES.hype, source: 'mock' };
    }
}

export async function fetchPreGamePreview(matchContext) {
    const MOCK_PREVIEW = {
        winProbability: { teamA: 50, teamB: 50 },
        teamAForm: ["W", "W", "D", "L", "W"],
        teamBForm: ["L", "W", "W", "D", "L"],
        headToHead: "In their last 5 matchups, Team A won 2, Team B won 2, and 1 ended in a draw.",
        keyMatchups: [
            "Attack vs. Defence: Team A's aggressive frontline vs Team B's compact defensive line.",
            "Midfield Battle: The team that controls the tempo in the middle will dominate the transitions."
        ],
        summary: "This match is expected to be closely contested, with both teams showing balanced forms recently. Minor tactical errors will decide the outcome."
    };

    if (!apiAvailable) {
        return { ...MOCK_PREVIEW, source: 'mock' };
    }

    try {
        const res = await fetch(`${API_BASE}/api/ai/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchContext }),
            signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { ...data, source: 'ai' };
    } catch (err) {
        console.warn('[apiService] Pre-game preview fetch failed, using mock:', err);
        return { ...MOCK_PREVIEW, source: 'mock' };
    }
}


export async function fetchMomentumAnalysis(matchContext, events) {
    if (!apiAvailable) return { ...MOMENTUM_DATA, source: 'mock' };
    try {
        const res = await fetch(`${API_BASE}/api/ai/momentum`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchContext, events }),
            signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();
        if (data.fallback || data.error) return { ...MOMENTUM_DATA, source: 'mock' };

        // Return the full data from the server (already normalized on server side)
        return {
            teamA: data.teamA || MOMENTUM_DATA.teamA,
            teamB: data.teamB || MOMENTUM_DATA.teamB,
            probA: data.probA ?? MOMENTUM_DATA.probA,
            probB: data.probB ?? MOMENTUM_DATA.probB,
            points: data.points && data.points.length > 0 ? data.points : MOMENTUM_DATA.points,
            keyMoments: data.keyMoments && data.keyMoments.length > 0 ? data.keyMoments : MOMENTUM_DATA.keyMoments,
            narrative: data.narrative || '',
            momentum_team: data.momentum_team || '',
            source: data.source || 'ai',
            provider: data.provider || 'unknown',
        };
    } catch (err) {
        console.error('AI momentum error:', err);
        return { ...MOMENTUM_DATA, source: 'mock' };
    }
}

export async function fetchSocialSentiment(matchContext) {
    if (!apiAvailable) {
        return {
            sentiment: 75,
            label: 'HYPED',
            summary: 'Fans are buzzing about the current performance and upcoming plays.',
            reactions: [
                { user: '@SportyUser', text: 'This match is absolutely insane! What a play! 🔥', type: 'positive' },
                { user: '@GoalWatcher', text: 'Still waiting for some real action to happen... 😴', type: 'neutral' },
                { user: '@MatchAddict', text: 'Defense is wide open today, teams need to tighten up!', type: 'negative' }
            ],
            hashtags: ['#EpicMatch', '#LiveSports', '#Esportsduniya']
        };
    }
    try {
        const res = await fetch(`${API_BASE}/api/ai/social-sentiment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    // In production, VITE_WS_URL points to the Railway backend WebSocket endpoint.
    // In development, connect directly to localhost:3002.
    let wsUrl;
    if (import.meta.env.VITE_WS_URL) {
        wsUrl = import.meta.env.VITE_WS_URL;
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.hostname}:3002`;
    }
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
