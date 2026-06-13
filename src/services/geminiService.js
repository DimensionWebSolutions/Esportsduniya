const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

function ensureGeminiKey() {
  if (!GEMINI_API_KEY) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Set it in .env if predictions should run in the browser.');
  }
}

function parseJsonResponse(text) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return JSON.parse(trimmed);
}

export function getPredictionCache(matchId) {
  try {
    const item = localStorage.getItem(`fifa_prediction_${matchId}`);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (!parsed || !parsed.expires || Date.now() > parsed.expires) {
      localStorage.removeItem(`fifa_prediction_${matchId}`);
      return null;
    }
    return parsed.prediction;
  } catch (err) {
    console.warn('[geminiService] cache parse failed', err);
    return null;
  }
}

export function setPredictionCache(matchId, prediction) {
  const payload = {
    expires: Date.now() + 6 * 60 * 60 * 1000,
    prediction,
  };
  localStorage.setItem(`fifa_prediction_${matchId}`, JSON.stringify(payload));
}

export async function generateMatchPrediction(match, teamAStats, teamBStats) {
  ensureGeminiKey();
  const prompt = `You are a football analyst. Given these two teams' World Cup 2026 stats, provide: (1) predicted winner with confidence %, (2) predicted scoreline, (3) 3 key factors deciding this match, (4) one bold prediction. Return as JSON only: { winner, confidence, scoreline, factors[], boldPick }`;
  const context = {
    match: {
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      date: match.utcDate,
      venue: match.venue,
      competition: match.competition,
      stage: match.stage,
      status: match.status,
    },
    teamA: teamAStats,
    teamB: teamBStats,
  };

  const body = {
    contents: [{ parts: [{ text: `${prompt}\n\nTeam A stats:\n${JSON.stringify(teamAStats, null, 2)}\n\nTeam B stats:\n${JSON.stringify(teamBStats, null, 2)}\n\nMatch context:\n${JSON.stringify(context, null, 2)}\n\nReturn JSON only.` }] }],
    generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned no text response');
  }

  console.log('[geminiService] Prediction raw response:', text);

  const parsed = parseJsonResponse(text);
  return {
    winner: parsed.winner || `${match.homeTeam.name} / ${match.awayTeam.name}`,
    confidence: Number(parsed.confidence || 0),
    scoreline: parsed.scoreline || '-',
    factors: Array.isArray(parsed.factors) ? parsed.factors : [],
    boldPick: parsed.boldPick || '',
  };
}
