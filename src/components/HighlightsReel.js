/* ============================================
   ESPORTSDUNIYA — Highlights Reel Component
   ============================================ */

const SPORT_ICONS = { cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️' };

export function createHighlightsReel() {
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const section = document.createElement('div');
  section.className = 'highlights-reel';
  section.id = 'highlights-reel';

  section.innerHTML = `
    <div class="highlights-header">
      <span class="highlights-title">🎬 Highlights</span>
      <span class="highlights-badge">Last 24h</span>
    </div>
    <div class="highlights-list" id="highlights-list">
      ${Array(5).fill('<div class="skeleton" style="height:80px;border-radius:12px;"></div>').join('')}
    </div>
  `;

  async function loadHighlights() {
    try {
      const res = await fetch(`${API_BASE}/api/highlights`);
      const data = await res.json();
      const list = document.getElementById('highlights-list');
      if (!list) return;

      const highlights = Array.isArray(data) ? data : (data.highlights || []);
      if (highlights.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-4)">No highlights available right now.</div>';
        return;
      }

      list.innerHTML = highlights.map((h, i) => `
        <div class="highlight-card" data-idx="${i}">
          <div class="highlight-sport">${SPORT_ICONS[h.sport] || '🏅'}</div>
          <div class="highlight-body">
            <div class="highlight-title">${h.title}</div>
            <div class="highlight-summary">${h.summary}</div>
          </div>
          <div class="highlight-expand">▼</div>
        </div>
      `).join('');

      // Expand/collapse on click
      list.querySelectorAll('.highlight-card').forEach((card, i) => {
        card.addEventListener('click', () => {
          const isOpen = card.classList.contains('expanded');
          list.querySelectorAll('.highlight-card').forEach(c => c.classList.remove('expanded'));
          if (!isOpen) card.classList.add('expanded');
        });
      });
    } catch (err) {
      const list = document.getElementById('highlights-list');
      if (list) list.innerHTML = '<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-4)">Could not load highlights.</div>';
    }
  }

  loadHighlights();

  // Refresh every 10 minutes
  const interval = setInterval(loadHighlights, 10 * 60 * 1000);
  window.addEventListener('hashchange', () => clearInterval(interval), { once: true });

  return section;
}
