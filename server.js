/* ============================================
   ESPORTSDUNIYA — Backend Proxy Server
   ============================================
   Keeps API keys secure on the server side.
   All frontend requests go to /api/* which this
   server proxies to the real sports/AI APIs.
   ============================================ */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

config(); // Load .env

const app = express();
app.use(cors());
app.use(express.json());


// In-memory user store (for demonstration)
// In a real app, use a database (MongoDB, PostgreSQL, etc.)
const users = [];
const fanZoneState = new Map();
const predictionState = new Map();

// Helper to find a user
const findUser = (username) => users.find(u => u.username === username);

function getFanZone(matchId) {
  const key = String(matchId || 'global');
  if (!fanZoneState.has(key)) {
    fanZoneState.set(key, { matchId: key, cheers: { teamA: 0, teamB: 0 }, updatedAt: Date.now() });
  }
  return fanZoneState.get(key);
}

function getPredictionPool(matchId) {
  const key = String(matchId || 'global');
  if (!predictionState.has(key)) {
    predictionState.set(key, {
      matchId: key,
      totals: { teamA: 0, teamB: 0 },
      points: { teamA: 0, teamB: 0 },
      updatedAt: Date.now(),
    });
  }
  return predictionState.get(key);
}

function broadcastRealtime(payload) {
  const message = JSON.stringify(payload);
  wss?.clients?.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// Register Endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (findUser(username)) {
    return res.status(409).json({ error: 'Username already exists.' });
  }
  
  const newUser = { 
    id: Date.now().toString(), 
    username, 
    password, // In production, HASH this password!
    preferences: {
      theme: 'dark',
      notifications: true,
      favoriteSports: []
    },
    matchHistory: [],
    achievements: []
  };
  
  users.push(newUser);
  console.log(`   👤 New User Registered: ${username}`);
  
  // Return user without password
  const { password: _, ...userSafe } = newUser;
  res.status(201).json({ message: 'Registration successful!', user: userSafe });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = findUser(username);
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  
  console.log(`   👤 User Logged In: ${username}`);
  const { password: _, ...userSafe } = user;
  res.json({ message: 'Login successful!', user: userSafe });
});

// Get Profile Endpoint
app.get('/api/profile/:username', (req, res) => {
  const user = findUser(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// Update Profile Endpoint
app.put('/api/profile/:username', (req, res) => {
  const { username } = req.params;
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  // Update allowed fields
  const { preferences, matchHistory, achievements } = req.body;
  
  if (preferences) users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
  if (matchHistory) users[userIndex].matchHistory = matchHistory; // Append or replace strategy needed in real app
  if (achievements) users[userIndex].achievements = achievements;

  const { password: _, ...userSafe } = users[userIndex];
  res.json({ message: 'Profile updated', user: userSafe });
});

const PORT = process.env.PORT || 3001;

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function isKeySet(key, placeholder) {
  return key && key !== placeholder && key.length > 10;
}

const hasRapidAPI = isKeySet(RAPIDAPI_KEY, 'your_rapidapi_key_here');
const hasOpenAI = isKeySet(OPENAI_API_KEY, 'your_openai_key_here');
const hasGemini = isKeySet(GEMINI_API_KEY, 'your_gemini_key_here');

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apis: {
      sports: hasRapidAPI ? 'configured' : 'missing',
      aiScores: hasGemini ? 'configured' : 'missing',
      openai: hasOpenAI ? 'configured' : 'missing',
      gemini: hasGemini ? 'configured' : 'missing',
    },
  });
});

// ============================================
// ============================================
app.get('/api/crowdpulse', async (req, res) => {
  if (!hasGemini) {
    return res.json({ regions: LIVE_CROWD_PULSE || [] });
  }

  const prompt = `You are a global fan sentiment analyst for Esportsduniya.
  
  CORE TASK:
  1. Search for the LATEST real-time sports fan activity across the globe RIGHT NOW.
  2. Identify 6-8 major cities/regions where fans are most active (cheering for matches, trending on social media, etc.).
  3. For each region, return:
     - "name": City name
     - "fans": Number of fans (a realistic live estimate, e.g., 42.5k)
     - "intensity": Score from 1-100 (based on how "loud" the fans are)
     - "emoji": Relevant flag or sports emoji
     - "x", "y": Coordinates on a 100x100 world map (x: 0 is West, 100 is East; y: 0 is North, 100 is South)
  
  Return ONLY a valid JSON object in this format:
  {
    "regions": [
      { "name": "London", "fans": "125k", "intensity": 85, "emoji": "🇬🇧", "x": 48, "y": 30 },
      ...
    ]
  }
  
  Base this on real trending sports and live matches happening TODAY.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });

    const data = await response.json();
    let jsonStr = (data.candidates?.[0]?.content?.parts?.[0]?.text || '{}').trim();

    // Extract JSON from possible markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const result = JSON.parse(jsonStr);
    console.log(`   ✅ Crowd Pulse: Updated via AI (${result.regions?.length || 0} regions)`);
    res.json({ regions: result.regions || [] });
  } catch (err) {
    console.error('   ❌ Crowd Pulse AI error:', err.message);
    res.json({ regions: LIVE_CROWD_PULSE || [] });
  }
});
// VALIDATION ENDPOINT — Tests each API key
// ============================================
app.get('/api/validate', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    rapidapi: { status: 'skipped', message: 'No key configured' },
    gemini: { status: 'skipped', message: 'No key configured' },
    openai: { status: 'skipped', message: 'No key configured' },
  };

  // 1. Test RapidAPI key with API-Football (most reliable free endpoint)
  if (hasRapidAPI) {
    try {
      const response = await fetch('https://v3.football.api-sports.io/status', {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      });
      const data = await response.json();
      if (response.ok && data.response) {
        const acct = data.response.account;
        const sub = data.response.subscription;
        const reqs = data.response.requests;
        results.rapidapi = {
          status: '✅ WORKING',
          account: acct?.email || 'unknown',
          plan: sub?.plan || 'unknown',
          requestsToday: `${reqs?.current || 0} / ${reqs?.limit_day || 0}`,
          remainingToday: (reqs?.limit_day || 0) - (reqs?.current || 0),
        };
      } else if (response.status === 403) {
        results.rapidapi = {
          status: '⚠️ KEY VALID — NOT SUBSCRIBED',
          message: 'Your RapidAPI key works, but you need to subscribe to API-Football.',
          action: 'Go to https://rapidapi.com/api-sports/api/api-football → Click "Subscribe to Test" on the FREE plan',
        };
      } else {
        results.rapidapi = { status: '❌ ERROR', message: JSON.stringify(data) };
      }
    } catch (err) {
      results.rapidapi = { status: '❌ ERROR', message: err.message };
    }
  }

  // 2. Test Gemini key
  if (hasGemini) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with only the word: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });
      const data = await response.json();
      if (response.ok && data.candidates) {
        results.gemini = {
          status: '✅ WORKING',
          model: 'gemini-2.0-flash',
          testResponse: data.candidates[0]?.content?.parts?.[0]?.text?.trim() || 'OK',
        };
      } else {
        results.gemini = {
          status: '❌ ERROR',
          httpStatus: response.status,
          message: data.error?.message || JSON.stringify(data),
        };
      }
    } catch (err) {
      results.gemini = { status: '❌ ERROR', message: err.message };
    }
  }

  // 3. Test OpenAI key
  if (hasOpenAI) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Reply with only the word: OK' }],
          max_tokens: 5,
        }),
      });
      const data = await response.json();
      if (response.ok && data.choices) {
        results.openai = {
          status: '✅ WORKING',
          model: 'gpt-4o-mini',
          testResponse: data.choices[0]?.message?.content?.trim() || 'OK',
        };
      } else {
        results.openai = {
          status: '❌ ERROR',
          httpStatus: response.status,
          message: data.error?.message || JSON.stringify(data),
        };
      }
    } catch (err) {
      results.openai = { status: '❌ ERROR', message: err.message };
    }
  }

  // Summary
  const allWorking = Object.values(results)
    .filter(v => typeof v === 'object' && v.status)
    .every(v => v.status.includes('✅') || v.status === 'skipped');

  results.summary = allWorking
    ? '🎉 All configured APIs are working!'
    : '⚠️ Some APIs need attention — check details above';

  res.json(results);
});

// ============================================
// SPORTS API ENDPOINTS (API-Sports via RapidAPI)
// ============================================

// RapidAPI / API-Sports Configuration
// We use the direct api-sports.io domains where possible as they sometimes accept RapidAPI keys
// directly, whereas the RapidAPI proxy (api-*.p.rapidapi.com) enforces strict subscription checks.
const SPORT_CONFIG = {
  football: {
    host: 'v3.football.api-sports.io',
    baseUrl: 'https://v3.football.api-sports.io',
  },
  basketball: {
    host: 'v1.basketball.api-sports.io',
    baseUrl: 'https://v1.basketball.api-sports.io',
  },
  tennis: {
    host: 'v1.tennis.api-sports.io',
    baseUrl: 'https://v1.tennis.api-sports.io',
  },
  formula1: {
    host: 'v1.formula-1.api-sports.io',
    baseUrl: 'https://v1.formula-1.api-sports.io',
  },
};

async function fetchSportsAPI(sport, endpoint) {
  const config = SPORT_CONFIG[sport];
  if (!config) throw new Error(`Unknown sport: ${sport}`);

  const url = `${config.baseUrl}${endpoint}`;
  console.log(`   → Fetching: ${url}`);

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': config.host,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`   ❌ API Error (${response.status}):`, text.slice(0, 500));

    if (response.status === 403) {
      throw new Error(`Access Denied (403): You likely need a subscription for ${sport}. Check RapidAPI console.`);
    }
    throw new Error(`API-Sports ${response.status}: ${text.slice(0, 200)}`);
  }
  return response.json();
}

// ── Football Live ──
app.get('/api/sports/football/live', async (req, res) => {
  try {
    const data = await fetchSportsAPI('football', '/fixtures?live=all');
    console.log(`   ✅ Football: ${data.results || 0} live matches`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Football:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Football by League ──
app.get('/api/sports/football/league/:leagueId', async (req, res) => {
  try {
    const { leagueId } = req.params;
    const season = getCurrentSeason();
    const data = await fetchSportsAPI('football', `/fixtures?league=${leagueId}&season=${season}&next=10`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Football league:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Football Events ──
app.get('/api/sports/football/events/:fixtureId', async (req, res) => {
  try {
    const data = await fetchSportsAPI('football', `/fixtures/events?fixture=${req.params.fixtureId}`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Football events:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── NBA Live ──
app.get('/api/sports/nba/live', async (req, res) => {
  try {
    const data = await fetchSportsAPI('basketball', '/games?live=all');
    console.log(`   ✅ NBA: ${data.results || 0} live games`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ NBA:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Tennis Live ──
app.get('/api/sports/tennis/live', async (req, res) => {
  try {
    const data = await fetchSportsAPI('tennis', '/games?live=all');
    console.log(`   ✅ Tennis: ${data.results || 0} live matches`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Tennis:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── F1 Races ──
app.get('/api/sports/f1/races', async (req, res) => {
  try {
    const season = getCurrentSeason();
    const data = await fetchSportsAPI('formula1', `/races?season=${season}&type=Race`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ F1:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── F1 Next Race (Upcoming) ──
app.get('/api/sports/f1/upcoming', async (req, res) => {
  try {
    const data = await fetchSportsAPI('formula1', '/races?next=1');
    res.json(data);
  } catch (err) {
    console.error('   ❌ F1 Upcoming:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});


// ── Helper: Get Today's Date YYYY-MM-DD (with time-travel fix) ──
function getTodayDate() {
  const date = new Date();
  // Use actual system year (no forced fallback)
  return date.toISOString().split('T')[0];
}

function getCurrentSeason() {
  return new Date().getFullYear();
}

// ── Football Upcoming ──
app.get('/api/sports/football/upcoming', async (req, res) => {
  try {
    // Determine the next few games
    const data = await fetchSportsAPI('football', '/fixtures?next=10');
    console.log(`   🗓️ Football Upcoming: ${data.results || 0} matches`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Football Upcoming:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── NBA Upcoming ──
app.get('/api/sports/nba/upcoming', async (req, res) => {
  try {
    const today = getTodayDate();
    const data = await fetchSportsAPI('basketball', `/games?date=${today}`);
    console.log(`   🗓️ NBA Upcoming: ${data.results || 0} games for ${today}`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ NBA Upcoming:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Tennis Upcoming ──
app.get('/api/sports/tennis/upcoming', async (req, res) => {
  try {
    const today = getTodayDate();
    const data = await fetchSportsAPI('tennis', `/games?date=${today}`);
    console.log(`   🗓️ Tennis Upcoming: ${data.results || 0} matches for ${today}`);
    res.json(data);
  } catch (err) {
    console.error('   ❌ Tennis Upcoming:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Cricket (using free cricketdata.org API — no RapidAPI subscription needed) ──
app.get('/api/sports/cricket/live', async (req, res) => {
  try {
    // Use the free cricketdata.org API
    const response = await fetch('https://api.cricapi.com/v1/currentMatches?apikey=demo&offset=0');
    if (!response.ok) throw new Error(`Cricket API ${response.status}`);
    const data = await response.json();
    console.log(`   ✅ Cricket: ${data.data?.length || 0} matches`);
    res.json({ response: data.data || [], results: data.data?.length || 0 });
  } catch (err) {
    console.error('   ❌ Cricket:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── Cricket Upcoming (Same endpoint, just filtered differently on client usually, but let's expose it) ──
app.get('/api/sports/cricket/upcoming', async (req, res) => {
  // Identify upcoming matches from the same endpoint or distinct one
  // cricapi "matches" endpoint provides schedule but requires credits often.
  // simpler: reuse currentMatches as it contains "not started" too.
  res.redirect('/api/sports/cricket/live');
});

// ============================================
// AI NARRATIVE ENDPOINTS
// ============================================

app.post('/api/ai/narrative', async (req, res) => {
  const { matchContext, tone } = req.body;

  const toneInstructions = {
    hype: 'Write like an extremely excited, over-the-top sports commentator. Use lots of caps, exclamations, fire emojis, and dramatic language. Make the reader feel the adrenaline.',
    analytical: 'Write like a data-driven sports analyst. Use precise statistics, percentages, historical comparisons, and measured language. Be objective and insightful.',
    sarcastic: 'Write like a witty, sarcastic sports journalist. Use irony, dry humor, eye-roll emojis, and playful jabs at the losing team. Be funny but never mean-spirited.',
  };

  const prompt = `You are an AI Sports Journalist for Esportsduniya platform.

FIRST: Search the internet for the LATEST real-time information about this match. Find current scores, recent events, key plays, player performances, and any breaking developments.

MATCH TO RESEARCH:
${matchContext}

AFTER researching, write a 2-3 paragraph match commentary based on REAL facts you found from the internet. Include specific details like actual scores, player names, key moments, and statistics you discovered.

TONE: ${toneInstructions[tone] || toneInstructions.hype}

IMPORTANT: Base your narrative ONLY on real data you found via internet search. If you cannot find live data for this specific match, write about the most recent match or news involving these teams/players. Do not add any labels or headers, just the narrative text.`;

  try {
    if (hasGemini) {
      // Use Gemini with Google Search grounding for real-time data
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.8 },
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
      }
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('   ✅ AI Narrative generated (Gemini + Google Search)');
      res.json({ narrative: result, provider: 'gemini-search', source: 'internet' });
    } else if (hasOpenAI) {
      const result = await callOpenAI(prompt);
      console.log('   ✅ AI Narrative generated (OpenAI)');
      res.json({ narrative: result, provider: 'openai', source: 'ai' });
    } else {
      res.status(503).json({ error: 'No AI API key configured', fallback: true });
    }
  } catch (err) {
    console.error('   ❌ AI narrative:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

app.post('/api/ai/momentum', async (req, res) => {
  const { matchContext, events } = req.body;

  const prompt = `You are a sports momentum analyst for the Esportsduniya platform.

FIRST: Search the internet for the LATEST real-time information about this specific match. Find live scores, recent events, key plays, player stats, and match flow.

MATCH TO RESEARCH:
${matchContext}

AFTER researching, analyze the match momentum based on REAL data you found and return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "teamA": "<actual team/player A name from live data>",
  "teamB": "<actual team/player B name from live data>",
  "probA": <win probability 0-100 based on real match situation>,
  "probB": <win probability 0-100>,
  "points": [
    {"over": 1, "value": 50},
    {"over": 2, "value": 55},
    ...more data points showing momentum shifts (value 0-100, >50 favors team A, <50 favors team B)...
  ],
  "keyMoments": [
    {"over": <number>, "text": "<real event from match>", "type": "positive|negative|neutral"},
    ...3-6 key moments from the actual match...
  ],
  "narrative": "<one sentence describing current momentum based on real data>",
  "momentum_team": "<name of team currently with momentum>"
}

RULES:
- For cricket: "over" = actual over number (1-20 for T20, 1-50 for ODI)
- For football: "over" = match minute (1-90+)
- For NBA: "over" = game minute (1-48)
- For tennis: "over" = game number across sets (1-30+)
- For F1: "over" = lap number
- Generate 10-20 data points showing how momentum shifted during the match
- probA + probB should equal 100
- Base ALL data on what you found via internet search. Use real events, real scores, real player names.
- If the match hasn't started yet, set both probs to 50 and note it's upcoming
- Return ONLY the JSON object, nothing else.`;

  try {
    if (!hasGemini) {
      return res.status(503).json({ error: 'No Gemini API key configured', fallback: true });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('   🔍 AI Momentum: Analyzing match via Gemini + Google Search...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Extract JSON from possible markdown fences
    let jsonStr = rawText.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    try {
      const parsed = JSON.parse(jsonStr);

      // Validate and normalize
      const result = {
        teamA: parsed.teamA || 'Team A',
        teamB: parsed.teamB || 'Team B',
        probA: Math.min(100, Math.max(0, parsed.probA || 50)),
        probB: Math.min(100, Math.max(0, parsed.probB || 50)),
        points: Array.isArray(parsed.points) ? parsed.points : [],
        keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments.slice(0, 8) : [],
        narrative: parsed.narrative || '',
        momentum_team: parsed.momentum_team || '',
        source: 'internet',
        provider: 'gemini-search',
      };

      console.log(`   ✅ AI Momentum: ${result.teamA} ${result.probA}% vs ${result.teamB} ${result.probB}% (${result.points.length} data points, ${result.keyMoments.length} moments)`);
      res.json(result);
    } catch {
      console.error('   ⚠️ AI Momentum parse error. Raw:', jsonStr.slice(0, 500));
      res.json({ raw: rawText, fallback: true });
    }
  } catch (err) {
    console.error('   ❌ AI momentum:', err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

app.post('/api/ai/social-sentiment', async (req, res) => {
  const { matchContext } = req.body;

  const prompt = `You are a social media sentiment analyst for the Esportsduniya platform.
  
  CORE TASK: 
  1. Search the internet (specifically Twitter/X, sports forums, and news) for the LATEST real-time fan reactions, hashtags, and discussions about this match:
     ${matchContext}
  2. Analyze the overall sentiment (positive, negative, or mixed).
  3. Identify the top 5 most frequent or impactful "tweets" or fan comments you found (paraphrase if needed for brevity).
  4. Return ONLY valid JSON (no markdown) in this format:
  {
    "sentiment": <score from -100 to 100, where 100 is pure hype/positive and -100 is anger/frustration>,
    "label": "<HYPED|OPTIMISTIC|TENSE|FRUSTRATED|ANGRY>",
    "summary": "<a one-sentence overview of the global fan mood>",
    "reactions": [
      { "user": "<username like @SportsFan>", "text": "<the reaction>", "type": "<positive|negative|neutral>" },
      ...4 more...
    ],
    "hashtags": ["#Hashtag1", "#Hashtag2", ...]
  }
  
  IMPORTANT: Base everything on REAL data from the last few hours. If the match is yet to start, focus on pre-match hype and predictions. Return ONLY the JSON object.`;

  try {
    if (!hasGemini) {
      return res.status(503).json({ error: 'No Gemini API key configured' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('   🔍 Social Pulse: Analyzing fan sentiment via Gemini + Google Search...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    let jsonStr = (data.candidates?.[0]?.content?.parts?.[0]?.text || '{}').trim();

    // Extract JSON from possible markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\\s*([\\s\\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      // Sometimes it's just raw JSON
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonStr = jsonStr.slice(start, end + 1);
      }
    }

    const result = JSON.parse(jsonStr);
    console.log(`   ✅ Social Pulse: Sentiment ${result.sentiment} (${result.label})`);
    res.json(result);
  } catch (err) {
    console.error('   ❌ Social Pulse:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── OpenAI Helper ──
async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Gemini Helper ──
async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.8 },
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ── AI Tactical Analysis ──
app.post('/api/ai/tactics', async (req, res) => {
  const { matchContext } = req.body;

  const prompt = `You are a professional sports tactical analyst for Esportsduniya.

FIRST: Search the internet for the LATEST tactical analysis, team formations, and strategic shifts for this match:
${matchContext}

AFTER researching, return ONLY valid JSON (no markdown) in this exact format:
{
  "formationA": "<team A formation, e.g. 4-3-3>",
  "formationB": "<team B formation>",
  "tacticalStyle": "<one sentence describing the overall tactical battle>",
  "keyShifts": [
    { "time": "<minute/over>", "description": "<description of tactical change, e.g. 'Team A switched to a high press'>", "impact": "positive|negative" },
    ...3 or more...
  ],
  "pressingIntensity": <0-100 score>,
  "heatmapFocus": "<description of where most action is happening, e.g. 'Dominance in the middle third'>",
  "playerAnalysis": [
    { "name": "<player>", "role": "<tactical role>", "contribution": "<one sentence on their tactical impact>" },
    ...2 or more...
  ]
}

If you cannot find real-time tactical data for this specific match, base it on the teams' most recent typical tactical setups. Return ONLY the JSON object.`;

  try {
    if (!hasGemini) return res.status(503).json({ error: 'No Gemini API key configured' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    });

    const data = await response.json();
    let jsonStr = (data.candidates?.[0]?.content?.parts?.[0]?.text || '{}').trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('   ⚠️ AI Tactics parse error. Trying extraction...');
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw e;
    }

    console.log(`   ✅ AI Tactics: Analyzed ${matchContext}`);
    res.json(result);
  } catch (err) {
    console.error('   ❌ AI Tactics error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── AI Match Oracle (Contextual Q&A) ──
app.post('/api/ai/oracle', async (req, res) => {
  const { matchContext, question, history } = req.body;

  const prompt = `You are "The Oracle", a highly intelligent and witty sports AI for Esportsduniya.
  
CONTEXT: You are watching this match: ${matchContext}
CONVERSATION HISTORY: ${JSON.stringify(history || [])}

USER QUESTION: ${question}

CORE TASK:
1. Search the internet for the absolute LATEST info relevant to the user's question about this match/players.
2. Provide a detailed, insightful, and slightly conversational answer.
3. Include 2-3 specific suggested follow-up questions that would be interesting to know.

Return ONLY valid JSON (no markdown) in this format:
{
  "answer": "<your detailed answer>",
  "suggestedQuestions": ["<question 1>", "<question 2>", "<question 3>"]
}

If info is unavailable, use your general knowledge but mention you're waiting for live updates. Return ONLY the JSON.`;

  try {
    if (!hasGemini) return res.status(503).json({ error: 'No Gemini API key configured' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    });

    const data = await response.json();
    let jsonStr = (data.candidates?.[0]?.content?.parts?.[0]?.text || '{}').trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (e) {
      console.error('   ⚠️ AI Oracle parse error. Trying extraction...');
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) result = JSON.parse(match[0]);
      else throw e;
    }

    console.log(`   🔮 AI Oracle: Answered question about ${matchContext}`);
    res.json(result);
  } catch (err) {
    console.error('   ❌ AI Oracle error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ============================================
// AI-POWERED LIVE SCORES (Gemini + Google Search)
// ============================================
// Uses Gemini 2.0 Flash with Google Search grounding
// to fetch real-time sports scores from the internet.
// Results are cached for 60 seconds per sport.
// ============================================

const aiScoresCache = {}; // { sport: { data: [], timestamp: 0 } }
const AI_CACHE_TTL = 60_000; // 60 seconds

function isCacheValid(sport) {
  const entry = aiScoresCache[sport];
  return entry && (Date.now() - entry.timestamp) < AI_CACHE_TTL;
}

function getSportPrompt(sport) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const sportInstructions = {
    cricket: `Search for live and today's cricket matches (IPL, ICC, international tests, ODIs, T20s). For each match include: teams, scores (runs/wickets), overs, match status (live/upcoming/finished), venue, and tournament/league name.`,
    football: `Search for live and today's football/soccer matches (Premier League, La Liga, Champions League, Serie A, Bundesliga, Ligue 1, international). For each match include: teams, scores, match minute, match status (live/upcoming/finished), venue, and league name.`,
    nba: `Search for live and today's NBA basketball games. For each game include: teams, scores (total points), quarter/period, game status (live/upcoming/finished), arena, and 'NBA' as league.`,
    tennis: `Search for live and today's tennis matches (ATP, WTA, Grand Slams). For each match include: players, set scores, match status (live/upcoming/finished), court/venue, and tournament name.`,
    f1: `Search for the latest Formula 1 race or qualifying results, or upcoming race. Include: driver standings/positions, race name, circuit, lap info if live, status.`,
    all: `Search for live and today's sports matches across cricket, football/soccer, NBA basketball, tennis, and Formula 1. For each match include: sport type, teams/players, scores, match status (live/upcoming/finished), venue, and league/tournament name. Prioritize live matches first.`,
  };

  return `You are a sports data API. Today is ${today}.

${sportInstructions[sport] || sportInstructions.all}

IMPORTANT: Search the internet for the LATEST real-time scores and match data available RIGHT NOW.

Return ONLY a valid JSON array (no markdown, no code fences, no explanation). Each element must follow this exact schema:
{
  "id": <unique number>,
  "sport": "<cricket|football|nba|tennis|f1>",
  "league": "<league or tournament name>",
  "status": "<live|upcoming|finished>",
  "teamA": {
    "name": "<team or player name>",
    "score": "<score string e.g. '186/4' or '2' or '6-4, 3-2'>"
  },
  "teamB": {
    "name": "<team or player name>",
    "score": "<score string>"
  },
  "venue": "<stadium or venue name>",
  "detail": "<overs, match minute, quarter, set, lap info — whatever is relevant>",
  "startTime": "<match start time if upcoming, or empty string>"
}

If no matches are found for a sport, return an empty array [].
Return at most 15 matches. Prioritize live matches, then upcoming, then recently finished.
Return ONLY the JSON array, nothing else.`;
}

const SPORT_ICONS = {
  cricket: '🏏',
  football: '⚽',
  nba: '🏀',
  tennis: '🎾',
  f1: '🏁',
};

function normalizeAIMatch(match, index) {
  const sport = match.sport?.toLowerCase() || 'football';
  return {
    id: match.id || 1000 + index,
    sport,
    league: match.league || 'Unknown League',
    status: (match.status || 'upcoming').toLowerCase(),
    teamA: {
      name: match.teamA?.name || 'Team A',
      flag: SPORT_ICONS[sport] || '🏅',
      score: match.teamA?.score || '-',
    },
    teamB: {
      name: match.teamB?.name || 'Team B',
      flag: SPORT_ICONS[sport] || '🏅',
      score: match.teamB?.score || '-',
    },
    momentum: 50,
    venue: match.venue || '',
    minute: match.detail || match.startTime || '',
    source: 'ai-search',
  };
}

function parseJsonArrayFromText(rawText) {
  let jsonStr = (rawText || '[]').trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
  }

  const candidates = [
    jsonStr,
    jsonStr.replace(/,\s*([}\]])/g, '$1'),
  ];

  let lastError;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      lastError = err;
    }
  }

  console.error('   ⚠️ AI response parse error. Raw:', jsonStr.slice(0, 800));
  throw lastError || new Error('Could not parse AI response as JSON array');
}

async function fetchScoresViaGemini(sport) {
  if (!hasGemini) throw new Error('No Gemini API key configured');

  const prompt = getSportPrompt(sport);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  console.log(`   🔍 AI Search: Fetching ${sport} scores via Gemini + Google Search...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let matches = parseJsonArrayFromText(rawText);

  if (!Array.isArray(matches)) matches = [];

  // Normalize matches
  const normalized = matches.map((m, i) => normalizeAIMatch(m, i));
  console.log(`   ✅ AI Search: Found ${normalized.length} ${sport} matches`);

  return normalized;
}

// ── AI Scores Endpoint (per sport) ──
app.get('/api/sports/ai-scores/:sport', async (req, res) => {
  const sport = req.params.sport;
  const validSports = ['all', 'cricket', 'football', 'nba', 'tennis', 'f1'];

  if (!validSports.includes(sport)) {
    return res.status(400).json({ error: `Invalid sport: ${sport}. Use: ${validSports.join(', ')}` });
  }

  // Check cache first
  if (isCacheValid(sport)) {
    console.log(`   📦 AI Cache HIT for ${sport} (${Math.round((Date.now() - aiScoresCache[sport].timestamp) / 1000)}s old)`);
    return res.json({
      response: aiScoresCache[sport].data,
      results: aiScoresCache[sport].data.length,
      source: 'ai-search-cached',
      cachedAt: new Date(aiScoresCache[sport].timestamp).toISOString(),
      nextRefresh: Math.round((AI_CACHE_TTL - (Date.now() - aiScoresCache[sport].timestamp)) / 1000),
    });
  }

  try {
    const matches = await fetchScoresViaGemini(sport);

    // Update cache
    aiScoresCache[sport] = { data: matches, timestamp: Date.now() };

    res.json({
      response: matches,
      results: matches.length,
      source: 'ai-search-live',
      cachedAt: new Date().toISOString(),
      nextRefresh: AI_CACHE_TTL / 1000,
    });
  } catch (err) {
    console.error(`   ❌ AI Scores (${sport}):`, err.message);
    res.status(502).json({ error: err.message, fallback: true });
  }
});

// ── AI Scores: Clear Cache (manual refresh) ──
app.post('/api/sports/ai-scores/refresh', (req, res) => {
  Object.keys(aiScoresCache).forEach(k => delete aiScoresCache[k]);
  console.log('   🔄 AI Scores cache cleared');
  res.json({ status: 'cache_cleared' });
});

// ── Fan Zone: Persistent match cheers ──
app.get('/api/fanzone/:matchId', (req, res) => {
  res.json(getFanZone(req.params.matchId));
});

app.post('/api/fanzone/:matchId/cheer', (req, res) => {
  const { team } = req.body || {};
  if (!['teamA', 'teamB'].includes(team)) {
    return res.status(400).json({ error: 'team must be teamA or teamB' });
  }

  const state = getFanZone(req.params.matchId);
  state.cheers[team] += 1;
  state.updatedAt = Date.now();

  broadcastRealtime({ type: 'fan_zone_update', matchId: state.matchId, state });
  res.json(state);
});

// ── Oracle Predictions: Persistent aggregate pool ──
app.get('/api/oracle/:matchId', (req, res) => {
  res.json(getPredictionPool(req.params.matchId));
});

app.post('/api/oracle/:matchId/prediction', (req, res) => {
  const { team, wager = 0 } = req.body || {};
  if (!['teamA', 'teamB'].includes(team)) {
    return res.status(400).json({ error: 'team must be teamA or teamB' });
  }

  const numericWager = Math.max(0, Number(wager) || 0);
  const pool = getPredictionPool(req.params.matchId);
  pool.totals[team] += 1;
  pool.points[team] += numericWager;
  pool.updatedAt = Date.now();

  broadcastRealtime({ type: 'oracle_update', matchId: pool.matchId, pool });
  res.json(pool);
});

// ============================================
// HTTP + WebSocket Server
// ============================================
// WebSocket is attached to the same HTTP server so Railway only needs one port.
// In dev this also works — ws://localhost:3001 (instead of the old :3002).

const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', ws => {
  console.log('✨ WebSocket client connected');

  // Send a welcome message or initial data
  ws.send(JSON.stringify({ type: 'info', message: 'Connected to real-time updates.' }));

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });

  ws.on('error', error => {
    console.error('❌ WebSocket error:', error);
  });
});

// ── Start Server ──
httpServer.listen(PORT, () => {
  console.log(`\n⚡ Esportsduniya API Server running on http://localhost:${PORT}`);
  console.log(`   Health:    http://localhost:${PORT}/api/health`);
  console.log(`   Validate:  http://localhost:${PORT}/api/validate`);
  console.log(`   AI Scores: http://localhost:${PORT}/api/sports/ai-scores/all`);
  console.log(`   WebSocket: ws://localhost:${PORT}\n`);

  console.log('   API Key Status:');
  console.log(`   ${hasRapidAPI ? '✅' : '❌'} RapidAPI Sports: ${hasRapidAPI ? 'Configured' : 'Missing'}`);
  console.log(`   ${hasOpenAI ? '✅' : '❌'} OpenAI:          ${hasOpenAI ? 'Configured' : 'Missing'}`);
  console.log(`   ${hasGemini ? '✅' : '❌'} Gemini:          ${hasGemini ? 'Configured' : 'Missing (REQUIRED for AI Scores)'}`);
  console.log(`\n   ${hasGemini ? '🔍 AI-Powered Live Scores: ENABLED (60s cache)' : '⚠️  AI-Powered Live Scores: DISABLED — Set GEMINI_API_KEY in .env'}\n`);
});
