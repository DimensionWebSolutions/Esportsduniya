const WS_URL = import.meta.env.VITE_WS_URL;
const API_URL = import.meta.env.VITE_API_URL;

export function getWebSocketUrl() {
  if (WS_URL) return WS_URL;

  if (API_URL) {
    try {
      const apiUrl = new URL(API_URL);
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${apiUrl.host}`;
    } catch (err) {
      console.warn('[webSocketUrl] Invalid VITE_API_URL:', err.message);
    }
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (import.meta.env.DEV) {
    return `${protocol}//${window.location.hostname}:3001`;
  }

  const host = window.location.host || `${window.location.hostname}:${window.location.port || (protocol === 'wss:' ? '443' : '80')}`;
  return `${protocol}//${host}`;
}
