/* ============================================
   ESPORTSDUNIYA — Live Score Manager
   Singleton WebSocket client that receives
   score_update broadcasts from the server
   and fires DOM custom events so any card
   on the page can react without re-render.
   ============================================ */

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT = 10;

let socket = null;
let reconnectCount = 0;
let reconnectTimer = null;
let isDestroyed = false;

/**
 * Call once per app session (from Dashboard.js init).
 * Connects to the same-host WebSocket server.
 */
export function initLiveScoreManager() {
  if (socket && socket.readyState <= 1) return; // already open or connecting
  isDestroyed = false;
  connect();
}

export function destroyLiveScoreManager() {
  isDestroyed = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.close();
  socket = null;
}

function connect() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Same host + port as the API server (Vite dev proxy routes ws:// too)
  const host = window.location.hostname;
  const port = window.location.port || (proto === 'wss:' ? '443' : '80');
  const url = `${proto}//${host}:${port}`;

  try {
    socket = new WebSocket(url);
  } catch (e) {
    console.warn('[LiveScoreManager] WebSocket init failed:', e);
    scheduleReconnect();
    return;
  }

  socket.addEventListener('open', () => {
    reconnectCount = 0;
    console.log('[LiveScoreManager] Connected ✅');
    // Notify any listeners that WS is live
    document.dispatchEvent(new CustomEvent('lsm:connected'));
  });

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleMessage(payload);
    } catch {
      // Non-JSON frames ignored
    }
  });

  socket.addEventListener('close', () => {
    if (!isDestroyed) scheduleReconnect();
  });

  socket.addEventListener('error', () => {
    // close will follow; handled there
  });
}

function scheduleReconnect() {
  if (isDestroyed || reconnectCount >= MAX_RECONNECT) return;
  reconnectCount++;
  const delay = RECONNECT_DELAY_MS * Math.min(reconnectCount, 5);
  console.log(`[LiveScoreManager] Reconnect #${reconnectCount} in ${delay}ms`);
  reconnectTimer = setTimeout(() => {
    if (!isDestroyed) connect();
  }, delay);
}

function handleMessage(payload) {
  if (!payload?.type) return;

  switch (payload.type) {
    case 'score_update':
      dispatchScoreUpdates(payload.matches || []);
      break;
    case 'oracle_update':
      document.dispatchEvent(new CustomEvent('lsm:oracle_update', { detail: payload }));
      break;
    case 'fan_zone_update':
      document.dispatchEvent(new CustomEvent('lsm:fan_zone_update', { detail: payload }));
      break;
    default:
      break;
  }
}

/**
 * For each match in the payload, fire a `scoreupdate` custom event
 * on the specific card element (by data-match-id) AND a global event.
 */
function dispatchScoreUpdates(matches) {
  matches.forEach(match => {
    if (!match?.id) return;

    const detail = { match };

    // Target the specific card if it exists on the page
    const card = document.querySelector(`[data-match-id="${match.id}"]`);
    if (card) {
      card.dispatchEvent(new CustomEvent('scoreupdate', { detail, bubbles: false }));
    }

    // Also fire globally so Dashboard can add new cards for newly-live matches
    document.dispatchEvent(new CustomEvent('lsm:score_update', { detail }));
  });
}
