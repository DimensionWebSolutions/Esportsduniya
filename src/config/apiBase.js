/** Backend API origin — set VITE_API_URL in Cloudflare Pages to https://esportsduniya.onrender.com */
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
