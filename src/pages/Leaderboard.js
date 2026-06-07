/* ============================================
   ESPORTSDUNIYA — Leaderboard Page
   ============================================ */

const API_BASE = import.meta.env.VITE_API_URL || '';

export function createLeaderboard(gsap) {
  const page = document.createElement('div');
  page.className = 'page-enter';
  page.id = 'leaderboard-page';

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  page.innerHTML = `
    <div class="section-header">
      <h1><span class="accent-dot" aria-hidden="true"></span>Fan Leaderboard</h1>
      <p>Top fans ranked by FanPoints. Earn points by predicting, cheering, and sharing.</p>
    </div>

    <div class="lb-tabs">
      <button class="lb-tab active" data-window="alltime">🏆 All Time</button>
      <button class="lb-tab" data-window="week">📅 This Week</button>
      <button class="lb-tab" data-window="today">⚡ Today</button>
    </div>

    <div id="lb-list" class="lb-list">
      ${Array(10).fill('<div class="skeleton" style="height:56px;border-radius:12px;margin-bottom:8px;"></div>').join('')}
    </div>

    <div id="lb-my-rank" class="lb-my-rank" style="display:none"></div>
  `;

  let currentWindow = 'alltime';
  let refreshTimer = null;

  async function load(win) {
    const listEl = document.getElementById('lb-list');
    const myRankEl = document.getElementById('lb-my-rank');
    if (!listEl) return;

    try {
      const res = await fetch(`${API_BASE}/api/leaderboard?window=${win}`);
      const data = await res.json();
      const board = data.leaderboard || [];

      if (board.length === 0) {
        listEl.innerHTML = `<div class="lb-empty">No fans ranked yet. Be the first! 🚀</div>`;
        return;
      }

      listEl.innerHTML = board.map(fan => {
        const isMe = currentUser && fan.username === currentUser.username;
        const rankEmoji = fan.rank === 1 ? '🥇' : fan.rank === 2 ? '🥈' : fan.rank === 3 ? '🥉' : `#${fan.rank}`;
        return `
          <div class="leaderboard-row ${isMe ? 'me' : ''}" data-username="${fan.username}">
            <div class="lb-rank">${rankEmoji}</div>
            <div class="lb-avatar">${fan.avatar || '🦁'}</div>
            <div class="lb-info">
              <div class="lb-username">${fan.username}${isMe ? ' <span class="lb-you">You</span>' : ''}</div>
              <div class="lb-badges">${(fan.badges || []).slice(0, 3).map(b => b.name.split(' ')[0]).join(' ')}</div>
            </div>
            <div class="lb-points">
              <span class="lb-pts-num">${(fan.fanPoints || 0).toLocaleString()}</span>
              <span class="lb-pts-label">pts</span>
            </div>
            ${fan.streak > 0 ? `<div class="lb-streak">🔥${fan.streak}</div>` : ''}
          </div>
        `;
      }).join('');

      // Mini profile card on click
      listEl.querySelectorAll('.leaderboard-row').forEach(row => {
        row.addEventListener('click', () => showMiniProfile(row.dataset.username, board));
      });

      // Show current user's rank if not in top 50
      const myEntry = board.find(f => currentUser && f.username === currentUser.username);
      if (!myEntry && currentUser) {
        myRankEl.style.display = 'block';
        myRankEl.innerHTML = `
          <div class="lb-my-rank-inner">
            <span>Your rank is outside the top 50.</span>
            <span>Keep earning FanPoints to climb! 🚀</span>
          </div>
        `;
      } else {
        myRankEl.style.display = 'none';
      }

      if (gsap && listEl.children.length > 0) {
        gsap.fromTo(listEl.children,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' }
        );
      }
    } catch (err) {
      if (listEl) listEl.innerHTML = `<div class="lb-empty">Could not load leaderboard. Try again later.</div>`;
    }
  }

  function showMiniProfile(username, board) {
    const fan = board.find(f => f.username === username);
    if (!fan) return;

    const existing = document.getElementById('lb-mini-profile');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.id = 'lb-mini-profile';
    card.className = 'lb-mini-profile';
    card.innerHTML = `
      <div class="lb-mini-inner">
        <button class="lb-mini-close">✕</button>
        <div class="lb-mini-avatar">${fan.avatar || '🦁'}</div>
        <div class="lb-mini-name">${fan.username}</div>
        <div class="lb-mini-pts">🪙 ${(fan.fanPoints || 0).toLocaleString()} pts</div>
        ${fan.streak > 0 ? `<div class="lb-mini-streak">🔥 ${fan.streak} day streak</div>` : ''}
        <div class="lb-mini-section">Badges</div>
        <div class="lb-mini-badges">
          ${fan.badges?.length > 0
            ? fan.badges.map(b => `<span class="lb-mini-badge">${b.name}</span>`).join('')
            : '<span style="color:var(--text-muted);font-size:var(--text-sm)">No badges yet</span>'}
        </div>
        <div class="lb-mini-section">Favourite Sports</div>
        <div class="lb-mini-sports">
          ${fan.favoriteSports?.length > 0
            ? fan.favoriteSports.join(' · ')
            : 'All sports'}
        </div>
      </div>
    `;

    card.querySelector('.lb-mini-close').addEventListener('click', () => card.remove());
    card.addEventListener('click', e => { if (e.target === card) card.remove(); });
    document.body.appendChild(card);
  }

  // Tab switching
  page.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      page.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentWindow = tab.dataset.window;
      load(currentWindow);
    });
  });

  // Initial load
  load(currentWindow);

  // Auto-refresh every 60s
  refreshTimer = setInterval(() => load(currentWindow), 60_000);
  window.addEventListener('hashchange', () => clearInterval(refreshTimer), { once: true });

  return page;
}
