import { apiUrl } from '@/config/apiBase';

export const CHALLENGE_PROGRESS_EVENT = 'esd:challenge-progress';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/** Per-day guard so repeat visits to the same match don't inflate progress. */
function alreadyCounted(dedupeKey) {
  if (!dedupeKey) return false;
  const storageKey = `esd_challenge_seen_${todayKey()}`;
  try {
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (seen.includes(dedupeKey)) return true;
    localStorage.setItem(storageKey, JSON.stringify([...seen, dedupeKey].slice(-100)));
    return false;
  } catch {
    return false;
  }
}

/**
 * Report progress on today's challenges. Silent no-op for signed-out fans, and
 * notifies any mounted challenge panel so it can refresh.
 */
export async function reportChallengeProgress(type, dedupeKey) {
  const token = localStorage.getItem('token');
  let username = null;
  try {
    username = JSON.parse(localStorage.getItem('user') || 'null')?.username || null;
  } catch {
    return;
  }
  if (!username || !token) return;
  if (alreadyCounted(dedupeKey)) return;

  try {
    await fetch(apiUrl(`/api/challenges/${encodeURIComponent(username)}/progress`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type }),
    });
    document.dispatchEvent(new CustomEvent(CHALLENGE_PROGRESS_EVENT, { detail: { type } }));
  } catch {
    // Non-critical: challenges catch up on the next action.
  }
}
