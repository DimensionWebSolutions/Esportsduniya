/* ============================================
   ESPORTSDUNIYA — Trending Bar Component
   ============================================ */

export function createTrendingBar(navigateTo) {
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const bar = document.createElement('div');
  bar.className = 'trending-bar';
  bar.id = 'trending-bar';

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/trending`);
      const data = await res.json();
      const trending = data.trending || [];

      bar.innerHTML = `
        <span class="trending-label">🔥 Trending:</span>
        ${trending.map(t => `
          <button class="trending-pill" data-sport="${t.sport}">
            ${t.icon} ${t.label}
            ${t.count > 0 ? `<span class="trending-count">${t.count}</span>` : ''}
          </button>
        `).join('')}
      `;

      bar.querySelectorAll('.trending-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          if (navigateTo) navigateTo(pill.dataset.sport);
        });
      });
    } catch {
      bar.innerHTML = '<span class="trending-label">🔥 Trending: Cricket · Football · NBA</span>';
    }
  }

  load();
  const interval = setInterval(load, 5 * 60 * 1000);
  window.addEventListener('hashchange', () => clearInterval(interval), { once: true });

  return bar;
}
