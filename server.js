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
import sanitizeHtml from 'sanitize-html';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import nodemailer from 'nodemailer';
import * as Sentry from '@sentry/node';

config(); // Load .env

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('   ✅ Sentry: Error tracking configured');
}

// ── P0-1: Fail-fast on missing secrets in production ──
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (IS_PROD ? null : 'esd-dev-secret-DO-NOT-USE-IN-PROD');
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET must be set in production. Exiting.');
  process.exit(1);
}
const SALT_ROUNDS = 10;

const app = express();

// ── P0-2: Security headers ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://esportsduniya.onrender.com", "wss://esportsduniya.onrender.com", "ws://localhost:*", "http://localhost:*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── P0-6: CORS allowlist ──
const ALLOWED_ORIGINS = [
  'https://esportsduniya.in',
  'https://www.esportsduniya.in',
  'https://esportsduniya.pages.dev',
];
if (!IS_PROD) ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3001', 'http://127.0.0.1:5173');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit: '100kb' }));

// ── P0-3: Rate limiting ──
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached. Try again later.' },
});

// Live sports API responses must never be cached by browsers/CDNs
app.use('/api/sports', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

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

// ── Email (Nodemailer) ──
let emailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log('   ✅ Email: SMTP configured');
} else {
  console.log('   ℹ️  Email: No SMTP config — email features disabled (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
}

async function sendEmail(to, subject, html) {
  if (!emailTransporter) {
    console.warn('   ⚠️  Email not configured, skipping:', subject);
    return false;
  }
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'Esportsduniya <noreply@esportsduniya.in>',
      to, subject, html,
    });
    return true;
  } catch (err) {
    console.error('   ❌ Email send failed:', err.message);
    return false;
  }
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
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
const DEFAULT_DB_NAME = 'esportsduniya';
let useDatabase = false;
let mongoConnectionError = null;
let mongoUriWarnings = [];

/** Strip quotes/whitespace and fix common Atlas URI mistakes before connecting. */
function normalizeMongoUri(raw) {
  if (!raw) return { uri: null, warnings: [], error: null };

  let uri = String(raw).trim().replace(/^["']|["']$/g, '');
  const warnings = [];

  if (/<[^>]+>/.test(uri)) {
    return {
      uri: null,
      warnings: ['Replace placeholder tokens like <password> or <db_password> with your real password'],
      error: 'placeholder_in_uri',
    };
  }

  if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
    return {
      uri: null,
      warnings: ['MONGODB_URI must start with mongodb+srv:// or mongodb://'],
      error: 'invalid_protocol',
    };
  }

  // Atlas strings copied without a database name: ...mongodb.net/?appName=...
  if (/\.mongodb\.net\/?(\?|$)/.test(uri)) {
    uri = uri.replace(/(\.mongodb\.net)\/?(\?|$)/, `$1/${DEFAULT_DB_NAME}$2`);
    warnings.push(`Added "/${DEFAULT_DB_NAME}" database name to URI (path was missing)`);
  }

  // Ensure standard query params for Atlas SRV connections
  if (uri.startsWith('mongodb+srv://')) {
    if (!/[?&]retryWrites=/.test(uri)) {
      uri += uri.includes('?') ? '&retryWrites=true' : '?retryWrites=true';
      warnings.push('Added retryWrites=true to URI');
    }
    if (!/[?&]w=/.test(uri)) {
      uri += '&w=majority';
    }
  }

  try {
    const probe = uri.replace(/^mongodb\+srv:\/\//, 'https://').replace(/^mongodb:\/\//, 'http://');
    const parsed = new URL(probe);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return {
        uri: null,
        warnings: ['URI hostname looks invalid — copy the full string from MongoDB Atlas → Connect → Drivers'],
        error: 'invalid_hostname',
      };
    }
  } catch (err) {
    return {
      uri: null,
      warnings: [
        'Could not parse MONGODB_URI — check for unencoded special characters in the password (@ # : / ? need URL-encoding)',
        err.message,
      ],
      error: 'parse_failed',
    };
  }

  return { uri, warnings, error: null };
}

const mongoNormalized = normalizeMongoUri(process.env.MONGODB_URI);
const MONGODB_URI = mongoNormalized.uri;
mongoUriWarnings = mongoNormalized.warnings;

if (process.env.MONGODB_URI && !MONGODB_URI) {
  mongoConnectionError = mongoNormalized.error || 'invalid_uri';
  console.warn('   ⚠️  MongoDB: Invalid MONGODB_URI — using in-memory store');
  mongoUriWarnings.forEach(msg => console.warn('      ', msg));
} else if (mongoUriWarnings.length) {
  console.log('   ℹ️  MongoDB: URI auto-corrected:');
  mongoUriWarnings.forEach(msg => console.log('      ', msg));
}

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
  email:              { type: String, sparse: true, default: null },
  emailVerified:      { type: Boolean, default: false },
  emailVerifyToken:   { type: String, default: null },
  emailVerifyExpiry:  { type: Date, default: null },
  resetToken:         { type: String, default: null },
  resetTokenExpiry:   { type: Date, default: null },
  dailyChallenges:    { type: mongoose.Schema.Types.Mixed, default: null },
  lastChallengeDate:  { type: String, default: null },
  fantasyPicks:       { type: Array, default: [] },
  arenaStats:         {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ calibrationScore: 50, seasonPoints: 0, weekId: null }),
  },
}, { timestamps: true });

userSchema.index({ fanPoints: -1 });
userSchema.index({ 'arenaStats.weekId': 1, 'arenaStats.seasonPoints': -1 });
userSchema.index({ email: 1 }, { sparse: true });
userSchema.index({ emailVerifyToken: 1 }, { sparse: true });
userSchema.index({ resetToken: 1 }, { sparse: true });
userSchema.index({ lastLoginDate: -1 });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── Mongoose Article Schema ──
const articleSchema = new mongoose.Schema({
  slug:            { type: String, required: true, unique: true },
  title:           { type: String, required: true },
  metaDescription: { type: String, required: true },
  category:        { type: String, default: 'general' },
  keywords:        { type: [String], default: [] },
  contentHtml:     { type: String, required: true },
  wordCount:       { type: Number, default: 0 },
  readTime:        { type: Number, default: 5 },
  publishedAt:     { type: Date, default: Date.now },
  imageUrl:        { type: String, default: '' },
}, { timestamps: true });

const Article = mongoose.models.Article || mongoose.model('Article', articleSchema);

const fanZoneSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  cheers: {
    teamA: { type: Number, default: 0 },
    teamB: { type: Number, default: 0 },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
const FanZoneState = mongoose.models.FanZoneState || mongoose.model('FanZoneState', fanZoneSchema);

const predictionPoolSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true, index: true },
  totals: {
    teamA: { type: Number, default: 0 },
    teamB: { type: Number, default: 0 },
  },
  points: {
    teamA: { type: Number, default: 0 },
    teamB: { type: Number, default: 0 },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });
const PredictionPoolState = mongoose.models.PredictionPoolState || mongoose.model('PredictionPoolState', predictionPoolSchema);

const trendingCounterSchema = new mongoose.Schema({
  sport: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  lastReset: { type: Date, default: Date.now },
}, { timestamps: true });
const TrendingCounter = mongoose.models.TrendingCounter || mongoose.model('TrendingCounter', trendingCounterSchema);

const momentSchema = new mongoose.Schema({
  matchId: String,
  sport: String,
  eventType: String,
  title: String,
  aiLine: String,
  matchLabel: String,
  createdAt: { type: Date, default: Date.now, expires: 86400 },
}, { timestamps: true });
const Moment = mongoose.models.Moment || mongoose.model('Moment', momentSchema);

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
      useDatabase = true;
      mongoConnectionError = null;
      console.log('   ✅ MongoDB: Connected');
    })
    .catch(err => {
      useDatabase = false;
      mongoConnectionError = err.message;
      console.warn('   ⚠️  MongoDB: Connection failed — falling back to in-memory store');
      console.warn('   ', err.message);
      if (/bad auth|authentication failed/i.test(err.message)) {
        console.warn('      Hint: verify username/password in Atlas → Database Access, and URL-encode special chars in password');
      }
    });

  mongoose.connection.on('disconnected', () => {
    useDatabase = false;
    console.warn('   ⚠️  MongoDB: Disconnected — using in-memory store until reconnected');
  });
  mongoose.connection.on('reconnected', () => {
    useDatabase = true;
    mongoConnectionError = null;
    console.log('   ✅ MongoDB: Reconnected');
  });
} else if (!process.env.MONGODB_URI) {
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

// ── Article DB helpers (unified API for in-memory + MongoDB) ──
async function dbSaveArticle(data) {
  const safe = { ...data, contentHtml: sanitizeArticleHtml(data.contentHtml) };
  if (useDatabase) {
    try {
      const article = new Article(safe);
      await article.save();
      return article.toObject();
    } catch (err) {
      if (err.code === 11000) return null; // duplicate slug — skip silently
      throw err;
    }
  }
  if (articles.some(a => a.slug === safe.slug)) return null;
  articles.push(safe);
  return safe;
}

async function dbFindArticleBySlug(slug) {
  if (useDatabase) return Article.findOne({ slug }).lean();
  return articles.find(a => a.slug === slug) || null;
}

async function dbGetArticles(limit = 50, category = null) {
  if (useDatabase) {
    const query = category ? { category } : {};
    return Article.find(query).sort({ publishedAt: -1 }).limit(limit).lean();
  }
  const pool = category ? articles.filter(a => a.category === category) : articles;
  return [...pool].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, limit);
}

// ── In-memory stores ──
const users = []; // In-memory fallback (used when MONGODB_URI is not set)
let articles = []; // In-memory article store (upgrades to MongoDB when connected)
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

// ── Highlights cache ──
let highlightsCache = null;
let highlightsCacheTime = 0;
const HIGHLIGHTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper to find a user (in-memory fallback only)
const findUser = (username) => users.find(u => u.username === username);

function getWeekId() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function computeCalibrationScore(predictions) {
  const resolved = (predictions || []).filter(p => p.status === 'correct' || p.status === 'incorrect');
  if (resolved.length === 0) return 50;
  const correct = resolved.filter(p => p.status === 'correct').length;
  const winRate = correct / resolved.length;
  const confidence = Math.min(1, resolved.length / 20);
  return Math.round((50 * (1 - confidence)) + ((50 + (winRate - 0.5) * 100) * confidence));
}

function updateArenaStatsFromPrediction(user, isCorrect, pointsDelta) {
  const weekId = getWeekId();
  const prev = user.arenaStats || { calibrationScore: 50, seasonPoints: 0, weekId };
  const seasonPoints = (prev.weekId === weekId ? prev.seasonPoints : 0) + (isCorrect ? Math.max(0, pointsDelta) : 0);
  const predictions = user.predictions || [];
  return {
    calibrationScore: computeCalibrationScore(predictions),
    seasonPoints,
    weekId,
  };
}

async function getFanZone(matchId) {
  const key = String(matchId || 'global');
  if (useDatabase) {
    let doc = await FanZoneState.findOne({ matchId: key }).lean();
    if (!doc) {
      doc = (await FanZoneState.create({ matchId: key, cheers: { teamA: 0, teamB: 0 } })).toObject();
    }
    return { matchId: doc.matchId, cheers: doc.cheers, updatedAt: new Date(doc.updatedAt).getTime() };
  }
  if (!fanZoneState.has(key)) {
    fanZoneState.set(key, { matchId: key, cheers: { teamA: 0, teamB: 0 }, updatedAt: Date.now() });
  }
  return fanZoneState.get(key);
}

async function saveFanZone(state) {
  if (useDatabase) {
    await FanZoneState.findOneAndUpdate(
      { matchId: state.matchId },
      { $set: { cheers: state.cheers, updatedAt: new Date(state.updatedAt || Date.now()) } },
      { upsert: true, new: true },
    );
    return;
  }
  fanZoneState.set(state.matchId, state);
}

async function getPredictionPool(matchId) {
  const key = String(matchId || 'global');
  if (useDatabase) {
    let doc = await PredictionPoolState.findOne({ matchId: key }).lean();
    if (!doc) {
      doc = (await PredictionPoolState.create({
        matchId: key,
        totals: { teamA: 0, teamB: 0 },
        points: { teamA: 0, teamB: 0 },
      })).toObject();
    }
    return {
      matchId: doc.matchId,
      totals: doc.totals,
      points: doc.points,
      updatedAt: new Date(doc.updatedAt).getTime(),
    };
  }
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

async function savePredictionPool(pool) {
  if (useDatabase) {
    await PredictionPoolState.findOneAndUpdate(
      { matchId: pool.matchId },
      { $set: { totals: pool.totals, points: pool.points, updatedAt: new Date(pool.updatedAt || Date.now()) } },
      { upsert: true, new: true },
    );
    return;
  }
  predictionState.set(pool.matchId, pool);
}

async function incrementTrending(sport) {
  const now = Date.now();
  if (useDatabase) {
    let doc = await TrendingCounter.findOne({ sport }).lean();
    if (!doc || (now - new Date(doc.lastReset).getTime()) > TRENDING_WINDOW_MS) {
      await TrendingCounter.findOneAndUpdate(
        { sport },
        { $set: { count: 1, lastReset: new Date(now) } },
        { upsert: true },
      );
      return;
    }
    await TrendingCounter.updateOne({ sport }, { $inc: { count: 1 } });
    return;
  }
  const counter = getTrendingCounter(sport);
  counter.count += 1;
}

function detectScoreMoments(prevMatches, newMatches) {
  if (!prevMatches?.length || !newMatches?.length) return;
  const prevById = Object.fromEntries(prevMatches.map(m => [String(m.id), m]));
  for (const m of newMatches) {
    if (m.status !== 'live') continue;
    const prev = prevById[String(m.id)];
    if (!prev) continue;
    const changed = prev.teamA?.score !== m.teamA?.score || prev.teamB?.score !== m.teamB?.score;
    if (!changed) continue;
    broadcastRealtime({
      type: 'moment_event',
      matchId: m.id,
      sport: m.sport,
      eventType: 'score_change',
      title: `${m.teamA?.name} ${m.teamA?.score} – ${m.teamB?.score} ${m.teamB?.name}`,
      match: m,
    });
  }
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
app.post('/api/register', authLimiter, async (req, res) => {
  const { username, password, email } = req.body;
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

    const emailVerifyToken = email ? generateToken() : null;
    const emailVerifyExpiry = email ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

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
      email: email || null,
      emailVerified: false,
      emailVerifyToken,
      emailVerifyExpiry,
    };

    const created = await dbCreateUser(newUser);
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`   👤 New User Registered: ${username}`);

    if (email && emailVerifyToken) {
      const verifyUrl = `https://esportsduniya.in/verify-email?token=${emailVerifyToken}`;
      sendEmail(email, 'Verify your Esportsduniya email',
        `<h2>Welcome to Esportsduniya!</h2><p>Click below to verify your email:</p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1ee6a7;color:#000;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a><p>This link expires in 24 hours.</p>`
      );
    }

    res.status(201).json({ message: 'Registration successful!', user: safeUser(created), token });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login Endpoint
app.post('/api/login', authLimiter, async (req, res) => {
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

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    const updatedUser = await dbFindUser(username);
    console.log(`   👤 User Logged In: ${username} (streak: ${newStreak})`);
    res.json({ message: 'Login successful!', user: safeUser(updatedUser), token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── Email Verification Endpoints ──
app.get('/api/verify-email', authLimiter, async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const allUsers = await dbGetAllUsers();
    const user = allUsers.find(u => u.emailVerifyToken === token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    if (user.emailVerifyExpiry && new Date(user.emailVerifyExpiry) < new Date()) {
      return res.status(400).json({ error: 'Token expired. Please request a new verification email.' });
    }

    await dbUpdateUser(user.username, {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    });

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/resend-verification', authLimiter, verifyToken, async (req, res) => {
  try {
    const user = await dbFindUser(req.user.username);
    if (!user?.email) return res.status(400).json({ error: 'No email on account' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const token = generateToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await dbUpdateUser(user.username, { emailVerifyToken: token, emailVerifyExpiry: expiry });

    const verifyUrl = `https://esportsduniya.in/verify-email?token=${token}`;
    await sendEmail(user.email, 'Verify your Esportsduniya email',
      `<h2>Verify your email</h2><p>Click below to verify your Esportsduniya account:</p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1ee6a7;color:#000;border-radius:8px;text-decoration:none;font-weight:bold">Verify Email</a><p>This link expires in 24 hours.</p>`
    );

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Could not send verification email' });
  }
});

// ── Password Reset Endpoints ──
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const allUsers = await dbGetAllUsers();
    const user = allUsers.find(u => u.email === email && u.emailVerified);

    if (!user) return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });

    const token = generateToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await dbUpdateUser(user.username, { resetToken: token, resetTokenExpiry: expiry });

    const resetUrl = `https://esportsduniya.in/reset-password?token=${token}`;
    await sendEmail(user.email, 'Reset your Esportsduniya password',
      `<h2>Password Reset</h2><p>Click below to reset your password:</p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#1ee6a7;color:#000;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`
    );

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not process request' });
  }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const allUsers = await dbGetAllUsers();
    const user = allUsers.find(u => u.resetToken === token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await dbUpdateUser(user.username, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not reset password' });
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
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Cannot modify another user\'s profile.' });
  }
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

// ── FanPoints Award (server-authoritative — client sends action key, not amount) ──
const FAN_POINT_ACTIONS = {
  cheer: 5,
  prediction: 10,
  share: 15,
  daily_challenge: 20,
  streak_bonus: 25,
  first_prediction: 50,
};

app.post('/api/fanpoints/award', verifyToken, async (req, res) => {
  const { username, action, reason } = req.body;
  if (!username || !action) return res.status(400).json({ error: 'username and action required' });
  const points = FAN_POINT_ACTIONS[action];
  if (!points) return res.status(400).json({ error: `Invalid action. Use: ${Object.keys(FAN_POINT_ACTIONS).join(', ')}` });
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Cannot award points to another user.' });
  }

  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newPoints = (user.fanPoints || 0) + points;
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
    activityLog.unshift({ type: 'points', data: { points, reason: reason || action }, timestamp: Date.now() });

    await dbUpdateUser(username, { fanPoints: newPoints, badges, activityLog: activityLog.slice(0, 50) });
    const updated = await dbFindUser(username);
    console.log(`   🪙 FanPoints: +${points} to ${username} (${action}) → total: ${newPoints}`);
    res.json({ message: 'Points awarded', user: safeUser(updated), newBadges, totalPoints: newPoints });
  } catch (err) {
    res.status(500).json({ error: 'Could not award points.' });
  }
});

// ── Predictions: Save a new prediction ──
app.post('/api/predictions/save', verifyToken, async (req, res) => {
  const { username, matchId, matchLabel, sport, teamPicked, teamPickedName } = req.body;
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

    const SERVER_WAGER = 50;
    const SERVER_ODDS = 1.8;
    const prediction = {
      id: `pred_${Date.now()}`,
      matchId: String(matchId),
      matchLabel: matchLabel || 'Unknown Match',
      sport: sport || 'unknown',
      teamPicked,
      teamPickedName: teamPickedName || teamPicked,
      wager: SERVER_WAGER,
      odds: SERVER_ODDS,
      potentialWin: Math.floor(SERVER_WAGER * SERVER_ODDS),
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
    if (scoreStr == null) return NaN;
    if (typeof scoreStr === 'number') return scoreStr;
    const s = String(scoreStr).trim();
    if (!s) return NaN;
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : NaN;
  }

  let winner = null;
  const sA = parseScore(teamA.score);
  const sB = parseScore(teamB.score);

  if (isNaN(sA) || isNaN(sB)) return;

  if (sport === 'f1') {
    if (sA > 0 && sB > 0) winner = sA < sB ? 'teamA' : (sB < sA ? 'teamB' : null);
  } else if (sport === 'cricket') {
    if (match.result) {
      const rLower = match.result.toLowerCase();
      const aName = (teamA.name || '').toLowerCase();
      const bName = (teamB.name || '').toLowerCase();
      if (aName && rLower.includes(aName) && rLower.includes('won')) winner = 'teamA';
      else if (bName && rLower.includes(bName) && rLower.includes('won')) winner = 'teamB';
      else if (rLower.includes('draw') || rLower.includes('tied') || rLower.includes('no result')) winner = null;
      else if (sA !== sB) winner = sA > sB ? 'teamA' : 'teamB';
    } else {
      if (sA !== sB) winner = sA > sB ? 'teamA' : 'teamB';
    }
  } else {
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

      const userWithPreds = { ...user, predictions: updatedPredictions };
      const arenaStats = updateArenaStatsFromPrediction(userWithPreds, isCorrect, pointsDelta);

      await dbUpdateUser(user.username, {
        predictions: updatedPredictions,
        fanPoints: newFanPoints,
        badges,
        activityLog: activityLog.slice(0, 50),
        arenaStats,
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
app.get('/api/trending', async (req, res) => {
  const SPORT_META = {
    cricket: { label: 'Cricket', icon: '🏏' },
    football: { label: 'Football', icon: '⚽' },
    nba: { label: 'NBA', icon: '🏀' },
    tennis: { label: 'Tennis', icon: '🎾' },
    f1: { label: 'F1', icon: '🏎️' },
  };

  const now = Date.now();
  let results = [];

  if (useDatabase) {
    const docs = await TrendingCounter.find({}).lean();
    results = docs
      .filter(v => (now - new Date(v.lastReset).getTime()) < TRENDING_WINDOW_MS)
      .map(v => ({
        sport: v.sport,
        label: SPORT_META[v.sport]?.label || v.sport,
        icon: SPORT_META[v.sport]?.icon || '🏅',
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  } else {
    results = Object.entries(trendingCounters)
      .filter(([, v]) => (now - v.lastReset) < TRENDING_WINDOW_MS)
      .map(([sport, v]) => ({
        sport,
        label: SPORT_META[sport]?.label || sport,
        icon: SPORT_META[sport]?.icon || '🏅',
        count: v.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  res.json({ trending: results.slice(0, 3), source: results.length > 0 ? 'activity' : 'empty' });
});

// ── Highlights ──
app.get('/api/highlights', async (req, res) => {
  const now = Date.now();
  if (highlightsCache && (now - highlightsCacheTime) < HIGHLIGHTS_CACHE_TTL) {
    return res.json(highlightsCache);
  }

  if (!hasGemini) {
    const empty = { highlights: [], source: 'unavailable' };
    highlightsCache = empty;
    highlightsCacheTime = now;
    return res.json(empty);
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
    const list = Array.isArray(highlights) ? highlights : [];
    highlightsCache = { highlights: list, source: list.length > 0 ? 'gemini' : 'empty' };
    highlightsCacheTime = now;
    console.log(`   ✅ Highlights: ${list.length} items cached`);
    res.json(highlightsCache);
  } catch (err) {
    console.error('   ❌ Highlights error:', err.message);
    const empty = { highlights: [], source: 'unavailable', error: err.message };
    highlightsCache = empty;
    highlightsCacheTime = now;
    res.json(empty);
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
  const dbStatus = useDatabase
    ? 'mongodb'
    : process.env.MONGODB_URI
      ? (mongoConnectionError ? 'connection-failed' : 'connecting')
      : 'in-memory';

  const hasCricAPI = isKeySet(process.env.CRICAPI_KEY, 'your_cricapi_key_here');

  res.json({
    status: 'ok',
    apis: {
      sports: hasRapidAPI ? 'configured' : 'missing',
      cricapi: hasCricAPI ? 'configured' : 'missing',
      aiScores: hasGemini ? 'configured' : 'missing',
      openai: hasOpenAI ? 'configured' : 'missing',
      gemini: hasGemini ? 'configured' : 'missing',
      database: dbStatus,
      push: (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) ? 'configured' : 'missing',
      premium: stripe ? 'configured' : 'missing',
    },
    ...(mongoConnectionError && { databaseError: mongoConnectionError }),
    ...(mongoUriWarnings.length && !useDatabase && { databaseUriHints: mongoUriWarnings }),
  });
});

app.get('/api/stats/public', async (req, res) => {
  try {
    if (useDatabase) {
      const [totalUsers, totalPredictions] = await Promise.all([
        User.countDocuments({}),
        User.aggregate([{ $project: { count: { $size: { $ifNull: ['$predictions', []] } } } }, { $group: { _id: null, total: { $sum: '$count' } } }]),
      ]);
      return res.json({
        users: totalUsers,
        predictions: totalPredictions[0]?.total || 0,
        sports: 5,
      });
    }
    const allUsers = await dbGetAllUsers();
    res.json({
      users: allUsers.length,
      predictions: allUsers.reduce((sum, u) => sum + (u.predictions?.length || 0), 0),
      sports: 5,
    });
  } catch {
    res.json({ users: 0, predictions: 0, sports: 5 });
  }
});

// ============================================
// Curated Crowd Pulse (Fan Zone — not live telemetry)
// ============================================
const CURATED_CROWD_PULSE = [
  { name: 'Mumbai', x: 68, y: 42, fans: '2.3M', intensity: 95, emoji: '🇮🇳' },
  { name: 'London', x: 48, y: 22, fans: '1.8M', intensity: 78, emoji: '🇬🇧' },
  { name: 'Melbourne', x: 82, y: 72, fans: '1.1M', intensity: 65, emoji: '🇦🇺' },
  { name: 'New York', x: 25, y: 28, fans: '890K', intensity: 55, emoji: '🇺🇸' },
  { name: 'São Paulo', x: 30, y: 62, fans: '1.5M', intensity: 82, emoji: '🇧🇷' },
  { name: 'Tokyo', x: 82, y: 30, fans: '720K', intensity: 48, emoji: '🇯🇵' },
  { name: 'Dubai', x: 60, y: 38, fans: '550K', intensity: 60, emoji: '🇦🇪' },
  { name: 'Lagos', x: 50, y: 50, fans: '920K', intensity: 70, emoji: '🇳🇬' },
];

app.get('/api/crowdpulse', async (req, res) => {
  if (!hasGemini) {
    return res.json({ regions: CURATED_CROWD_PULSE, source: 'curated' });
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
    res.json({ regions: result.regions || [], source: 'ai' });
  } catch (err) {
    console.error('   ❌ Crowd Pulse AI error:', err.message);
    res.json({ regions: CURATED_CROWD_PULSE, source: 'curated' });
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
  const result = await getRealSportLive('football');
  if (result.source === 'unavailable' && !result.matches.length) {
    return res.status(502).json({ error: result.error || 'Football scores unavailable', fallback: true, ...result });
  }
  console.log(`   ✅ Football (${result.source}${result.stale ? ', cached' : ''}): ${result.matches.length} matches`);
  res.json({ response: result.matches, results: result.matches.length, ...result });
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

// ── Cricket Match Detail (scorecard / ball-by-ball) ──
app.get('/api/sports/cricket/match/:id', async (req, res) => {
  if (!hasCricAPI) {
    return res.status(503).json({ error: 'Cricket match detail unavailable — CRICAPI_KEY not configured' });
  }
  try {
    const id = req.params.id;
    const [infoRes, scoreRes] = await Promise.all([
      fetch(`https://api.cricapi.com/v1/match_info?apikey=${CRICAPI_KEY}&id=${id}`),
      fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${CRICAPI_KEY}&id=${id}`),
    ]);
    const infoData = await infoRes.json();
    const scoreData = await scoreRes.json();
    if (infoData.status !== 'success' || scoreData.status !== 'success') {
      return res.status(502).json({ error: infoData.reason || scoreData.reason || 'CricAPI error' });
    }
    const innings = scoreData.data?.scorecard || scoreData.data?.score || [];
    const events = [];
    if (Array.isArray(innings)) {
      innings.forEach(inn => {
        (inn.overs || inn.overList || []).forEach(overBlock => {
          (overBlock.balls || overBlock.ball || []).forEach(ball => {
            events.push({
              over: overBlock.over ?? overBlock.o,
              ball: ball.n ?? ball.ball,
              runs: ball.r ?? ball.runs,
              wicket: ball.w ?? ball.isWicket,
              batsman: ball.batsman,
            });
          });
        });
      });
    }
    res.json({
      info: infoData.data || null,
      scorecard: events.reverse(),
      events,
      source: 'cricapi',
    });
  } catch (err) {
    console.error('   ❌ Cricket match detail:', err.message);
    res.status(502).json({ error: err.message });
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
const CRICAPI_KEY = process.env.CRICAPI_KEY;
const hasCricAPI = isKeySet(CRICAPI_KEY, 'your_cricapi_key_here');

// Last-known-good live score snapshots (shared across all clients)
const liveSnapshotCache = {};
const LIVE_SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

function getFootballStatus(shortStatus) {
  const live = ['1H', '2H', 'HT', 'ET', 'LIVE'];
  if (live.includes(shortStatus)) return 'live';
  if (['FT', 'AET', 'PEN', 'Finished'].includes(shortStatus)) return 'finished';
  return 'upcoming';
}

function normalizeCricketMatchServer(game) {
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
      score: game.score?.[0]?.r != null ? `${game.score[0].r}/${game.score[0].w ?? 0}` : '-',
    },
    teamB: {
      name: game.teamInfo?.[1]?.shortname || game.teamInfo?.[1]?.name || 'Team B',
      flag: '🏏',
      score: game.score?.[1]?.r != null ? `${game.score[1].r}/${game.score[1].w ?? 0}` : '-',
    },
    momentum: 50,
    venue: game.venue || 'Cricket Ground',
    minute: game.status || (isUpcoming && game.dateTimeGMT ? new Date(game.dateTimeGMT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    source: 'cricapi',
  };
}

function normalizeFootballMatchServer(fixture) {
  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const league = fixture.league;
  return {
    id: f.id,
    sport: 'football',
    league: league.name,
    status: getFootballStatus(f.status.short),
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

async function fetchCricketLiveFromAPI() {
  if (!hasCricAPI) return null;
  const response = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}&offset=0`);
  if (!response.ok) throw new Error(`Cricket API ${response.status}`);
  const data = await response.json();
  if (data.status !== 'success') throw new Error(data.reason || 'CricAPI error');
  return (data.data || []).map(normalizeCricketMatchServer);
}

async function fetchFootballLiveFromAPI() {
  if (!hasRapidAPI) return null;
  const data = await fetchSportsAPI('football', '/fixtures?live=all');
  return (data.response || []).map(normalizeFootballMatchServer);
}

function saveLiveSnapshot(sport, matches, source) {
  liveSnapshotCache[sport] = {
    matches,
    source,
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}

function getStaleSnapshot(sport) {
  const snap = liveSnapshotCache[sport];
  if (!snap?.matches?.length) return null;
  const age = Date.now() - new Date(snap.fetchedAt).getTime();
  if (age > LIVE_SNAPSHOT_MAX_AGE_MS) return null;
  return {
    matches: snap.matches.map(m => ({ ...m, source: 'cached', stale: true })),
    source: 'cached',
    fetchedAt: snap.fetchedAt,
    stale: true,
  };
}

async function getRealSportLive(sport) {
  if (sport === 'cricket') {
    try {
      const prev = liveSnapshotCache.cricket?.matches;
      const matches = await fetchCricketLiveFromAPI();
      if (matches !== null) {
        detectScoreMoments(prev, matches);
        saveLiveSnapshot('cricket', matches, 'cricapi');
        return { matches, source: 'cricapi', fetchedAt: liveSnapshotCache.cricket.fetchedAt, stale: false };
      }
    } catch (err) {
      console.warn(`   ⚠️ CricAPI failed (${err.message}), trying snapshot...`);
      const stale = getStaleSnapshot('cricket');
      if (stale) return stale;
      return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: err.message };
    }
    return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: 'CricAPI not configured' };
  }

  if (sport === 'football') {
    try {
      const prev = liveSnapshotCache.football?.matches;
      const matches = await fetchFootballLiveFromAPI();
      if (matches !== null) {
        detectScoreMoments(prev, matches);
        saveLiveSnapshot('football', matches, 'api-football');
        return { matches, source: 'api-football', fetchedAt: liveSnapshotCache.football.fetchedAt, stale: false };
      }
    } catch (err) {
      console.warn(`   ⚠️ Football API failed (${err.message}), trying snapshot...`);
      const stale = getStaleSnapshot('football');
      if (stale) return stale;
      return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: err.message };
    }
    return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: 'RapidAPI not configured' };
  }

  return null;
}

app.get('/api/sports/cricket/live', async (req, res) => {
  const result = await getRealSportLive('cricket');
  if (result.source === 'unavailable' && !result.matches.length) {
    return res.status(503).json({
      error: result.error || 'Cricket scores unavailable. Set CRICAPI_KEY for reliable data.',
      fallback: true,
      ...result,
    });
  }
  console.log(`   ✅ Cricket (${result.source}${result.stale ? ', cached' : ''}): ${result.matches.length} matches`);
  res.json({ response: result.matches, results: result.matches.length, ...result });
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

app.post('/api/ai/narrative', aiLimiter, async (req, res) => {
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

app.post('/api/ai/preview', aiLimiter, async (req, res) => {
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

app.post('/api/ai/momentum', aiLimiter, async (req, res) => {
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

app.post('/api/ai/social-sentiment', aiLimiter, async (req, res) => {
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
    try {
      return JSON.parse(repairJsonText(text));
    } catch {
      const objects = extractJsonObjects(text);
      if (objects.length > 0) {
        try {
          return JSON.parse(objects[0]);
        } catch {
          return JSON.parse(repairJsonText(objects[0]));
        }
      }
      throw new Error('Could not parse JSON object from text');
    }
  }
}

/** Fix common LLM JSON mistakes (trailing commas, smart quotes). */
function repairJsonText(jsonStr) {
  return jsonStr
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
}

/** Concatenate all text parts from a Gemini response (search grounding may split output). */
function getGeminiText(data) {
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.filter(p => p.text).map(p => p.text).join('').trim();
}

function parseJsonArrayFromText(rawText) {
  let text = (rawText || '').trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  } else if (start !== -1 && !text.endsWith(']')) {
    // Truncated array from maxOutputTokens — try closing the bracket
    text = text.slice(start) + ']';
  }

  for (const candidate of [text, repairJsonText(text)]) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* try next strategy */ }
  }

  // Fallback: parse each top-level object individually
  const objects = extractJsonObjects(text);
  const items = [];
  for (const objStr of objects) {
    for (const candidate of [objStr, repairJsonText(objStr)]) {
      try {
        items.push(JSON.parse(candidate));
        break;
      } catch { /* try repaired version */ }
    }
  }
  if (items.length > 0) return items;

  throw new Error('Could not parse JSON array from text');
}

function normalizeBlogTopic(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.title || '').trim();
  if (!title) return null;
  const validCategories = new Set(['cricket', 'football', 'nba', 'tennis', 'f1', 'general']);
  let category = String(raw.category || 'general').toLowerCase().trim();
  if (!validCategories.has(category)) category = 'general';
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.map(k => String(k).trim()).filter(Boolean).slice(0, 8)
    : [];
  return {
    title,
    searchQuery: String(raw.searchQuery || title).trim(),
    category,
    keywords,
    angle: String(raw.angle || '').trim() || `Latest news and analysis on ${title} for Indian sports fans.`,
  };
}

app.post('/api/ai/fifa-prediction', aiLimiter, async (req, res) => {
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
app.post('/api/ai/tactics', aiLimiter, async (req, res) => {
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
app.post('/api/ai/oracle', aiLimiter, async (req, res) => {
  const { matchContext, question, history } = req.body;
  if (typeof question === 'string' && question.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 chars).' });
  }
  if (Array.isArray(history) && history.length > 20) {
    return res.status(400).json({ error: 'Conversation history too long (max 20 items).' });
  }

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

// In a multi-instance (horizontally scaled) setup, replace this in-memory cache with
// Redis or a shared store. For single-instance deployment this is fine.
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

async function getAISportLive(sport) {
  if (!hasGemini) {
    return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: 'AI scores not configured' };
  }
  try {
    if (isCacheValid(sport)) {
      const cached = aiScoresCache[sport];
      return {
        matches: cached.data.map(m => ({ ...m, source: m.source || 'ai-search' })),
        source: 'ai-search-cached',
        fetchedAt: new Date(cached.timestamp).toISOString(),
        stale: false,
      };
    }
    const matches = await fetchScoresViaGemini(sport);
    aiScoresCache[sport] = { data: matches, timestamp: Date.now() };
    matches.forEach(resolveMatchPredictions);
    return {
      matches: matches.map(m => ({ ...m, source: 'ai-search' })),
      source: 'ai-search',
      fetchedAt: new Date().toISOString(),
      stale: false,
    };
  } catch (err) {
    console.warn(`   ⚠️ AI live scores failed for ${sport}:`, err.message);
    return { matches: [], source: 'unavailable', fetchedAt: null, stale: false, error: err.message };
  }
}

// ── Unified Live Scores (real APIs first, snapshot on failure) ──
app.get('/api/sports/live/:sport', async (req, res) => {
  const sport = req.params.sport;
  const validSports = ['all', 'cricket', 'football', 'nba', 'tennis', 'f1'];
  if (!validSports.includes(sport)) {
    return res.status(400).json({ error: `Invalid sport: ${sport}. Use: ${validSports.join(', ')}` });
  }

  try {
    if (sport === 'all') {
      const [cricket, football] = await Promise.all([
        getRealSportLive('cricket'),
        getRealSportLive('football'),
      ]);
      let allMatches = [...cricket.matches, ...football.matches];
      const metaParts = [cricket, football];

      if (hasGemini) {
        // Only attach cached AI scores on /live/all — never block on fresh Gemini calls (~15s each)
        for (const aiSport of ['nba', 'tennis', 'f1']) {
          if (isCacheValid(aiSport)) {
            const cached = aiScoresCache[aiSport];
            const cachedMatches = cached.data.map(m => ({ ...m, source: m.source || 'ai-search-cached' }));
            allMatches = allMatches.concat(cachedMatches);
            metaParts.push({
              matches: cachedMatches,
              source: 'ai-search-cached',
              fetchedAt: new Date(cached.timestamp).toISOString(),
              stale: false,
            });
          }
        }
      }

      const activeSources = metaParts.filter(p => p.matches.length > 0).map(p => p.source);
      const fetchedAt = metaParts.map(p => p.fetchedAt).filter(Boolean).sort().reverse()[0] || null;

      return res.json({
        matches: allMatches,
        source: activeSources.length ? activeSources.join('+') : 'unavailable',
        fetchedAt,
        stale: cricket.stale || football.stale,
      });
    }

    if (sport === 'cricket' || sport === 'football') {
      const result = await getRealSportLive(sport);
      if (result.source === 'unavailable' && !result.matches.length) {
        return res.status(503).json(result);
      }
      return res.json(result);
    }

    const result = await getAISportLive(sport);
    return res.json(result);
  } catch (err) {
    console.error(`   ❌ Unified live (${sport}):`, err.message);
    res.status(502).json({ matches: [], source: 'unavailable', error: err.message, stale: false, fetchedAt: null });
  }
});

// ── AI Scores Endpoint (per sport) ──
app.get('/api/sports/ai-scores/:sport', aiLimiter, async (req, res) => {
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
    console.warn(`   ⚠️ Standings fetch failed for ${league}. Reason:`, err.message);
    return res.status(503).json({ error: 'Standings unavailable', unavailable: true, league });
  }
});

// ── Fan Zone: Persistent match cheers ──
app.get('/api/fanzone/:matchId', async (req, res) => {
  try {
    res.json(await getFanZone(req.params.matchId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fanzone/:matchId/cheer', async (req, res) => {
  const { team } = req.body || {};
  if (!['teamA', 'teamB'].includes(team)) {
    return res.status(400).json({ error: 'team must be teamA or teamB' });
  }

  try {
    const state = await getFanZone(req.params.matchId);
    state.cheers[team] += 1;
    state.updatedAt = Date.now();
    await saveFanZone(state);

    broadcastRealtime({ type: 'fan_zone_update', matchId: state.matchId, state });
    res.json(state);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Oracle Predictions: Persistent aggregate pool ──
app.get('/api/oracle/:matchId', async (req, res) => {
  try {
    res.json(await getPredictionPool(req.params.matchId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/oracle/:matchId/prediction', async (req, res) => {
  const { team, wager = 0 } = req.body || {};
  if (!['teamA', 'teamB'].includes(team)) {
    return res.status(400).json({ error: 'team must be teamA or teamB' });
  }

  try {
    const numericWager = Math.max(0, Number(wager) || 0);
    const pool = await getPredictionPool(req.params.matchId);
    pool.totals[team] += 1;
    pool.points[team] += numericWager;
    pool.updatedAt = Date.now();
    await savePredictionPool(pool);

    broadcastRealtime({ type: 'oracle_update', matchId: pool.matchId, pool });
    res.json(pool);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Prediction Arena ──
const RIVALRY_FILTERS = {
  'mi-csk': /mumbai|chennai/i,
  'ind-pak': /india|pakistan/i,
  'el-clasico': /barcelona|real madrid/i,
};

app.get('/api/arena/season', async (req, res) => {
  try {
    const weekId = getWeekId();
    const allUsers = await dbGetAllUsers();
    const standings = allUsers
      .map(u => ({
        username: u.username,
        avatar: u.avatar || '🦁',
        fanPoints: u.fanPoints || 0,
        calibrationScore: u.arenaStats?.calibrationScore ?? computeCalibrationScore(u.predictions),
        seasonPoints: u.arenaStats?.weekId === weekId ? (u.arenaStats?.seasonPoints ?? 0) : 0,
        streak: u.streak || 0,
        predictions: (u.predictions || []).length,
      }))
      .sort((a, b) => b.seasonPoints - a.seasonPoints || b.calibrationScore - a.calibrationScore)
      .slice(0, 100);

    const rivalries = {};
    for (const [id, filter] of Object.entries(RIVALRY_FILTERS)) {
      rivalries[id] = allUsers
        .map(u => {
          const preds = (u.predictions || []).filter(p => filter.test(p.matchLabel || ''));
          const resolved = preds.filter(p => p.status === 'correct' || p.status === 'incorrect');
          const wins = resolved.filter(p => p.status === 'correct').length;
          return {
            username: u.username,
            avatar: u.avatar || '🦁',
            rivalryPicks: preds.length,
            winRate: resolved.length ? Math.round((wins / resolved.length) * 100) : 0,
          };
        })
        .filter(r => r.rivalryPicks > 0)
        .sort((a, b) => b.winRate - a.winRate || b.rivalryPicks - a.rivalryPicks)
        .slice(0, 20);
    }

    res.json({ weekId, standings, rivalries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Live Moments ──
app.get('/api/moments', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    if (useDatabase) {
      const moments = await Moment.find({}).sort({ createdAt: -1 }).limit(limit).lean();
      return res.json({ moments, source: 'mongodb' });
    }
    res.json({ moments: [], source: 'memory' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/moments', async (req, res) => {
  try {
    const { matchId, sport, eventType, title, aiLine, matchLabel } = req.body || {};
    const doc = { matchId, sport, eventType, title, aiLine, matchLabel };
    if (useDatabase) await Moment.create(doc);
    res.status(201).json({ ok: true, moment: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/moments/line', async (req, res) => {
  const { title, sport, match, eventType } = req.body || {};
  const fallback = `${eventType === 'score_change' ? 'Scores are shifting' : 'Big moment'} in this ${sport || 'match'} — stay locked in!`;
  if (!hasGemini) return res.json({ line: fallback, source: 'fallback' });
  try {
    const prompt = `Write ONE hype sentence (max 20 words) for a live sports moment. No quotes.
Match: ${title || 'Live match'}
Sport: ${sport || 'unknown'}
Event: ${eventType || 'update'}
Teams: ${match?.teamA?.name || ''} vs ${match?.teamB?.name || ''}`;
    const text = await callGemini(prompt);
    const line = (text || fallback).replace(/^["']|["']$/g, '').split('\n')[0].trim();
    res.json({ line, source: 'gemini' });
  } catch (err) {
    res.json({ line: fallback, source: 'fallback' });
  }
});

// ============================================
// FAN ENGAGEMENT ENDPOINTS
// ============================================

// ── Leaderboard (paginated, DB-optimized) ──
app.get('/api/leaderboard', async (req, res) => {
  const timeWindow = req.query.window || 'alltime';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    if (useDatabase) {
      const filter = {};
      if (timeWindow === 'today') filter.lastLoginDate = today;
      if (timeWindow === 'week') filter.lastLoginDate = { $gte: weekAgo };

      const [ranked, total] = await Promise.all([
        User.find(filter)
          .sort({ fanPoints: -1 })
          .skip(skip)
          .limit(limit)
          .select('username fanPoints badges avatar preferences streak')
          .lean(),
        User.countDocuments(filter),
      ]);

      return res.json({
        leaderboard: ranked.map((u, i) => ({
          rank: skip + i + 1,
          username: u.username,
          fanPoints: u.fanPoints || 0,
          badges: u.badges || [],
          avatar: u.avatar || '🦁',
          favoriteSports: u.preferences?.favoriteSports || [],
          streak: u.streak || 0,
        })),
        window: timeWindow,
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    }

    let allUsers = await dbGetAllUsers();
    let filtered = allUsers.filter(u => {
      if (timeWindow === 'today') return u.lastLoginDate === today;
      if (timeWindow === 'week') return u.lastLoginDate && u.lastLoginDate >= weekAgo;
      return true;
    });
    filtered.sort((a, b) => (b.fanPoints || 0) - (a.fanPoints || 0));
    const total = filtered.length;
    const ranked = filtered.slice(skip, skip + limit).map((u, i) => ({
      rank: skip + i + 1,
      username: u.username,
      fanPoints: u.fanPoints || 0,
      badges: u.badges || [],
      avatar: u.avatar || '🦁',
      favoriteSports: u.preferences?.favoriteSports || [],
      streak: u.streak || 0,
    }));
    res.json({ leaderboard: ranked, window: timeWindow, total, page, pages: Math.ceil(total / limit) });
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
  if (req.user.username !== username) {
    return res.status(403).json({ error: 'Cannot post activity for another user.' });
  }
  try {
    const user = await dbFindUser(username);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const item = { id: Date.now(), type, data, timestamp: Date.now() };
    const activityLog = [item, ...(user.activityLog || [])].slice(0, 50);
    await dbUpdateUser(username, { activityLog });

    if (data?.sport) await incrementTrending(data.sport);
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
  if (req.user.username !== req.params.username) {
    return res.status(403).json({ error: 'Cannot update challenges for another user.' });
  }

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

// Escape any HTML special characters to prevent XSS injection in the OG page
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Sanitise a matchId so it can safely appear in a URL attribute (alphanumeric + hyphen/underscore only)
function sanitiseId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_\-]/g, '');
}

app.get('/api/og/:matchId', optionalAuth, (req, res) => {
  const matchId = sanitiseId(req.params.matchId);

  // Escape every query-param value before using it in HTML
  const teamA  = escapeHtml(req.query.teamA);
  const teamB  = escapeHtml(req.query.teamB);
  const sport  = escapeHtml(req.query.sport);
  const league = escapeHtml(req.query.league);
  const score  = escapeHtml(req.query.score);

  // Validate sport against known values so an attacker can't inject arbitrary text as the emoji lookup key
  const VALID_SPORTS = ['cricket', 'football', 'nba', 'tennis', 'f1'];
  const safeSport = VALID_SPORTS.includes(req.query.sport) ? req.query.sport : '';
  const sportEmojis = { cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏁' };
  const icon = sportEmojis[safeSport] || '🏅';

  const title = teamA && teamB
    ? `${icon} ${teamA} vs ${teamB} — Live on Esportsduniya`
    : 'Live Sports Scores — Esportsduniya';
  const description = score
    ? `${teamA} ${score} | Live ${league || sport} scores, AI commentary &amp; predictions — Esportsduniya.in`
    : `Watch live ${league || sport || 'sports'} scores, get AI commentary &amp; make Oracle predictions on Esportsduniya.in`;

  const matchUrl = `https://www.esportsduniya.in/#match/${matchId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://www.esportsduniya.in/og-cover.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${matchUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://www.esportsduniya.in/og-cover.png">
  <meta http-equiv="refresh" content="0; url=${matchUrl}">
</head>
<body><p>Redirecting to match…</p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Prevent the OG page itself from being cached by social crawlers with stale data
  res.setHeader('Cache-Control', 'no-store');
  res.send(html);
});

// ============================================
// SEO MATCH DATA ENDPOINT (for crawlers / SSR)
// ============================================

app.get('/api/seo/match/:matchId', async (req, res) => {
  const matchId = sanitiseId(req.params.matchId);
  try {
    const sportEndpoints = ['cricket', 'football', 'nba', 'tennis', 'f1'];
    let matchData = null;

    for (const sport of sportEndpoints) {
      try {
        const response = await fetch(`http://localhost:${PORT}/api/sports/live/${sport}`);
        const data = await response.json();
        const found = (data.matches || []).find(m => String(m.id) === matchId);
        if (found) { matchData = found; break; }
      } catch { continue; }
    }

    if (!matchData) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const title = `${escapeHtml(matchData.teamA?.name)} vs ${escapeHtml(matchData.teamB?.name)} - Live Score | Esportsduniya`;
    const description = `Live score, AI analysis, and predictions for ${escapeHtml(matchData.teamA?.name)} vs ${escapeHtml(matchData.teamB?.name)}. ${escapeHtml(matchData.league || '')}`;
    const url = `https://esportsduniya.in/match/${matchId}`;

    res.json({
      title,
      description,
      url,
      match: {
        id: matchId,
        teamA: matchData.teamA?.name,
        teamB: matchData.teamB?.name,
        scoreA: matchData.teamA?.score,
        scoreB: matchData.teamB?.score,
        status: matchData.status,
        league: matchData.league,
        sport: matchData.sport,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate SEO data' });
  }
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
      success_url: `https://esportsduniya.in/profile?premium=success`,
      cancel_url: `https://esportsduniya.in/profile?premium=cancelled`,
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
    const sub = event.data.object;
    const username = sub.metadata?.username;
    if (username) {
      await dbUpdateUser(username, { isPremium: false, premiumExpiry: null });
      console.log(`   💎 Premium cancelled: ${username}`);
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const username = invoice.subscription_details?.metadata?.username || invoice.metadata?.username;
    if (username) {
      const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await dbUpdateUser(username, { isPremium: true, premiumExpiry: expiry });
      console.log(`   💎 Premium renewed: ${username} until ${expiry.toISOString()}`);
    }
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
// BLOG — Automated SEO Article System
// ============================================

// Helper: turn a title into a URL-safe slug
function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/-$/, '');
}

// Normalize incoming URL slug: lowercase first, then strip invalid chars
function normalizeSlug(raw) {
  return String(raw || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

// Allowlist sanitizer for AI-generated article HTML (blocks XSS / event handlers)
const ARTICLE_HTML_OPTIONS = {
  allowedTags: ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tagName, attribs) => {
      const href = typeof attribs?.href === 'string' ? attribs.href.trim() : '';
      if (!href || !/^https?:\/\//i.test(href)) {
        // No valid href — unwrap to span so inner text is kept without a broken/dangerous link
        return { tagName: 'span', attribs: {} };
      }
      return {
        tagName: 'a',
        attribs: {
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      };
    },
  },
};

function sanitizeArticleHtml(html) {
  return sanitizeHtml(html || '', ARTICLE_HTML_OPTIONS);
}

// Step 1 — Ask Gemini (with Google Search) for today's trending sports topics
async function discoverArticleTopics() {
  if (!hasGemini) return [];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `Today is ${today}. You are a sports content strategist for an Indian sports website (esportsduniya.in).

Search the web and find 5 specific, currently trending sports topics that Indian sports fans are searching for RIGHT NOW.

Focus on:
- Live cricket: IPL, ICC tournaments, bilateral series happening this week
- Football: Premier League, Champions League, La Liga, transfer window news
- FIFA 2026 World Cup news and team updates
- NBA finals, Tennis Grand Slams, F1 race weekends
- Indian sports heroes: Virat Kohli, Rohit Sharma, records, controversies

For each topic, provide the high-volume search query an Indian fan would actually Google.

Return a JSON array of exactly 5 objects:
[
  {
    "title": "SEO-optimized article title including team names, tournament, and year",
    "searchQuery": "exact Google search query this article targets",
    "category": "cricket|football|nba|tennis|f1|general",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "angle": "Brief 2-sentence description of the article angle and what makes it useful"
  }
]

Return ONLY valid JSON. No markdown fences. No extra text.
Rules for JSON strings: escape every double quote inside a value with backslash (e.g. Kohli\\'s). Do not use unescaped line breaks inside string values.`;

  const topicSchema = {
    type: 'ARRAY',
    items: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        searchQuery: { type: 'STRING' },
        category: { type: 'STRING' },
        keywords: { type: 'ARRAY', items: { type: 'STRING' } },
        angle: { type: 'STRING' },
      },
      required: ['title', 'searchQuery', 'category', 'keywords', 'angle'],
    },
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: topicSchema,
        },
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await resp.json();
    const raw = getGeminiText(data);
    if (!raw) throw new Error('Empty response from Gemini');

    let topics;
    try {
      topics = parseJsonArrayFromText(raw);
    } catch (parseErr) {
      console.warn('   ⚠️  Blog: Structured JSON parse failed, retrying without schema…', parseErr.message);
      topics = await discoverArticleTopicsFallback(prompt);
    }

    return topics.map(normalizeBlogTopic).filter(Boolean);
  } catch (err) {
    console.error('   ❌ Blog: Topic discovery failed:', err.message);
    return [];
  }
}

/** Retry topic discovery without responseSchema when structured output + search fails. */
async function discoverArticleTopicsFallback(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Gemini fallback ${resp.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await resp.json();
  const raw = getGeminiText(data);
  if (!raw) throw new Error('Empty fallback response from Gemini');
  return parseJsonArrayFromText(raw);
}

// Step 2 — Ask Gemini to write a full 1500-2000 word SEO article for a topic
async function writeArticle(topic) {
  if (!hasGemini) return null;
  const slug = makeSlug(topic.title);
  const prompt = `Write a comprehensive, SEO-optimized sports news article for an Indian sports website.

Article brief:
- Title: ${topic.title}
- Target keywords: ${topic.keywords.join(', ')}
- Angle: ${topic.angle}
- Target Google query: "${topic.searchQuery}"

REQUIREMENTS:
1. Length: 1500-2000 words
2. Start with a strong 2-3 sentence intro that naturally includes the primary keyword
3. Use <h2> and <h3> subheadings — NEVER <h1> (that is the page title)
4. Include real stats, match details, historical context, and expert-style analysis
5. Indian audience context: mention IST timezone, India viewership, Indian players
6. Add these internal links using the exact anchor text shown:
   - "live cricket scores" → https://www.esportsduniya.in/#cricket
   - "football live scores" → https://www.esportsduniya.in/#football
   - "NBA scores today" → https://www.esportsduniya.in/#nba
   - "live sports scores" → https://www.esportsduniya.in/#dashboard
   - "AI sports predictions" → https://www.esportsduniya.in/#crowdpulse
7. End with a clear CTA paragraph linking to the relevant live scores section on the site
8. Only use these HTML tags: <h2> <h3> <p> <ul> <li> <strong> <em> <a href="..." target="_blank" rel="noopener noreferrer">

Return a single JSON object — no markdown, no extra text:
{
  "metaDescription": "One compelling sentence, 120-155 characters, includes primary keyword",
  "contentHtml": "Full article HTML content"
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              metaDescription: { type: 'STRING' },
              contentHtml: { type: 'STRING' },
            },
            required: ['metaDescription', 'contentHtml'],
          },
        },
      }),
    });
    const data = await resp.json();
    const raw = getGeminiText(data);
    if (!raw) throw new Error('Empty response from Gemini');
    const { metaDescription, contentHtml } = parseJsonObjectFromText(raw);

    const wordCount = (contentHtml || '').replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      slug,
      title: topic.title,
      metaDescription: (metaDescription || '').slice(0, 160),
      category: topic.category || 'general',
      keywords: topic.keywords || [],
      contentHtml: sanitizeArticleHtml(contentHtml || ''),
      wordCount,
      readTime,
      publishedAt: new Date(),
    };
  } catch (err) {
    console.error(`   ❌ Blog: Writing failed for "${topic.title}":`, err.message);
    return null;
  }
}

// Step 3 — Orchestrate: discover topics → write 3 new articles
async function generateDailyArticles() {
  if (!hasGemini) {
    console.log('   ℹ️  Blog: Skipping article generation — GEMINI_API_KEY not set');
    return;
  }
  console.log('   📝 Blog: Discovering trending topics...');
  const topics = await discoverArticleTopics();
  if (!topics.length) { console.log('   ⚠️  Blog: No topics returned'); return; }

  const todayStr = new Date().toISOString().split('T')[0];
  const existing = await dbGetArticles(200);
  const todaySlugs = new Set(
    existing
      .filter(a => new Date(a.publishedAt).toISOString().split('T')[0] === todayStr)
      .map(a => a.slug)
  );

  let written = 0;
  for (const topic of topics) {
    if (written >= 3) break;
    const slug = makeSlug(topic.title);
    if (todaySlugs.has(slug)) { console.log(`   ⏭️  Blog: Already published "${topic.title}"`); continue; }

    console.log(`   ✍️  Blog: Writing "${topic.title}"...`);
    const article = await writeArticle(topic);
    if (article) {
      const saved = await dbSaveArticle(article);
      if (saved) {
        console.log(`   ✅ Blog: Published /blog/${article.slug} (${article.wordCount} words)`);
        written++;
      }
    }
    // Pause between Gemini calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`   📰 Blog: ${written} article(s) published this run`);
}

// Cron: run at 6 AM, 12 PM, 6 PM UTC every day
cron.schedule('0 6,12,18 * * *', async () => {
  console.log('   ⏰ Blog Cron: Starting automated article generation');
  await generateDailyArticles();
});

cron.schedule('*/10 * * * *', () => {
  const url = `http://localhost:${PORT}/api/health`;
  fetch(url).catch(() => {});
});

// P3-3: Push reminders — notify users 30 minutes before matches involving their favorite teams
cron.schedule('*/15 * * * *', async () => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    const allUsers = await dbGetAllUsers();
    const usersWithPush = allUsers.filter(u => u.pushSubscriptions?.length && u.preferences?.favoriteSports?.length);
    if (!usersWithPush.length) return;

    const sportsToCheck = [...new Set(usersWithPush.flatMap(u => u.preferences.favoriteSports))];
    for (const sport of sportsToCheck) {
      try {
        const res = await fetch(`http://localhost:${PORT}/api/sports/live/${sport}`);
        const data = await res.json();
        const upcoming = (data.matches || []).filter(m => m.status === 'upcoming' || m.status === 'not_started');
        for (const match of upcoming) {
          const matchTime = match.startTime ? new Date(match.startTime) : null;
          if (!matchTime) continue;
          const minsUntil = (matchTime - Date.now()) / 60000;
          if (minsUntil > 0 && minsUntil <= 35) {
            const label = `${match.teamA?.name || '?'} vs ${match.teamB?.name || '?'}`;
            for (const user of usersWithPush) {
              if (!user.preferences.favoriteSports.includes(sport)) continue;
              const reminderKey = `reminder_${match.id}_${user.username}`;
              if (global[reminderKey]) continue;
              global[reminderKey] = true;
              setTimeout(() => { delete global[reminderKey]; }, 60 * 60 * 1000);
              sendPushToUser(user.username, {
                title: `${label} starts soon!`,
                body: `Your ${sport} match kicks off in ~${Math.round(minsUntil)} minutes.`,
                url: `/match/${match.id}`,
              });
            }
          }
        }
      } catch { /* skip sport */ }
    }
  } catch (err) {
    console.error('Match reminder cron error:', err.message);
  }
});

// Generate articles on startup (after a short delay so the server is ready)
setTimeout(() => {
  generateDailyArticles().catch(err => console.error('   ❌ Blog startup generation failed:', err.message));
}, 15000);

// ── Blog CSS (inlined into SSR pages) ──
const BLOG_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a0f;color:#e0e0e8;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:#1ee6a7;text-decoration:none}a:hover{text-decoration:underline}
img{max-width:100%;height:auto}
.blog-header{background:rgba(10,10,20,0.95);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.07);padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.blog-header-logo{font-size:1.3rem;font-weight:700;color:#fff;text-decoration:none;display:flex;align-items:center;gap:8px}
.blog-header-logo span{color:#1ee6a7}
.blog-header-nav{display:flex;gap:16px;align-items:center}
.blog-header-nav a{color:#aaa;font-size:0.9rem;transition:color .2s}
.blog-header-nav a:hover{color:#fff;text-decoration:none}
.blog-hero{background:linear-gradient(135deg,#0d0d1a 0%,#111128 100%);border-bottom:1px solid rgba(30,230,167,0.12);padding:48px 24px 40px}
.blog-hero-inner{max-width:820px;margin:0 auto}
.blog-category-badge{display:inline-block;background:rgba(30,230,167,0.15);color:#1ee6a7;border:1px solid rgba(30,230,167,0.3);border-radius:20px;padding:4px 14px;font-size:0.75rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin-bottom:16px}
.blog-title{font-size:clamp(1.8rem,4vw,2.8rem);font-weight:800;line-height:1.2;color:#fff;margin-bottom:16px;letter-spacing:-.02em}
.blog-meta{display:flex;align-items:center;gap:16px;color:#888;font-size:0.85rem;flex-wrap:wrap}
.blog-meta strong{color:#bbb}
.blog-meta .dot{opacity:.4}
.blog-content-wrap{max-width:820px;margin:0 auto;padding:48px 24px 80px}
.blog-content h2{font-size:1.55rem;font-weight:700;color:#fff;margin:2.5rem 0 1rem;line-height:1.3;border-left:3px solid #1ee6a7;padding-left:14px}
.blog-content h3{font-size:1.2rem;font-weight:600;color:#d0d0e0;margin:2rem 0 .75rem;line-height:1.4}
.blog-content p{margin-bottom:1.4rem;color:#c8c8d8}
.blog-content ul,.blog-content ol{margin:0 0 1.4rem 1.5rem}
.blog-content li{margin-bottom:.5rem;color:#c8c8d8}
.blog-content strong{color:#fff;font-weight:600}
.blog-content em{color:#aaa;font-style:italic}
.blog-content a{color:#1ee6a7;font-weight:500;border-bottom:1px solid rgba(30,230,167,0.3);transition:border-color .2s}
.blog-content a:hover{border-color:#1ee6a7;text-decoration:none}
.blog-cta-box{background:linear-gradient(135deg,rgba(30,230,167,0.1),rgba(30,100,230,0.1));border:1px solid rgba(30,230,167,0.25);border-radius:16px;padding:28px 32px;margin:3rem 0;text-align:center}
.blog-cta-box h3{color:#1ee6a7;margin-bottom:10px;font-size:1.2rem}
.blog-cta-box p{color:#aaa;margin-bottom:18px;font-size:0.95rem}
.blog-cta-box a{display:inline-block;background:#1ee6a7;color:#000;font-weight:700;padding:12px 28px;border-radius:24px;font-size:0.95rem;transition:opacity .2s;border:none}
.blog-cta-box a:hover{opacity:.9;text-decoration:none}
.blog-keywords{margin-top:2rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.07)}
.blog-keywords span{display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 10px;font-size:0.75rem;color:#888;margin:4px}
.blog-listing-wrap{max-width:900px;margin:0 auto;padding:40px 24px 80px}
.blog-listing-header{margin-bottom:36px}
.blog-listing-header h1{font-size:2.2rem;font-weight:800;color:#fff;margin-bottom:8px}
.blog-listing-header p{color:#888;font-size:1rem}
.blog-grid{display:grid;gap:20px}
.blog-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;transition:border-color .2s,transform .2s;text-decoration:none;display:block}
.blog-card:hover{border-color:rgba(30,230,167,0.3);transform:translateY(-2px);text-decoration:none}
.blog-card-cat{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#1ee6a7;margin-bottom:10px}
.blog-card-title{font-size:1.15rem;font-weight:700;color:#fff;line-height:1.4;margin-bottom:10px}
.blog-card-desc{font-size:0.88rem;color:#888;line-height:1.6;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.blog-card-meta{font-size:0.78rem;color:#555;display:flex;gap:12px}
.blog-footer{border-top:1px solid rgba(255,255,255,0.07);padding:32px 24px;text-align:center;color:#555;font-size:0.85rem}
.blog-footer a{color:#1ee6a7}
@media(max-width:600px){.blog-hero{padding:32px 16px 28px}.blog-content-wrap,.blog-listing-wrap{padding:32px 16px 60px}.blog-title{font-size:1.6rem}.blog-header{padding:14px 16px}.blog-content h2{font-size:1.3rem}}
`;

// ── Blog route: JSON API (used by the SPA BlogIndex.jsx) ──
app.get('/api/blog', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const category = req.query.category || null;
    const list = await dbGetArticles(limit, category);
    res.json(list.map(a => ({
      slug: a.slug, title: a.title, metaDescription: a.metaDescription,
      category: a.category, keywords: a.keywords, wordCount: a.wordCount,
      readTime: a.readTime, publishedAt: a.publishedAt,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

app.get('/api/blog/:slug', async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const article = await dbFindArticleBySlug(slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ ...article, contentHtml: sanitizeArticleHtml(article.contentHtml) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// ── Blog route: SSR HTML listing (Google-indexable) ──
app.get('/blog', async (req, res) => {
  try {
    const list = await dbGetArticles(20);
    const cardsHtml = list.length
      ? list.map(a => {
          const pubDate = new Date(a.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          return `<a class="blog-card" href="/blog/${escapeHtml(a.slug)}">
            <div class="blog-card-cat">${escapeHtml(a.category)}</div>
            <div class="blog-card-title">${escapeHtml(a.title)}</div>
            <div class="blog-card-desc">${escapeHtml(a.metaDescription)}</div>
            <div class="blog-card-meta">
              <span>${pubDate}</span>
              <span>${a.readTime || 5} min read</span>
              <span>${(a.wordCount || 0).toLocaleString()} words</span>
            </div>
          </a>`;
        }).join('\n')
      : '<p style="color:#666;text-align:center;padding:3rem">Articles are being generated — check back soon!</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sports Blog — Latest Cricket, Football & F1 News | Esportsduniya</title>
<meta name="description" content="Stay updated with the latest sports news, match previews, player analysis, and tournament updates for cricket, football, NBA, tennis, and F1 on Esportsduniya." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://www.esportsduniya.in/blog" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Sports Blog — Esportsduniya" />
<meta property="og:description" content="Latest sports news, match previews and analysis for cricket, football, NBA, tennis and F1." />
<meta property="og:url" content="https://www.esportsduniya.in/blog" />
<meta property="og:image" content="https://www.esportsduniya.in/og-cover.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Sports Blog — Esportsduniya" />
<meta name="twitter:description" content="Latest sports news and match previews." />
<meta name="twitter:image" content="https://www.esportsduniya.in/og-cover.png" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Blog","name":"Esportsduniya Sports Blog","url":"https://www.esportsduniya.in/blog","description":"AI-generated sports news, match previews, and analysis","publisher":{"@type":"Organization","name":"Esportsduniya","url":"https://www.esportsduniya.in","logo":{"@type":"ImageObject","url":"https://www.esportsduniya.in/og-cover.png"}}}</script>
<style>${BLOG_CSS}</style>
</head>
<body>
<header class="blog-header">
  <a class="blog-header-logo" href="https://www.esportsduniya.in">⚡ Esports<span>Duniya</span></a>
  <nav class="blog-header-nav">
    <a href="https://www.esportsduniya.in/#cricket">Cricket</a>
    <a href="https://www.esportsduniya.in/#football">Football</a>
    <a href="https://www.esportsduniya.in/#dashboard">Live Scores</a>
  </nav>
</header>
<main>
  <div class="blog-listing-wrap">
    <div class="blog-listing-header">
      <h1>Sports Blog</h1>
      <p>AI-powered sports news, match previews, player analysis, and tournament updates — updated daily</p>
    </div>
    <div class="blog-grid">${cardsHtml}</div>
  </div>
</main>
<footer class="blog-footer">
  <p>© ${new Date().getFullYear()} <a href="https://www.esportsduniya.in">Esportsduniya</a> — AI-powered live sports platform</p>
</footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    res.send(html);
  } catch (err) {
    console.error('Blog listing error:', err);
    res.status(500).send('Internal server error');
  }
});

// ── Blog route: SSR HTML article page (Google-indexable) ──
app.get('/blog/:slug', async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const article = await dbFindArticleBySlug(slug);
    if (!article) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Not Found — Esportsduniya</title><style>${BLOG_CSS}</style></head><body><header class="blog-header"><a class="blog-header-logo" href="https://www.esportsduniya.in">⚡ Esports<span>Duniya</span></a></header><main><div class="blog-content-wrap" style="text-align:center;padding:6rem 24px"><h2 style="color:#fff;font-size:2rem;margin-bottom:1rem">Article Not Found</h2><p style="color:#888;margin-bottom:2rem">This article may have been removed or hasn't been generated yet.</p><a href="/blog" style="color:#1ee6a7">← Back to Blog</a></div></main></body></html>`);
    }

    const pubDate = new Date(article.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const pubIso  = new Date(article.publishedAt).toISOString();
    const keywordsHtml = (article.keywords || []).map(k => `<span>${escapeHtml(k)}</span>`).join('');
    const canonicalUrl = `https://www.esportsduniya.in/blog/${escapeHtml(slug)}`;
    const siteName = 'Esportsduniya';

    const jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: article.title,
      description: article.metaDescription,
      url: canonicalUrl,
      datePublished: pubIso,
      dateModified: pubIso,
      author: { '@type': 'Organization', name: siteName, url: 'https://www.esportsduniya.in' },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        url: 'https://www.esportsduniya.in',
        logo: { '@type': 'ImageObject', url: 'https://www.esportsduniya.in/og-cover.png' },
      },
      image: { '@type': 'ImageObject', url: 'https://www.esportsduniya.in/og-cover.png', width: 1200, height: 630 },
      keywords: (article.keywords || []).join(', '),
      wordCount: article.wordCount,
      articleSection: article.category,
      inLanguage: 'en-IN',
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(article.title)} | Esportsduniya</title>
<meta name="description" content="${escapeHtml(article.metaDescription)}" />
<meta name="keywords" content="${escapeHtml((article.keywords || []).join(', '))}" />
<meta name="author" content="Esportsduniya" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<link rel="canonical" href="${canonicalUrl}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(article.title)}" />
<meta property="og:description" content="${escapeHtml(article.metaDescription)}" />
<meta property="og:url" content="${canonicalUrl}" />
<meta property="og:image" content="https://www.esportsduniya.in/og-cover.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:site_name" content="Esportsduniya" />
<meta property="og:locale" content="en_IN" />
<meta property="article:published_time" content="${pubIso}" />
<meta property="article:section" content="${escapeHtml(article.category)}" />
<meta property="article:tag" content="${escapeHtml((article.keywords || []).join(', '))}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(article.title)}" />
<meta name="twitter:description" content="${escapeHtml(article.metaDescription)}" />
<meta name="twitter:image" content="https://www.esportsduniya.in/og-cover.png" />
<script type="application/ld+json">${jsonLd}</script>
<style>${BLOG_CSS}</style>
</head>
<body>
<header class="blog-header">
  <a class="blog-header-logo" href="https://www.esportsduniya.in">⚡ Esports<span>Duniya</span></a>
  <nav class="blog-header-nav">
    <a href="https://www.esportsduniya.in/#cricket">Cricket</a>
    <a href="https://www.esportsduniya.in/#football">Football</a>
    <a href="https://www.esportsduniya.in/#dashboard">Live Scores</a>
    <a href="/blog">Blog</a>
  </nav>
</header>
<main>
  <div class="blog-hero">
    <div class="blog-hero-inner">
      <div class="blog-category-badge">${escapeHtml(article.category)}</div>
      <h1 class="blog-title">${escapeHtml(article.title)}</h1>
      <div class="blog-meta">
        <strong>Esportsduniya</strong>
        <span class="dot">·</span>
        <span>${pubDate}</span>
        <span class="dot">·</span>
        <span>${article.readTime || 5} min read</span>
        <span class="dot">·</span>
        <span>${(article.wordCount || 0).toLocaleString()} words</span>
      </div>
    </div>
  </div>
  <div class="blog-content-wrap">
    <article class="blog-content">
      ${sanitizeArticleHtml(article.contentHtml)}
      <div class="blog-cta-box">
        <h3>Follow Live Scores on Esportsduniya</h3>
        <p>Get real-time scores, AI predictions, and fan insights — all in one place</p>
        <a href="https://www.esportsduniya.in/#dashboard" target="_blank" rel="noopener noreferrer">Watch Live Scores →</a>
      </div>
      ${keywordsHtml ? `<div class="blog-keywords">${keywordsHtml}</div>` : ''}
    </article>
    <nav style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(255,255,255,0.07)">
      <a href="/blog" style="color:#1ee6a7;font-size:0.9rem">← More Sports Articles</a>
    </nav>
  </div>
</main>
<footer class="blog-footer">
  <p>© ${new Date().getFullYear()} <a href="https://www.esportsduniya.in">Esportsduniya</a> — AI-powered live sports platform. Article generated by AI using real-time sports data.</p>
</footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    res.send(html);
  } catch (err) {
    console.error('Blog article error:', err);
    res.status(500).send('Internal server error');
  }
});

// ── Blog route: Dynamic XML sitemap ──
app.get('/sitemap-blog.xml', async (req, res) => {
  try {
    const list = await dbGetArticles(500);
    const urls = list.map(a => {
      const lastmod = new Date(a.publishedAt).toISOString().split('T')[0];
      return `  <url>
    <loc>https://www.esportsduniya.in/blog/${escapeHtml(a.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.esportsduniya.in/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

// ============================================
// ADMIN API
// ============================================

async function requireAdmin(req, res, next) {
  const user = await dbFindUser(req.user.username);
  if (!user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const allUsers = await dbGetAllUsers();
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const totalUsers = allUsers.length;
    const premiumUsers = allUsers.filter(u => u.isPremium).length;
    const activeToday = allUsers.filter(u => u.lastLoginDate === now.toISOString().split('T')[0]).length;
    const activeWeek = allUsers.filter(u => {
      if (!u.lastLoginDate) return false;
      return new Date(u.lastLoginDate) >= weekAgo;
    }).length;
    const totalPredictions = allUsers.reduce((sum, u) => sum + (u.predictions?.length || 0), 0);
    const totalFanPoints = allUsers.reduce((sum, u) => sum + (u.fanPoints || 0), 0);

    res.json({ totalUsers, premiumUsers, activeToday, activeWeek, totalPredictions, totalFanPoints });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

app.get('/api/admin/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search?.toLowerCase() || '';

    let allUsers = await dbGetAllUsers();
    if (search) {
      allUsers = allUsers.filter(u => u.username?.toLowerCase().includes(search));
    }
    allUsers.sort((a, b) => (b.fanPoints || 0) - (a.fanPoints || 0));

    const total = allUsers.length;
    const users = allUsers.slice((page - 1) * limit, page * limit).map(u => ({
      username: u.username,
      avatar: u.avatar,
      fanPoints: u.fanPoints || 0,
      streak: u.streak || 0,
      isPremium: u.isPremium || false,
      isAdmin: u.isAdmin || false,
      predictions: u.predictions?.length || 0,
      badges: u.badges?.length || 0,
      lastLoginDate: u.lastLoginDate,
      createdAt: u._id?.getTimestamp?.() || null,
    }));

    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

app.post('/api/admin/user/:username/toggle-premium', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isPremium = !user.isPremium;
    await dbUpdateUser(req.params.username, { isPremium, premiumExpiry: isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null });
    res.json({ message: `${req.params.username} premium ${isPremium ? 'enabled' : 'disabled'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.post('/api/admin/user/:username/toggle-admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (req.params.username === req.user.username) return res.status(400).json({ error: 'Cannot change your own admin status' });
    const user = await dbFindUser(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await dbUpdateUser(req.params.username, { isAdmin: !user.isAdmin });
    res.json({ message: `${req.params.username} admin ${!user.isAdmin ? 'granted' : 'revoked'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Admin: manually trigger article generation
app.post('/api/blog/generate', verifyToken, requireAdmin, async (req, res) => {
  res.json({ message: 'Article generation started in background' });
  generateDailyArticles().catch(err => console.error('Manual blog gen error:', err.message));
});

// ============================================
// HTTP + WebSocket Server
// ============================================
// WebSocket is attached to the same HTTP server so Railway only needs one port.
// In dev this also works — ws://localhost:3001 (instead of the old :3002).

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

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
  const dbLabel = useDatabase ? 'Connected' : process.env.MONGODB_URI ? (mongoConnectionError ? 'Failed (in-memory fallback)' : 'Connecting…') : 'Not configured (in-memory)';
  console.log(`   ${useDatabase ? '✅' : process.env.MONGODB_URI ? '⚠️ ' : 'ℹ️ '} MongoDB:         ${dbLabel}`);
  console.log(`\n   ${hasGemini ? '🔍 AI-Powered Live Scores: ENABLED (60s cache)' : '⚠️  AI-Powered Live Scores: DISABLED — Set GEMINI_API_KEY in .env'}\n`);
});
