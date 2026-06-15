/* ============================================
   ESPORTSDUNIYA — Dashboard Page
   ============================================ */
import { SPORTS } from '../data/mockData.js';
import { fetchLiveMatches, buildMatchContext, fetchMomentumAnalysis, getLiveScoresMeta } from '../services/apiService.js';
import { createMatchCard } from '../components/MatchCard.js';
import { createMomentumEngine, drawMomentumGraph, animateProbBars, updateMomentumEngine, showMomentumLoading } from '../components/MomentumEngine.js';
import { createAINarrative, initAINarrative } from '../components/AINarrative.js';
import { createDailyChallenges } from '../components/DailyChallenges.js';
import { createHighlightsReel } from '../components/HighlightsReel.js';
import { createTrendingBar } from '../components/TrendingBar.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTIVITY_LABELS = {
  points: 'earned points in',
  cheer: 'cheered for',
  prediction: 'predicted on',
  share: 'shared',
  badge: 'earned a badge',
};

export function createDashboard(gsap) {
  // ── Notification state ──
  let lastScores = {};
  let notifications = JSON.parse(localStorage.getItem('esd_notifications') || '[]');

  function renderNotificationDropdown() {
    let dropdown = document.getElementById('notif-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'notif-dropdown';
      dropdown.style.cssText = 'position:fixed;top:54px;right:22px;z-index:1200;background:rgba(20,20,30,0.98);color:#fff;border-radius:10px;box-shadow:0 4px 24px #0003;padding:12px 0;min-width:260px;max-width:340px;max-height:60vh;overflow-y:auto;display:none;';
      document.body.appendChild(dropdown);
    }
    dropdown.innerHTML = `<div style='font-weight:700;padding:8px 18px 6px 18px;border-bottom:1px solid #333;'>Notifications</div>` +
      (notifications.length === 0
        ? `<div style='padding:18px;color:#aaa;text-align:center;'>No notifications yet.</div>`
        : notifications.slice(-10).reverse().map(n =>
            `<div style='padding:10px 18px;border-bottom:1px solid #222;font-size:1em;'>
              <span style='font-weight:600;'>${n.title}</span><br>
              <span style='font-size:0.95em;color:#aaa;'>${n.body}</span><br>
              <span style='font-size:0.8em;color:#666;'>${n.time}</span>
            </div>`).join(''));
  }

  setTimeout(() => {
    const bell = document.getElementById('notif-bell');
    if (bell) {
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        renderNotificationDropdown();
        const dd = document.getElementById('notif-dropdown');
        if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
      });
      document.addEventListener('click', (e) => {
        const dd = document.getElementById('notif-dropdown');
        if (dd && dd.style.display === 'block' && !bell.contains(e.target)) dd.style.display = 'none';
      });
    }
  }, 0);

  // ── Page container ──
  const page = document.createElement('div');
  page.className = 'page-enter';
  page.id = 'dashboard-page';

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <h1><span class="accent-dot" aria-hidden="true"></span>Live Sports Scores</h1>
    <p>Real-time scores for Cricket & Football from official APIs — NBA, Tennis & F1 via AI when available.</p>
  `;
  page.appendChild(header);

  // ── Trending Bar ──
  page.appendChild(createTrendingBar((sport) => { location.hash = sport; }));

  // ── View Tabs: Live Scores | Following Feed ──
  const viewTabs = document.createElement('div');
  viewTabs.className = 'view-tabs';
  viewTabs.innerHTML = `
    <button class="view-tab active" data-view="live">📊 Live Scores</button>
    <button class="view-tab" data-view="feed">👥 Following Feed</button>
  `;
  page.appendChild(viewTabs);

  // ── Live Scores section ──
  const liveSection = document.createElement('div');
  liveSection.id = 'live-section';

  const tabs = document.createElement('div');
  tabs.className = 'sport-tabs';
  tabs.id = 'sport-tabs';
  tabs.innerHTML = SPORTS.map((sport, i) =>
    `<button class="sport-tab ${i === 0 ? 'active' : ''}" data-sport="${sport.id}">${sport.icon} ${sport.label}</button>`
  ).join('');
  liveSection.appendChild(tabs);

  const lastUpdated = document.createElement('div');
  lastUpdated.className = 'last-updated';
  lastUpdated.id = 'last-updated';
  lastUpdated.innerHTML = '<span class="live-indicator" aria-hidden="true"></span> <span>Connecting to live scores...</span>';

  const retryBtn = document.createElement('button');
  retryBtn.className = 'live-retry-btn';
  retryBtn.id = 'live-retry-btn';
  retryBtn.textContent = '↻ Retry';
  retryBtn.style.display = 'none';
  retryBtn.addEventListener('click', () => renderCards(activeSportFilter, true));

  const statusRow = document.createElement('div');
  statusRow.className = 'live-status-row';
  statusRow.appendChild(lastUpdated);
  statusRow.appendChild(retryBtn);
  liveSection.appendChild(statusRow);

  const loader = document.createElement('div');
  loader.id = 'cards-loader';
  loader.className = 'cards-grid';
  loader.innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
  liveSection.appendChild(loader);

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  grid.id = 'cards-grid';
  grid.style.display = 'none';
  liveSection.appendChild(grid);

  page.appendChild(liveSection);

  // ── Following Feed section ──
  const feedSection = document.createElement('div');
  feedSection.id = 'feed-section';
  feedSection.style.display = 'none';
  page.appendChild(feedSection);

  // ── Daily Challenges ──
  page.appendChild(createDailyChallenges());

  // ── Highlights Reel ──
  const highlightsEl = createHighlightsReel();
  highlightsEl.style.marginTop = 'var(--space-6)';
  page.appendChild(highlightsEl);

  // ── renderCards ──
  let activeSportFilter = 'all';

  function formatLiveStatus(meta, matchCount) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (meta.error && matchCount === 0) {
      return { text: `Unable to load scores — ${meta.error}`, state: 'error' };
    }
    if (meta.stale && meta.fetchedAt) {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(meta.fetchedAt).getTime()) / 60000));
      return { text: `Showing cached scores (updated ${mins}m ago) · ${matchCount} matches`, state: 'cached' };
    }
    const sourceLabel = {
      cricapi: 'CricAPI',
      'api-football': 'API-Football',
      'ai-search': 'AI Estimate',
      'ai-search-cached': 'AI Estimate (cached)',
    }[meta.source] || (meta.source?.includes('cricapi') ? 'CricAPI + others' : 'Live APIs');
    return { text: `Live from ${sourceLabel} · ${matchCount} matches · ${time}`, state: 'live' };
  }

  async function renderCards(sportFilter, forceRefresh = false) {
    activeSportFilter = sportFilter;
    const { sendNotification } = await import('../components/NotificationHelper.js');
    const loaderEl = document.getElementById('cards-loader');
    const gridEl = document.getElementById('cards-grid');

    if (loaderEl) loaderEl.style.display = 'block';
    if (gridEl) { gridEl.style.display = 'none'; gridEl.innerHTML = ''; }

    try {
      const matches = await fetchLiveMatches(sportFilter, { forceRefresh });
      const meta = getLiveScoresMeta();
      const retryEl = document.getElementById('live-retry-btn');

      matches.forEach(match => {
        const key = `${match.sport}_${match.id}`;
        const prev = lastScores[key];
        const currA = match.teamA?.score;
        const currB = match.teamB?.score;
        if (prev && (currA !== prev.a || currB !== prev.b)) {
          let event = null;
          if (parseInt(currA) > parseInt(prev.a)) event = `${match.teamA?.name} scored!`;
          if (parseInt(currB) > parseInt(prev.b)) event = `${match.teamB?.name} scored!`;
          if (event) {
            const title = `${event} (${match.league})`;
            const body = `${match.teamA?.name} ${currA} - ${currB} ${match.teamB?.name}`;
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            sendNotification(title, { body });
            notifications.push({ title, body, time });
            if (notifications.length > 20) notifications = notifications.slice(-20);
            localStorage.setItem('esd_notifications', JSON.stringify(notifications));
            renderNotificationDropdown();
          }
        }
        lastScores[key] = { a: currA, b: currB };
      });

      const updatedEl = document.getElementById('last-updated');
      if (updatedEl) {
        const status = formatLiveStatus(meta, matches.length);
        updatedEl.className = `last-updated status-${status.state}`;
        updatedEl.innerHTML = `<span class="live-indicator" aria-hidden="true"></span> <span>${status.text}</span>`;
      }
      if (retryEl) retryEl.style.display = meta.error && matches.length === 0 ? 'inline-flex' : 'none';

      if (loaderEl) loaderEl.style.display = 'none';
      if (gridEl) gridEl.style.display = '';
      if (!gridEl) return;

      if (matches.length === 0) {
        gridEl.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:var(--space-10);color:var(--text-muted)">
            <div style="font-size:var(--text-3xl);margin-bottom:var(--space-4)">🏟️</div>
            <p>No live matches right now.</p>
            <p style="font-size:var(--text-sm);margin-top:var(--space-2);margin-bottom:var(--space-6)">The scores service is connected but returned 0 live games. Check back soon.</p>
          </div>`;
        return;
      }

      matches.forEach(match => {
        gridEl.appendChild(createMatchCard(match, (m) => { location.hash = `match/${m.id}`; }));
      });

      if (matches.length > 0) {
        window.__currentMatchContext = buildMatchContext(matches[0]);
        loadMomentumForMatch(window.__currentMatchContext);
      }

      if (gsap && gridEl.children.length > 0) {
        gsap.fromTo(gridEl.children,
          { opacity: 0, y: 30, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' }
        );
      }
    } catch (err) {
      console.error('Dashboard render failed:', err);
      const meta = getLiveScoresMeta();
      if (loaderEl) loaderEl.style.display = 'none';
      const updatedEl = document.getElementById('last-updated');
      const retryEl = document.getElementById('live-retry-btn');
      if (updatedEl) {
        updatedEl.className = 'last-updated status-error';
        updatedEl.innerHTML = `<span class="live-indicator" aria-hidden="true"></span> <span>${err.message || 'Live scores unavailable'}</span>`;
      }
      if (retryEl) retryEl.style.display = 'inline-flex';
      if (gridEl) {
        gridEl.style.display = '';
        gridEl.innerHTML = `
          <div class="live-error-state" style="grid-column:1/-1;text-align:center;padding:var(--space-10);color:var(--text-muted)">
            <div style="font-size:var(--text-3xl);margin-bottom:var(--space-4)">⚠️</div>
            <p>Live scores could not be loaded.</p>
            <p style="font-size:var(--text-sm);margin-top:var(--space-2)">${err.message || 'Please try again.'}</p>
          </div>`;
      }
    }
  }

  // ── Momentum loader ──
  async function loadMomentumForMatch(matchContext) {
    try {
      showMomentumLoading();
      const data = await fetchMomentumAnalysis(matchContext);
      updateMomentumEngine(data);
    } catch (err) {
      console.error('Momentum fetch error:', err);
      updateMomentumEngine({ unavailable: true });
    }
  }

  // ── Following Feed renderer ──
  async function renderFollowingFeed() {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (!storedUser?.username) {
      feedSection.innerHTML = '<div class="following-feed-empty">Please log in to see your feed.</div>';
      return;
    }
    feedSection.innerHTML = '<div class="following-feed-loading"><div class="pulse-dot"></div> Loading feed...</div>';
    try {
      const res = await fetch(`${API_BASE}/api/activity-feed/${storedUser.username}`);
      const data = await res.json();
      const items = data.feed || [];

      if (items.length === 0) {
        feedSection.innerHTML = `
          <div class="following-feed-empty">
            <div style="font-size:2.5rem;margin-bottom:var(--space-3)">👥</div>
            <p>You're not following anyone yet.</p>
            <p style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-2)">Discover fans on the Leaderboard and follow them!</p>
            <button class="feed-lb-btn" style="margin-top:var(--space-4);padding:var(--space-2) var(--space-5);background:var(--accent-neon);color:#000;border:none;border-radius:var(--radius-full);font-weight:700;cursor:pointer;">🏆 Go to Leaderboard</button>
          </div>`;
        feedSection.querySelector('.feed-lb-btn')?.addEventListener('click', () => { location.hash = 'leaderboard'; });
        return;
      }

      feedSection.innerHTML = `
        <div class="following-feed">
          ${items.map(item => `
            <div class="activity-item">
              <span class="activity-avatar">${item.avatar || '🦁'}</span>
              <div class="activity-body">
                <span class="activity-username">${item.username}</span>
                <span class="activity-action"> ${ACTIVITY_LABELS[item.type] || item.type} </span>
                <span class="activity-match">${item.data?.match || item.data?.reason || item.data?.sport || ''}</span>
              </div>
              <span class="activity-time">${timeAgo(item.timestamp)}</span>
            </div>`).join('')}
        </div>`;
    } catch {
      feedSection.innerHTML = '<div class="following-feed-empty">Could not load feed. Try again later.</div>';
    }
  }

  // ── Initial render ──
  renderCards('all');

  // ── Sport tab clicks ──
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.sport-tab');
    if (!tab) return;
    tabs.querySelectorAll('.sport-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderCards(tab.dataset.sport);
  });

  // ── View tab switching ──
  viewTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.view-tab');
    if (!tab) return;
    viewTabs.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tab.dataset.view === 'live') {
      liveSection.style.display = '';
      feedSection.style.display = 'none';
    } else {
      liveSection.style.display = 'none';
      feedSection.style.display = '';
      renderFollowingFeed();
    }
  });

  // ── Momentum Engine ──
  const engine = createMomentumEngine();
  page.appendChild(engine);

  // ── AI Narrative ──
  const narrative = createAINarrative();
  narrative.style.marginTop = 'var(--space-6)';
  page.appendChild(narrative);

  return page;
}

export function initDashboard() {
  showMomentumLoading();
  initAINarrative();
}
