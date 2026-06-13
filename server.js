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
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import cron from 'node-cron';
import webpush from 'web-push';
import Stripe from 'stripe';

config(); // Load .env

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'esd-dev-secret-change-in-production';
const SALT_ROUNDS = 10;

// ── Web Push (VAPID) ──
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@esportsduniya.in';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('   ✅ Web Push: VAPID configured');
} else {
  console.log('   ℹ️  Web Push: No VAPID keys — push notifications disabled (set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)');
}

// ── Auth Middleware ──
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { username, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ── Optional auth (attaches user info if token present, but doesn't block) ──
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch { /* ignore invalid token */ }
  }
  next();
}

// ============================================
// DATABASE — MongoDB with in-memory fallback
// ============================================
const MONGODB_URI = process.env.MONGODB_URI;
let useDatabase = false;

// ── Mongoose User Schema ──
const userSchema = new mongoose.Schema({
  username:           { type: String, required: true, unique: true, trim: true },
  password:           { type: String, required: true },
  avatar:             { type: String, default: '🦁' },
  preferences:        { type: mongoose.Schema.Types.Mixed, default: { theme: 'dark', notifications: true, favoriteSports: [] } },
  fanPoints:          { type: Number, default: 0 },
  badges:             { type: Array, default: [] },
  streak:             { type: Number, default: 0 },
  lastLoginDate:      { type: String, default: null },
  cheeredMatches:     { type: Array, default: [] },
  sharedMatches:      { type: Array, default: [] },
  following:          { type: Array, default: [] },
  followers:          { type: Array, default: [] },
  activityLog:        { type: Array, default: [] },
  matchHistory:       { type: Array, default: [] },
  achievements:       { type: Array, default: [] },
  predictions:        { type: Array, default: [] },
  isAdmin:            { type: Boolean, default: false },
  isPremium:          { type: Boolean, default: false },
  premiumExpiry:      { type: Date, default: null },
  pushSubscriptions:  { type: Array, default: [] },
  dailyChallenges:    { type: mongoose.Schema.Types.Mixed, default: null },
  lastChallengeDate:  { type: String, default: null },
  fantasyPicks:       { type: Array, default: [] },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      useDatabase = true;
      console.log('   ✅ MongoDB: Connected');
    })
    .catch(err => {
      console.warn('   ⚠️  MongoDB: Connection failed — falling back to in-memory store');
      console.warn('   ', err.message);
    });
} else {
  console.log('   ℹ️  MongoDB: No MONGODB_URI set — using in-memory store (data resets on restart)');
}

// ── DB helper wrappers (unified API for both modes) ──
async function dbFindUser(username) {
  if (useDatabase) return User.findOne({ username }).lean();
  return users.find(u => u.username === username) || null;
}

async function dbCreateUser(userData) {
  if (useDatabase) {
    const user = new User(userData);
    await user.save();
    return user.toObject();
  }
  users.push(userData);
  return userData;
}

async function dbUpdateUser(username, updates) {
  if (useDatabase) {
    return User.findOneAndUpdate({ username }, { $set: updates }, { new: true }).lean();
  }
  const idx = users.findIndex(u => u.username === username);
  if (idx === -1) return null;
  Object.assign(users[idx], updates);
  return users[idx];
}

async function dbGetAllUsers() {
  if (useDatabase) return User.find({}).lean();
  return users;
}

function safeUser(user) {
  if (!user) return null;
  const { password, __v, ...safe } = user;
  return safe;
}

// ── Fan Engagement: Activity counters for trending ──
const users = []; // In-memory fallback (used when MONGODB_URI is not set)
const fanZoneState = new Map();
const predictionState = new Map();

// ── Fan Engagement: Activity counters for trending ──
const trendingCounters = {}; // { sport: { count, lastReset } }
const TRENDING_WINDOW_MS = 60 * 60 * 1000; // 1 hour


function getTrendingCounter(sport) {
  const now = Date.now();
  if (!trendingCounters[sport] || (now - trendingCounters[sport].lastReset) > TRENDING_WINDOW_MS) {
    trendingCounters[sport] = { count: 0, lastReset: now };
  }
  return trendingCounters[sport];
}

function incrementTrending(sport) {
  const counter = getTrendingCounter(sport);
  counter.count += 1;
}

// ── Highlights cache ──
let highlightsCache = null;
let highlightsCacheTime = 0;
const HIGHLIGHTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper to find a user (in-memory fallback only)
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
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    const existing = await dbFindUser(username);
    if (existing) return res.status(409).json({ error: 'Username already exists.' });

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      avatar: '🦁',
      preferences: { theme: 'dark', notifications: true, favoriteSports: [] },
      matchHistory: [],
      achievements: [],
      predictions: [],
      fanPoints: 0,
      badges: [],
      streak: 0,
      lastLoginDate: null,
      cheeredMatches: [],
      sharedMatches: [],
      following: [],
      followers: [],
      activityLog: [],
    };

    const created = await dbCreateUser(newUser);
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    console.log(`   👤 New User Registered: ${username}`);
    res.status(201).json({ message: 'Registration successful!', user: safeUser(created), token });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid username or password.' });

    // ── Streak logic ──
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = user.streak || 0;
    if (user.lastLoginDate === yesterday) {
      newStreak += 1;
    } else if (user.lastLoginDate !== today) {
      newStreak = 1;
    }

    // Award streak badge at multiples of 7
    const badges = user.badges || [];
    if (newStreak > 0 && newStreak % 7 === 0) {
      const badgeName = `🔥 ${newStreak}-Day Streak`;
      if (!badges.find(b => b.name === badgeName)) {
        badges.push({ name: badgeName, earnedAt: Date.now() });
      }
    }

    await dbUpdateUser(username, { streak: newStreak, lastLoginDate: today, badges });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
    const updatedUser = await dbFindUser(username);
    console.log(`   👤 User Logged In: ${username} (streak: ${newStreak})`);
    res.json({ message: 'Login successful!', user: safeUser(updatedUser), token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Get Profile Endpoint
app.get('/api/profile/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// Update Profile Endpoint
app.put('/api/profile/:username', verifyToken, async (req, res) => {
  const { username } = req.params;
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { preferences, matchHistory, achievements, avatar, following, followers } = req.body;
    const updates = {};
    if (preferences) updates.preferences = { ...(user.preferences || {}), ...preferences };
    if (matchHistory) updates.matchHistory = matchHistory;
    if (achievements) updates.achievements = achievements;
    if (avatar !== undefined) updates.avatar = avatar;
    if (following !== undefined) updates.following = following;
    if (followers !== undefined) updates.followers = followers;

    const updated = await dbUpdateUser(username, updates);
    res.json({ message: 'Profile updated', user: safeUser(updated) });
  } catch (err) {
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// ── FanPoints Award ──
app.post('/api/fanpoints/award', verifyToken, async (req, res) => {
  const { username, points, reason } = req.body;
  if (!username || !points) return res.status(400).json({ error: 'username and points required' });

  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newPoints = (user.fanPoints || 0) + Number(points);
    const badges = [...(user.badges || [])];

    const tiers = [
      { threshold: 500,  name: '🥉 Bronze Fan' },
      { threshold: 1000, name: '🥈 Silver Fan' },
      { threshold: 2500, name: '🥇 Gold Fan' },
      { threshold: 5000, name: '💎 Diamond Fan' },
    ];
    const newBadges = [];
    for (const tier of tiers) {
      if (newPoints >= tier.threshold && !badges.find(b => b.name === tier.name)) {
        badges.push({ name: tier.name, earnedAt: Date.now() });
        newBadges.push(tier.name);
      }
    }

    const activityLog = [...(user.activityLog || [])];
    activityLog.unshift({ type: 'points', data: { points: Number(points), reason }, timestamp: Date.now() });

    await dbUpdateUser(username, { fanPoints: newPoints, badges, activityLog: activityLog.slice(0, 50) });
    const updated = await dbFindUser(username);
    console.log(`   🪙 FanPoints: +${points} to ${username} (${reason}) → total: ${newPoints}`);
    res.json({ message: 'Points awarded', user: safeUser(updated), newBadges, totalPoints: newPoints });
  } catch (err) {
    res.status(500).json({ error: 'Could not award points.' });
  }
});

// ── Predictions: Save a new prediction ──
app.post('/api/predictions/save', verifyToken, async (req, res) => {
  const { username, matchId, matchLabel, sport, teamPicked, teamPickedName, wager, odds } = req.body;
  if (!username || !matchId || !teamPicked) {
    return res.status(400).json({ error: 'username, matchId, teamPicked required' });
  }
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Cannot save prediction for another user.' });
  }
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const predictions = user.predictions || [];

    const existing = predictions.find(p => String(p.matchId) === String(matchId));
    if (existing) {
      return res.status(409).json({ error: 'Prediction already made for this match', prediction: existing });
    }

    const prediction = {
      id: `pred_${Date.now()}`,
      matchId: String(matchId),
      matchLabel: matchLabel || 'Unknown Match',
      sport: sport || 'unknown',
      teamPicked,
      teamPickedName: teamPickedName || teamPicked,
      wager: Number(wager) || 50,
      odds: Number(odds) || 1.8,
      potentialWin: Math.floor((Number(wager) || 50) * (Number(odds) || 1.8)),
      status: 'pending',
      outcome: null,
      pointsResult: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };

    const activityItem = { type: 'prediction', data: { match: matchLabel, sport }, timestamp: prediction.createdAt };
    const activityLog = [activityItem, ...(user.activityLog || [])].slice(0, 50);
    await dbUpdateUser(username, { predictions: [...predictions, prediction], activityLog });

    console.log(`   🔮 Prediction saved: ${username} picked ${teamPickedName} for ${matchLabel}`);
    res.status(201).json({ message: 'Prediction saved', prediction });
  } catch (err) {
    console.error('Prediction save error:', err.message);
    res.status(500).json({ error: 'Could not save prediction.' });
  }
});

async function resolveMatchPredictions(match) {
  if (match.status !== 'finished') return;

  const sport = match.sport?.toLowerCase();
  const teamA = match.teamA;
  const teamB = match.teamB;
  if (!teamA || !teamB) return;

  function parseScore(scoreStr) {
    if (!scoreStr) return 0;
    const m = String(scoreStr).match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }

  let winner = null;
  if (sport === 'f1') {
    const pA = parseScore(teamA.score);
    const pB = parseScore(teamB.score);
    if (pA > 0 && pB > 0) winner = pA < pB ? 'teamA' : 'teamB';
  } else {
    const sA = parseScore(teamA.score);
    const sB = parseScore(teamB.score);
    if (sA !== sB) winner = sA > sB ? 'teamA' : 'teamB';
  }
  if (!winner) return;

  try {
    const allUsers = await dbGetAllUsers();
    for (const user of allUsers) {
      const predictions = user.predictions || [];
      const predIdx = predictions.findIndex(p => String(p.matchId) === String(match.id) && p.status === 'pending');
      if (predIdx === -1) continue;

      const pred = { ...predictions[predIdx] };
      const isCorrect = pred.teamPicked === winner;
      pred.status = isCorrect ? 'correct' : 'incorrect';
      pred.outcome = winner;
      pred.resolvedAt = new Date().toISOString();

      let pointsDelta = 0;
      let newFanPoints = user.fanPoints || 0;
      const activityLog = [...(user.activityLog || [])];
      if (isCorrect) {
        pointsDelta = pred.potentialWin;
        newFanPoints += pointsDelta;
        activityLog.unshift({ type: 'points', data: { points: pointsDelta, reason: `Correct prediction: ${pred.matchLabel}` }, timestamp: pred.resolvedAt });
      } else {
        pointsDelta = -pred.wager;
        newFanPoints = Math.max(0, newFanPoints + pointsDelta);
      }
      pred.pointsResult = pointsDelta;

      const updatedPredictions = predictions.map((p, i) => i === predIdx ? pred : p);
      const badges = [...(user.badges || [])];
      if (isCorrect && !badges.find(b => b.name === '🔮 Oracle')) {
        badges.push({ name: '🔮 Oracle', earnedAt: new Date().toISOString() });
      }
      const correctCount = updatedPredictions.filter(p => p.status === 'correct').length;
      if (correctCount >= 5 && !badges.find(b => b.name === '🔮 Oracle Master')) {
        badges.push({ name: '🔮 Oracle Master', earnedAt: new Date().toISOString() });
      }

      await dbUpdateUser(user.username, {
        predictions: updatedPredictions,
        fanPoints: newFanPoints,
        badges,
        activityLog: activityLog.slice(0, 50),
      });

      console.log(`   🔮 Auto-Resolved: ${user.username} — ${pred.matchLabel} → ${isCorrect ? '✅ Correct' : '❌ Wrong'} (${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts)`);
      broadcastRealtime({
        type: 'activity',
        username: user.username,
        item: {
          type: 'prediction', username: user.username, avatar: user.avatar || '🦁',
          timestamp: pred.resolvedAt,
          data: { match: pred.matchLabel, sport: pred.sport, outcome: pred.status, points: pointsDelta },
        },
      });
    }
  } catch (err) {
    console.error('Auto-resolve predictions error:', err.message);
  }
}

// ── Predictions: Resolve a prediction (correct/incorrect) ──
app.post('/api/predictions/resolve', verifyToken, async (req, res) => {
  const { username, matchId, winner } = req.body;
  if (!username || !matchId || !winner) {
    return res.status(400).json({ error: 'username, matchId, winner required' });
  }
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const predictions = user.predictions || [];
    const predIdx = predictions.findIndex(p => String(p.matchId) === String(matchId) && p.status === 'pending');
    if (predIdx === -1) return res.status(404).json({ error: 'Pending prediction not found for this match' });

    const pred = { ...predictions[predIdx] };
    const isCorrect = pred.teamPicked === winner;
    pred.status = isCorrect ? 'correct' : 'incorrect';
    pred.outcome = winner;
    pred.resolvedAt = new Date().toISOString();

    let pointsDelta = 0;
    let newFanPoints = user.fanPoints || 0;
    const activityLog = [...(user.activityLog || [])];
    if (isCorrect) {
      pointsDelta = pred.potentialWin;
      newFanPoints += pointsDelta;
      activityLog.unshift({ type: 'points', data: { points: pointsDelta, reason: `Correct prediction: ${pred.matchLabel}` }, timestamp: pred.resolvedAt });
    } else {
      pointsDelta = -pred.wager;
      newFanPoints = Math.max(0, newFanPoints + pointsDelta);
    }
    pred.pointsResult = pointsDelta;

    const updatedPredictions = predictions.map((p, i) => i === predIdx ? pred : p);
    const badges = [...(user.badges || [])];
    if (isCorrect && !badges.find(b => b.name === '🔮 Oracle')) {
      badges.push({ name: '🔮 Oracle', earnedAt: new Date().toISOString() });
    }
    const correctCount = updatedPredictions.filter(p => p.status === 'correct').length;
    if (correctCount >= 5 && !badges.find(b => b.name === '🔮 Oracle Master')) {
      badges.push({ name: '🔮 Oracle Master', earnedAt: new Date().toISOString() });
    }

    await dbUpdateUser(username, {
      predictions: updatedPredictions,
      fanPoints: newFanPoints,
      badges,
      activityLog: activityLog.slice(0, 50),
    });
    const updated = await dbFindUser(username);
    console.log(`   🔮 Resolved: ${username} — ${pred.matchLabel} → ${isCorrect ? '✅ Correct' : '❌ Wrong'} (${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts)`);
    res.json({ message: 'Prediction resolved', prediction: pred, pointsDelta, user: safeUser(updated) });
  } catch (err) {
    console.error('Prediction resolve error:', err.message);
    res.status(500).json({ error: 'Could not resolve prediction.' });
  }
});

// ── Predictions: Get all predictions + accuracy stats ──
app.get('/api/predictions/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

  const predictions = (user.predictions || []).slice().reverse(); // newest first
  const total = predictions.length;
  const resolved = predictions.filter(p => p.status !== 'pending');
  const correct = predictions.filter(p => p.status === 'correct');
  const incorrect = predictions.filter(p => p.status === 'incorrect');
  const pending = predictions.filter(p => p.status === 'pending');
  const accuracyPct = resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0;
  const pointsWon = correct.reduce((sum, p) => sum + (p.potentialWin || 0), 0);
  const pointsLost = incorrect.reduce((sum, p) => sum + (p.wager || 0), 0);

  // Current correct streak
  let streak = 0;
  for (const p of predictions) {
    if (p.status === 'correct') streak++;
    else if (p.status === 'incorrect') break;
  }

  res.json({
    predictions,
    stats: {
      total,
      correct: correct.length,
      incorrect: incorrect.length,
      pending: pending.length,
      accuracyPct,
      pointsWon,
      pointsLost,
      netPoints: pointsWon - pointsLost,
      streak,
    },
  });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch predictions.' });
  }
});

// ── Trending ──
app.get('/api/trending', (req, res) => {
  const SPORT_META = {
    cricket: { label: 'Cricket', icon: '🏏' },
    football: { label: 'Football', icon: '⚽' },
    nba: { label: 'NBA', icon: '🏀' },
    tennis: { label: 'Tennis', icon: '🎾' },
    f1: { label: 'F1', icon: '🏎️' },
  };

  const now = Date.now();
  const results = Object.entries(trendingCounters)
    .filter(([, v]) => (now - v.lastReset) < TRENDING_WINDOW_MS)
    .map(([sport, v]) => ({
      sport,
      label: SPORT_META[sport]?.label || sport,
      icon: SPORT_META[sport]?.icon || '🏅',
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Fallback if no activity
  if (results.length < 3) {
    const fallback = [
      { sport: 'cricket', label: 'Cricket', icon: '🏏', count: 42 },
      { sport: 'football', label: 'Football', icon: '⚽', count: 38 },
      { sport: 'nba', label: 'NBA', icon: '🏀', count: 25 },
    ];
    for (const fb of fallback) {
      if (!results.find(r => r.sport === fb.sport)) results.push(fb);
      if (results.length >= 3) break;
    }
  }

  res.json(results.slice(0, 3));
});

// ── Highlights ──
app.get('/api/highlights', async (req, res) => {
  const now = Date.now();
  if (highlightsCache && (now - highlightsCacheTime) < HIGHLIGHTS_CACHE_TTL) {
    return res.json(highlightsCache);
  }

  const MOCK_HIGHLIGHTS = [
    { id: 1, sport: 'cricket', title: 'Rohit Sharma smashes 6 sixes in an over', summary: 'Mumbai Indians captain Rohit Sharma put on a stunning display, hitting 6 consecutive sixes in the 18th over against CSK at Wankhede Stadium.', matchContext: 'MI vs CSK, IPL 2026', timestamp: new Date().toISOString() },
    { id: 2, sport: 'football', title: 'Haaland hat-trick seals Champions League spot', summary: 'Erling Haaland scored a stunning hat-trick in the 89th minute to secure Manchester City a place in the Champions League semi-finals.', matchContext: 'Man City vs Real Madrid, UCL', timestamp: new Date().toISOString() },
    { id: 3, sport: 'nba', title: 'LeBron James breaks all-time scoring record again', summary: 'LeBron James added another milestone to his legendary career, surpassing his own all-time scoring record with a 40-point performance.', matchContext: 'Lakers vs Warriors, NBA', timestamp: new Date().toISOString() },
    { id: 4, sport: 'tennis', title: 'Alcaraz stuns Djokovic in five-set thriller', summary: 'Carlos Alcaraz defeated Novak Djokovic in an epic five-set match at the Australian Open, claiming his third Grand Slam title.', matchContext: 'Alcaraz vs Djokovic, AO Final', timestamp: new Date().toISOString() },
    { id: 5, sport: 'f1', title: 'Verstappen wins Monaco GP from P10 on grid', summary: 'Max Verstappen delivered one of the greatest drives in Formula 1 history, starting from 10th and winning the Monaco Grand Prix.', matchContext: 'Monaco GP, F1 2026', timestamp: new Date().toISOString() },
  ];

  if (!hasGemini) {
    highlightsCache = MOCK_HIGHLIGHTS;
    highlightsCacheTime = now;
    return res.json(MOCK_HIGHLIGHTS);
  }

  const prompt = `You are a sports news aggregator. Search the internet for the top 5 sports highlights from the last 24 hours.

Return ONLY valid JSON array (no markdown) in this format:
[
  {
    "id": 1,
    "sport": "<cricket|football|nba|tennis|f1>",
    "title": "<headline>",
    "summary": "<2-3 sentence summary>",
    "matchContext": "<teams/event>",
    "timestamp": "<ISO timestamp>"
  }
]

Return exactly 5 highlights. Return ONLY the JSON array.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });
    const data = await response.json();
    let jsonStr = (data.candidates?.[0]?.content?.parts?.[0]?.text || '[]').trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const arrayStart = jsonStr.indexOf('[');
    const arrayEnd = jsonStr.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) jsonStr = jsonStr.slice(arrayStart, arrayEnd + 1);
    const highlights = JSON.parse(jsonStr);
    highlightsCache = Array.isArray(highlights) ? highlights : MOCK_HIGHLIGHTS;
    highlightsCacheTime = now;
    console.log(`   ✅ Highlights: ${highlightsCache.length} items cached`);
    res.json(highlightsCache);
  } catch (err) {
    console.error('   ❌ Highlights error:', err.message);
    highlightsCache = MOCK_HIGHLIGHTS;
    highlightsCacheTime = now;
    res.json(MOCK_HIGHLIGHTS);
  }
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
      database: useDatabase ? 'mongodb' : 'in-memory',
      push: (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) ? 'configured' : 'missing',
      premium: stripe ? 'configured' : 'missing',
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
          model: 'gemini-2.5-flash',
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

// ── Cricket ──
const CRICAPI_KEY = process.env.CRICAPI_KEY; // Set a real key at https://cricapi.com — free tier available
app.get('/api/sports/cricket/live', async (req, res) => {
  // If Gemini AI scores are available, skip the cricket API entirely (already covered in /api/sports/ai-scores/all)
  if (isCacheValid('cricket')) {
    return res.json({ response: aiScoresCache.cricket.data, results: aiScoresCache.cricket.data.length, source: 'ai-cache' });
  }

  if (!CRICAPI_KEY) {
    return res.status(503).json({
      error: 'Cricket API key not configured. Set CRICAPI_KEY in .env (get a free key at https://cricapi.com)',
      fallback: true,
    });
  }

  try {
    const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}&offset=0`);
    if (!response.ok) throw new Error(`Cricket API ${response.status}`);
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.reason || 'CricAPI error');
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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

app.post('/api/ai/preview', async (req, res) => {
  const { matchContext } = req.body;

  const prompt = `You are a professional sports form analyst for the Esportsduniya platform.
  
FIRST: Search the internet for the LATEST head-to-head records, recent match form, team lineups, and news about this upcoming match.

MATCH TO RESEARCH:
${matchContext}

AFTER researching, return a JSON object (strictly formatted, no markdown code block formatting, no extra text) with a pre-game form analysis in the following schema:
{
  "winProbability": { "teamA": 50, "teamB": 50 },
  "teamAForm": ["W", "L", "W", "D", "W"],
  "teamBForm": ["L", "L", "W", "W", "D"],
  "headToHead": "ONE short sentence summary of past meetings.",
  "keyMatchups": [
    "Matchup 1 (max 8 words)",
    "Matchup 2 (max 8 words)"
  ],
  "summary": "ONE short sentence preview analysis."
}

IMPORTANT: Keep all descriptions extremely brief and concise. The total length of the JSON string must be under 300 characters. Do not include comments, annotations, or markdown tags like \`\`\`json. Return ONLY valid JSON.`;

  try {
    if (hasGemini) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      console.log('   🔍 AI Preview: Researching upcoming match via Gemini + Google Search...');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
      }

      const data = await response.json();
      console.log('   🔍 AI Preview candidate details:', JSON.stringify(data.candidates?.[0]));
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      console.log('   🔍 AI Preview raw response:', rawText);
      
      let jsonStr = rawText.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        jsonStr = fenceMatch[1].trim();
      }

      const objStart = jsonStr.indexOf('{');
      const objEnd = jsonStr.lastIndexOf('}');
      if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
        jsonStr = jsonStr.slice(objStart, objEnd + 1);
      }

      let parsed = {};
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        // Fallback cleanup: remove trailing commas or try resolving partial response if needed
        try {
          const cleaned = jsonStr.replace(/,\s*([}\]])/g, '$1');
          parsed = JSON.parse(cleaned);
        } catch (e) {
          console.error('   ❌ Failed to parse AI Preview JSON:', parseErr.message, 'Raw:', rawText);
          throw parseErr;
        }
      }
      res.json(parsed);
    } else {
      res.status(503).json({ error: 'No Gemini API key configured', fallback: true });
    }
  } catch (err) {
    console.error('   ❌ AI Preview error:', err.message);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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

function extractJsonObjects(text) {
  const objects = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (!inString) {
        inString = ch;
      } else if (inString === ch) {
        inString = false;
      }
      continue;
    }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) depth -= 1;
      if (depth === 0 && start !== -1) {
        objects.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return objects;
}

function parseJsonObjectFromText(rawText) {
  let text = (rawText || '').trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();
  const jsonMatch = text.match(/\{[\s\S]*\}$/);
  if (jsonMatch) text = jsonMatch[0];
  try {
    return JSON.parse(text);
  } catch {
    const objects = extractJsonObjects(text);
    if (objects.length > 0) {
      return JSON.parse(objects[0]);
    }
    throw new Error('Could not parse JSON object from text');
  }
}

app.post('/api/ai/fifa-prediction', async (req, res) => {
  const { match, teamAStats, teamBStats } = req.body;

  if (!match || !teamAStats || !teamBStats) {
    return res.status(400).json({ error: 'Missing required prediction payload. Provide match, teamAStats, and teamBStats.' });
  }

  if (!hasGemini) {
    return res.status(503).json({ error: 'No Gemini API key configured' });
  }

  const prompt = `You are a football analyst. Given these two teams' World Cup 2026 stats, provide: (1) predicted winner with confidence %, (2) predicted scoreline, (3) 3 key factors deciding this match, (4) one bold prediction. Return as JSON only: { winner, confidence, scoreline, factors[], boldPick }.`;
  const body = {
    contents: [{ parts: [{ text: `${prompt}\n\nTeam A stats:\n${JSON.stringify(teamAStats, null, 2)}\n\nTeam B stats:\n${JSON.stringify(teamBStats, null, 2)}\n\nMatch context:\n${JSON.stringify({
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      date: match.utcDate,
      venue: match.venue,
      competition: match.competition,
      stage: match.stage,
      status: match.status,
    }, null, 2)}\n\nReturn JSON only.` }] }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini ${response.status}: ${text}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseJsonObjectFromText(rawText);

    const prediction = {
      winner: parsed.winner || `${match.homeTeam.name} / ${match.awayTeam.name}`,
      confidence: Number(parsed.confidence || 0),
      scoreline: parsed.scoreline || '-',
      factors: Array.isArray(parsed.factors) ? parsed.factors : [],
      boldPick: parsed.boldPick || '',
    };

    res.json({ prediction });
  } catch (err) {
    console.error('   ❌ AI FIFA Prediction error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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

const standingsCache = {}; // { league: { data: [], timestamp: 0 } }
const STANDINGS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function isCacheValid(sport) {
  const entry = aiScoresCache[sport];
  return entry && (Date.now() - entry.timestamp) < AI_CACHE_TTL;
}

function isStandingsCacheValid(league) {
  const entry = standingsCache[league];
  return entry && (Date.now() - entry.timestamp) < STANDINGS_CACHE_TTL;
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

  const tryParse = (candidate) => {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const arrayStart = jsonStr.indexOf('[');
  const arrayEnd = jsonStr.lastIndexOf(']');
  if (arrayStart !== -1) {
    if (arrayEnd !== -1 && arrayEnd > arrayStart) {
      const candidate = jsonStr.slice(arrayStart, arrayEnd + 1);
      const parsed = tryParse(candidate);
      if (parsed) return parsed;
    }

    if (!jsonStr.endsWith(']')) {
      const candidate = jsonStr.slice(arrayStart) + ']';
      const parsed = tryParse(candidate);
      if (parsed) return parsed;
    }
  }

  const objectCandidates = extractJsonObjects(jsonStr);
  if (objectCandidates.length > 0) {
    const recovered = objectCandidates
      .map((obj) => {
        try {
          return JSON.parse(obj);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (recovered.length > 0) return recovered;
  }

  const candidates = [
    jsonStr,
    jsonStr.replace(/,\s*([}\]])/g, '$1'),
  ];

  let lastError;
  for (const candidate of candidates) {
    const parsed = tryParse(candidate);
    if (parsed) return parsed;
    try {
      JSON.parse(candidate);
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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

    // Detect score changes vs previous cache before updating
    const prev = aiScoresCache[sport]?.data || [];
    const liveMatches = matches.filter(m => m.status === 'live');

    // Update cache
    aiScoresCache[sport] = { data: matches, timestamp: Date.now() };

    // Auto-resolve any predictions for finished matches
    matches.forEach(resolveMatchPredictions);

    // ── Broadcast live score updates via WebSocket ──
    if (liveMatches.length > 0) {
      broadcastRealtime({
        type: 'score_update',
        sport,
        timestamp: new Date().toISOString(),
        matches: liveMatches.map(m => ({
          id: m.id,
          sport: m.sport,
          status: m.status,
          minute: m.minute,
          teamA: { name: m.teamA?.name, score: m.teamA?.score, flag: m.teamA?.flag },
          teamB: { name: m.teamB?.name, score: m.teamB?.score, flag: m.teamB?.flag },
          momentum: m.momentum,
          league: m.league,
          venue: m.venue,
        })),
      });
      console.log(`   📡 WS Broadcast: ${liveMatches.length} live ${sport} score updates`);
    }

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
  Object.keys(standingsCache).forEach(k => delete standingsCache[k]);
  console.log('   🔄 AI Scores & Standings cache cleared');
  res.json({ status: 'cache_cleared' });
});

// Mock Standings fallback
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

async function fetchStandingsViaGemini(league) {
  if (!hasGemini) throw new Error('No Gemini API key configured');

  const leaguePrompts = {
    football: `English Premier League (EPL) table/standings top 10 teams`,
    cricket: `Indian Premier League (IPL) points table/standings current season`,
    nba: `NBA standings leaders top 10 teams`,
    tennis: `ATP world rankings top 10 players`,
    f1: `Formula 1 Driver Championship standings top 10 drivers`
  };

  const topic = leaguePrompts[league] || leaguePrompts.football;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `You are a sports data API. Today is ${today}.
  
Search the internet for the LATEST real-time standings/rankings for the following: ${topic}.
Return a JSON array of the top 10 entries.

Format:
[
  {"team": "Name of team or player", "wins": Number, "losses": Number, "draws": Number, "points": Number}
]

Do not include markdown formatting like \`\`\`json. Return ONLY the raw valid JSON array.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  console.log(`   🔍 AI Search: Fetching standings for ${league} via Gemini + Google Search...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const parsed = parseJsonArrayFromText(rawText);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Parsed standings array is empty or invalid');
  }

  return parsed.map(item => ({
    team: String(item.team || item.name || item.player || 'Unknown'),
    wins: Number(item.wins ?? item.w ?? 0),
    losses: Number(item.losses ?? item.l ?? 0),
    draws: Number(item.draws ?? item.d ?? 0),
    points: Number(item.points ?? item.pts ?? 0),
  }));
}

// ── Standings Endpoint ──
app.get('/api/sports/standings/:league', async (req, res) => {
  const league = req.params.league;
  const validLeagues = ['football', 'cricket', 'nba', 'tennis', 'f1'];

  if (!validLeagues.includes(league)) {
    return res.status(400).json({ error: `Invalid league: ${league}. Use: ${validLeagues.join(', ')}` });
  }

  if (isStandingsCacheValid(league)) {
    console.log(`   📦 Standings Cache HIT for ${league}`);
    return res.json(standingsCache[league].data);
  }

  try {
    const data = await fetchStandingsViaGemini(league);
    standingsCache[league] = { data, timestamp: Date.now() };
    console.log(`   ✅ Standings fetched and cached for ${league}`);
    return res.json(data);
  } catch (err) {
    console.warn(`   ⚠️ Standings fetch failed for ${league}, using mock fallback. Reason:`, err.message);
    const fallbackData = MOCK_STANDINGS[league] || [];
    return res.json(fallbackData);
  }
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
// FAN ENGAGEMENT ENDPOINTS
// ============================================

// ── Leaderboard ──
app.get('/api/leaderboard', async (req, res) => {
  const window = req.query.window || 'alltime';
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  try {
    let allUsers = await dbGetAllUsers();
    let filtered = allUsers.filter(u => {
      if (window === 'today') return u.lastLoginDate === today;
      if (window === 'week') return u.lastLoginDate && u.lastLoginDate >= weekAgo;
      return true;
    });
    const ranked = filtered
      .sort((a, b) => (b.fanPoints || 0) - (a.fanPoints || 0))
      .slice(0, 50)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        fanPoints: u.fanPoints || 0,
        badges: u.badges || [],
        avatar: u.avatar || '🦁',
        favoriteSports: u.preferences?.favoriteSports || [],
        streak: u.streak || 0,
      }));
    res.json({ leaderboard: ranked, window });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch leaderboard.' });
  }
});

// ── Follow / Unfollow ──
app.post('/api/follow', verifyToken, async (req, res) => {
  const { follower, following } = req.body;
  try {
    const followerUser = await dbFindUser(follower);
    const followingUser = await dbFindUser(following);
    if (!followerUser || !followingUser) return res.status(404).json({ error: 'User not found' });

    const followerList = followerUser.following || [];
    if (!followerList.includes(following)) {
      await dbUpdateUser(follower, { following: [...followerList, following] });
      await dbUpdateUser(following, { followers: [...(followingUser.followers || []), follower] });
    }
    const updated = await dbFindUser(follower);
    res.json({ success: true, following: updated.following || [] });
  } catch (err) {
    res.status(500).json({ error: 'Could not follow user.' });
  }
});

app.delete('/api/follow', verifyToken, async (req, res) => {
  const { follower, following } = req.body;
  try {
    const followerUser = await dbFindUser(follower);
    const followingUser = await dbFindUser(following);
    if (!followerUser || !followingUser) return res.status(404).json({ error: 'User not found' });

    await dbUpdateUser(follower,  { following: (followerUser.following  || []).filter(u => u !== following) });
    await dbUpdateUser(following, { followers: (followingUser.followers || []).filter(u => u !== follower) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not unfollow user.' });
  }
});

// ── Post Activity ──
app.post('/api/activity', verifyToken, async (req, res) => {
  const { username, type, data } = req.body;
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const item = { id: Date.now(), type, data, timestamp: Date.now() };
    const activityLog = [item, ...(user.activityLog || [])].slice(0, 50);
    await dbUpdateUser(username, { activityLog });

    if (data?.sport) incrementTrending(data.sport);
    broadcastRealtime({ type: 'activity', username, item });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: 'Could not post activity.' });
  }
});

// ── Activity Feed (from followed users) ──
app.get('/api/activity-feed/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const following = user.following || [];
    const feed = [];

    for (const followedName of following) {
      const followedUser = await dbFindUser(followedName);
      if (followedUser?.activityLog) {
        followedUser.activityLog.slice(0, 10).forEach(item => {
          feed.push({ ...item, username: followedName, avatar: followedUser.avatar || '🦁' });
        });
      }
    }

    feed.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ feed: feed.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch activity feed.' });
  }
});

// ============================================
// PERSONALIZED FEED
// ============================================

app.get('/api/feed/:username', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const favoriteSports = user.preferences?.favoriteSports || [];

    // Collect feed items from activity log + followed users
    const feed = [];

    // Own recent activity
    (user.activityLog || []).slice(0, 20).forEach(item => {
      feed.push({ ...item, username: user.username, avatar: user.avatar || '🦁', source: 'self' });
    });

    // Followed users' activity
    for (const followedName of (user.following || [])) {
      const followedUser = await dbFindUser(followedName);
      if (followedUser?.activityLog) {
        followedUser.activityLog.slice(0, 10).forEach(item => {
          feed.push({ ...item, username: followedName, avatar: followedUser.avatar || '🦁', source: 'following' });
        });
      }
    }

    // Sort by timestamp descending
    feed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Filter by favorite sports if user has any configured
    const filtered = favoriteSports.length > 0
      ? feed.filter(item => !item.data?.sport || favoriteSports.includes(item.data.sport))
      : feed;

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + Number(limit));

    res.json({
      feed: paginated,
      total,
      page: Number(page),
      hasMore: skip + paginated.length < total,
      favoriteSports,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch feed.' });
  }
});

// ============================================
// DAILY CHALLENGES (Server-side)
// ============================================

const CHALLENGE_TEMPLATES = [
  { id: 'watch_3', title: 'Match Watcher', description: 'View 3 different live matches today', reward: 30, type: 'view_match', target: 3 },
  { id: 'predict_2', title: 'Oracle in Training', description: 'Make 2 Oracle predictions', reward: 40, type: 'predict', target: 2 },
  { id: 'cheer', title: 'Fan Zone Hero', description: 'Cheer in the Fan Zone for any match', reward: 20, type: 'cheer', target: 1 },
  { id: 'share', title: 'Spread the Word', description: 'Share a match result', reward: 25, type: 'share', target: 1 },
  { id: 'login', title: 'Daily Check-in', description: 'Log in and visit any page', reward: 10, type: 'login', target: 1 },
];

function generateDailyChallenges() {
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(c => ({
    ...c,
    progress: 0,
    completed: false,
    generatedAt: new Date().toISOString(),
  }));
}

// Get challenges for a user
app.get('/api/challenges/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0];
    let challenges = user.dailyChallenges;

    // Generate new challenges if none or stale (different day)
    if (!challenges || user.lastChallengeDate !== today) {
      challenges = generateDailyChallenges();
      await dbUpdateUser(req.params.username, { dailyChallenges: challenges, lastChallengeDate: today });
    }

    res.json({ challenges, date: today });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch challenges.' });
  }
});

// Update challenge progress
app.post('/api/challenges/:username/progress', verifyToken, async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });

  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0];
    let challenges = user.dailyChallenges;
    if (!challenges || user.lastChallengeDate !== today) {
      challenges = generateDailyChallenges();
    }

    let totalPointsAwarded = 0;
    const newBadges = [];
    const updatedChallenges = challenges.map(c => {
      if (c.completed || c.type !== type) return c;
      const newProgress = (c.progress || 0) + 1;
      const completed = newProgress >= c.target;
      if (completed && !c.completed) {
        totalPointsAwarded += c.reward;
      }
      return { ...c, progress: newProgress, completed };
    });

    // Check if all 3 challenges completed → bonus + streak
    const allDone = updatedChallenges.every(c => c.completed);
    let newStreak = user.streak || 0;
    let newFanPoints = (user.fanPoints || 0) + totalPointsAwarded;

    if (allDone) {
      const wasAlreadyAllDone = (challenges || []).every(c => c.completed);
      if (!wasAlreadyAllDone) {
        totalPointsAwarded += 25; // All-challenges bonus
        newFanPoints += 25;
        newStreak += 1;
        if (newStreak % 7 === 0) {
          const badgeName = `🔥 ${newStreak}-Day Streak`;
          const badges = [...(user.badges || [])];
          if (!badges.find(b => b.name === badgeName)) {
            badges.push({ name: badgeName, earnedAt: Date.now() });
            newBadges.push(badgeName);
            await dbUpdateUser(req.params.username, { badges });
          }
        }
      }
    }

    await dbUpdateUser(req.params.username, {
      dailyChallenges: updatedChallenges,
      lastChallengeDate: today,
      fanPoints: newFanPoints,
      streak: newStreak,
    });

    res.json({ challenges: updatedChallenges, pointsAwarded: totalPointsAwarded, newBadges });
  } catch (err) {
    res.status(500).json({ error: 'Could not update challenge.' });
  }
});

// Reset challenges at midnight UTC via cron
cron.schedule('0 0 * * *', async () => {
  console.log('   ⏰ Cron: Daily challenge reset triggered at midnight UTC');
  try {
    // Reset streak for users who didn't complete challenges yesterday
    const allUsers = await dbGetAllUsers();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    for (const user of allUsers) {
      if (user.lastChallengeDate && user.lastChallengeDate < yesterday) {
        // Missed challenges — reset streak
        const notAllDone = !(user.dailyChallenges || []).every(c => c.completed);
        if (notAllDone && (user.streak || 0) > 0) {
          await dbUpdateUser(user.username, { streak: 0 });
          console.log(`   🔥 Streak reset: ${user.username}`);
        }
      }
    }
    console.log('   ✅ Cron: Daily challenge reset complete');
  } catch (err) {
    console.error('   ❌ Cron error:', err.message);
  }
}, { timezone: 'UTC' });

// ============================================
// FANTASY-LITE PICKS
// ============================================

app.post('/api/fantasy/pick', verifyToken, async (req, res) => {
  const { username, matchId, matchLabel, sport, pick, pickType = 'team' } = req.body;
  if (!username || !matchId || !pick) {
    return res.status(400).json({ error: 'username, matchId, pick required' });
  }
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Cannot submit fantasy pick for another user.' });
  }

  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const fantasyPicks = user.fantasyPicks || [];
    const existing = fantasyPicks.find(p => String(p.matchId) === String(matchId));
    if (existing) {
      return res.status(409).json({ error: 'Fantasy pick already made for this match', pick: existing });
    }

    const fantasyPick = {
      id: `fp_${Date.now()}`,
      matchId: String(matchId),
      matchLabel: matchLabel || 'Unknown Match',
      sport: sport || 'unknown',
      pick,
      pickType,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await dbUpdateUser(username, { fantasyPicks: [...fantasyPicks, fantasyPick] });
    console.log(`   ⚡ Fantasy pick: ${username} picked ${pick} for ${matchLabel}`);
    res.status(201).json({ message: 'Fantasy pick saved', pick: fantasyPick });
  } catch (err) {
    res.status(500).json({ error: 'Could not save fantasy pick.' });
  }
});

app.get('/api/fantasy/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const picks = (user.fantasyPicks || []).slice().reverse();
    res.json({ picks, total: picks.length });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch fantasy picks.' });
  }
});

// ============================================
// PUSH NOTIFICATION ENDPOINTS
// ============================================

app.get('/api/push/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured on server.' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', verifyToken, async (req, res) => {
  const { username, subscription } = req.body;
  if (!username || !subscription) {
    return res.status(400).json({ error: 'username and subscription required' });
  }
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const subs = user.pushSubscriptions || [];
    const exists = subs.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      await dbUpdateUser(username, { pushSubscriptions: [...subs, subscription] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not save push subscription.' });
  }
});

app.post('/api/push/unsubscribe', verifyToken, async (req, res) => {
  const { username, endpoint } = req.body;
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const subs = (user.pushSubscriptions || []).filter(s => s.endpoint !== endpoint);
    await dbUpdateUser(username, { pushSubscriptions: subs });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove subscription.' });
  }
});

// Internal helper: send push to a user
async function sendPushToUser(username, payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const user = await dbFindUser(username);
    if (!user?.pushSubscriptions?.length) return;
    const message = JSON.stringify(payload);
    for (const sub of user.pushSubscriptions) {
      try {
        await webpush.sendNotification(sub, message);
      } catch (err) {
        if (err.statusCode === 410) {
          // Subscription expired — remove it
          const subs = (user.pushSubscriptions || []).filter(s => s.endpoint !== sub.endpoint);
          await dbUpdateUser(username, { pushSubscriptions: subs });
        }
      }
    }
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
}

// ============================================
// OPEN GRAPH / SEO ENDPOINT
// ============================================

app.get('/api/og/:matchId', optionalAuth, (req, res) => {
  const { matchId } = req.params;
  const { teamA, teamB, sport, league, score } = req.query;

  const sportEmojis = { cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏁' };
  const icon = sportEmojis[sport] || '🏅';
  const title = teamA && teamB
    ? `${icon} ${teamA} vs ${teamB} — Live on Esportsduniya`
    : 'Live Sports Scores — Esportsduniya';
  const description = score
    ? `${teamA} ${score} | Live ${league || sport} scores, AI commentary & predictions — Esportsduniya.in`
    : `Watch live ${league || sport || 'sports'} scores, get AI commentary & make Oracle predictions on Esportsduniya.in`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://www.esportsduniya.in/favicon.svg">
  <meta property="og:url" content="https://www.esportsduniya.in/#match/${matchId}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta http-equiv="refresh" content="0; url=https://www.esportsduniya.in/#match/${matchId}">
</head>
<body><p>Redirecting to match...</p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ============================================
// STRIPE PREMIUM TIER
// ============================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY);
  console.log('   ✅ Stripe: Premium billing configured');
} else {
  console.log('   ℹ️  Stripe: No STRIPE_SECRET_KEY — premium tier disabled');
}

app.post('/api/premium/checkout', verifyToken, async (req, res) => {
  if (!stripe || !STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Premium billing not configured.' });
  }
  const { username } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `https://www.esportsduniya.in/#profile?premium=success`,
      cancel_url: `https://www.esportsduniya.in/#profile?premium=cancelled`,
      metadata: { username },
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/premium/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured.' });
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const username = session.metadata?.username;
    if (username) {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await dbUpdateUser(username, { isPremium: true, premiumExpiry: expiry });
      console.log(`   💎 Premium activated: ${username}`);
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    // Handle cancellation if username is available
  }
  res.json({ received: true });
});

app.get('/api/premium/status/:username', async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isPremium = user.isPremium && (!user.premiumExpiry || new Date(user.premiumExpiry) > new Date());
    res.json({ isPremium, premiumExpiry: user.premiumExpiry || null });
  } catch (err) {
    res.status(500).json({ error: 'Could not check premium status.' });
  }
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
