/** Map legacy page ids to React Router paths */
export function pageIdToPath(pageId) {
  if (!pageId || pageId === 'dashboard') return '/';
  if (pageId.startsWith('match/')) return `/${pageId}`;
  const sports = ['cricket', 'football', 'nba', 'tennis', 'f1'];
  if (sports.includes(pageId)) return `/sport/${pageId}`;
  const map = {
    standings: '/standings',
    leaderboard: '/leaderboard',
    arena: '/arena',
    timemachine: '/timemachine',
    crowdpulse: '/crowdpulse',
    fifa: '/fifa',
    profile: '/profile',
    blog: '/blog',
    analytics: '/analytics',
    admin: '/admin',
  };
  return map[pageId] || '/';
}

export function pathToPageId(pathname) {
  if (pathname === '/' || pathname === '') return 'dashboard';
  if (pathname.startsWith('/match/')) return pathname.slice(1);
  if (pathname.startsWith('/sport/')) return pathname.split('/')[2];
  const segment = pathname.replace(/^\//, '').split('/')[0];
  return segment || 'dashboard';
}

export function hashToPath(hash) {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (!raw) return '/';
  return pageIdToPath(raw);
}
