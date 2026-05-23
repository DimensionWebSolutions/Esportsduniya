/* ============================================
   ESPORTSDUNIYA — Dynamic Island (Live Score Ticker)
   ============================================ */
import { LIVE_MATCHES } from '../data/mockData.js';
import { createSearchTrigger } from './SearchOverlay.js';

export function createDynamicIsland() {
  const island = document.createElement('header');
  island.className = 'dynamic-island';
  island.id = 'dynamic-island';
  island.setAttribute('role', 'banner');
  island.setAttribute('aria-label', 'Live scores ticker');

  const liveMatches = LIVE_MATCHES.filter(m => m.status === 'live');

  // Build ticker items (duplicated for seamless infinite scroll)
  const tickerItems = [...liveMatches, ...liveMatches].map(match => {
    const statusLabel = match.minute || match.teamA.detail || 'LIVE';
    return `
      <div class="ticker-item" data-match-id="${match.id}" role="listitem" aria-label="${match.teamA.name} ${match.teamA.score} vs ${match.teamB.name} ${match.teamB.score}">
        <span class="live-dot" aria-hidden="true"></span>
        <span class="teams">${match.teamA.name} vs ${match.teamB.name}</span>
        <span class="score">${match.teamA.score} - ${match.teamB.score}</span>
        <span class="text-muted" style="font-size:0.7rem">${statusLabel}</span>
      </div>
    `;
  }).join('');

  island.innerHTML = `
    <a class="island-logo" href="#dashboard" aria-label="Esportsduniya Home">
      <span class="bolt" aria-hidden="true">⚡</span>
      <span>Esportsduniya</span>
    </a>
    <div class="island-ticker-wrap" role="list" aria-label="Live score updates">
      <div class="island-ticker" id="island-ticker">
        ${tickerItems}
      </div>
    </div>
  `;

  // Add search button
  const searchBtn = createSearchTrigger();
  island.appendChild(searchBtn);

  return island;
}

/**
 * Update the ticker with fresh match data
 */
export function updateTickerData(matches) {
  const ticker = document.getElementById('island-ticker');
  if (!ticker || !matches || matches.length === 0) return;

  const liveOnly = matches.filter(m => m.status === 'live');
  const toShow = liveOnly.length > 0 ? liveOnly : matches.slice(0, 6);

  const items = [...toShow, ...toShow].map(match => {
    const statusLabel = match.minute || '';
    const dotClass = match.status === 'live' ? 'live-dot' : '';
    return `
      <div class="ticker-item" data-match-id="${match.id}" role="listitem">
        ${match.status === 'live' ? '<span class="live-dot" aria-hidden="true"></span>' : ''}
        <span class="teams">${match.teamA.name} vs ${match.teamB.name}</span>
        <span class="score">${match.teamA.score} - ${match.teamB.score}</span>
        <span class="text-muted" style="font-size:0.7rem">${statusLabel}</span>
      </div>
    `;
  }).join('');

  ticker.innerHTML = items;
}

/**
 * Simulate live score updates in the ticker
 */
export function startTickerUpdates() {
  setInterval(() => {
    const scoreEls = document.querySelectorAll('.ticker-item .score');
    scoreEls.forEach(el => {
      // Subtle flash animation on update
      el.style.transition = 'color 0.2s';
      el.style.color = 'var(--accent-neon)';
      setTimeout(() => {
        el.style.color = 'var(--text-primary)';
      }, 600);
    });
  }, 8000);
}
