/* ============================================
   ESPORTSDUNIYA — Match Card Component
   ============================================ */

import { createMatchActions } from './ShareFavorites.js';

export function createMatchCard(match, onClick) {
  const card = document.createElement('article');
  card.className = 'glass-card match-card';
  card.dataset.matchId = match.id;
  card.dataset.sport = match.sport;
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', `${match.teamA.name} vs ${match.teamB.name} — ${match.league}`);

  const statusClass = match.status;
  const statusLabel = match.status === 'live'
    ? `<span class="live-dot" style="display:inline-block" aria-hidden="true"></span> LIVE`
    : match.status === 'upcoming'
      ? '🕐 UPCOMING'
      : '✓ FINISHED';

  const extraInfo = match.minute ? `<span>${match.minute}</span>` : '';
  const sourceBadge = match.source === 'ai-search'
    ? '<span class="match-source-badge ai">🔍 AI Live</span>'
    : '';

  card.innerHTML = `
    <div class="match-card-header">
      <span class="match-card-sport">${match.league}</span>
      <span class="match-card-status ${statusClass}" role="status">${statusLabel}</span>
    </div>
    <div class="match-card-teams">
      <div class="team-row">
        <span class="team-flag" aria-hidden="true">${match.teamA.flag || ''}</span>
        <span class="team-name">${match.teamA.name}</span>
        <span class="team-score" aria-label="Score: ${match.teamA.score}">${match.teamA.score}</span>
      </div>
      <div class="team-row">
        <span class="team-flag" aria-hidden="true">${match.teamB.flag || ''}</span>
        <span class="team-name">${match.teamB.name}</span>
        <span class="team-score" aria-label="Score: ${match.teamB.score}">${match.teamB.score}</span>
      </div>
    </div>
    <div class="momentum-bar" role="progressbar" aria-valuenow="${match.momentum}" aria-valuemin="0" aria-valuemax="100" aria-label="Momentum">
      <div class="momentum-bar-fill" style="width: ${match.momentum}%"></div>
    </div>
    <div class="match-card-meta">
      <span>${match.venue}</span>
      ${extraInfo}
      ${sourceBadge}
    </div>
  `;

  // Add action buttons (favorite + share)
  const actions = createMatchActions(match);
  card.querySelector('.match-card-header').appendChild(actions);

  if (onClick) {
    card.addEventListener('click', () => onClick(match));
  }

  return card;
}
