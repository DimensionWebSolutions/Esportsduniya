const API_PREDICTION_ENDPOINT = '/api/ai/fifa-prediction';

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
  const response = await fetch(API_PREDICTION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ match, teamAStats, teamBStats }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Prediction API ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  const prediction = data.prediction;
  if (!prediction) {
    throw new Error('Prediction API returned no prediction');
  }

  return prediction;
}
