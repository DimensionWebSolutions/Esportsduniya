/* ============================================
   ESPORTSDUNIYA — Match Card Component
   ============================================ */

import { createMatchActions } from './ShareFavorites.js';
import { shareMatch, shareMatchWhatsApp } from './ShareCard.js';

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'ed-toast ed-toast-success';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
}

function setReminder(match) {
  const reminders = JSON.parse(localStorage.getItem('esd_reminders') || '[]');
  const exists = reminders.find(r => String(r.matchId) === String(match.id));
  if (exists) {
    showToast('Reminder already set! ⏰');
    return;
  }

  const kickoff = match.kickoff || match.minute || new Date(Date.now() + 30 * 60000).toISOString();
  reminders.push({
    matchId: match.id,
    teamA: match.teamA.name,
    teamB: match.teamB.name,
    kickoff,
    sport: match.sport,
    league: match.league,
  });
  localStorage.setItem('esd_reminders', JSON.stringify(reminders));

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  showToast('Reminder set! ⏰');
}

function formatSourceBadge(match) {
  const source = match.source || '';
  if (match.stale || source === 'cached') {
    const mins = match.fetchedAt
      ? Math.max(1, Math.floor((Date.now() - new Date(match.fetchedAt).getTime()) / 60000))
      : null;
    return `<span class="match-source-badge cached">🕐 Cached${mins ? ` · ${mins}m ago` : ''}</span>`;
  }
  if (source === 'cricapi') return '<span class="match-source-badge live">● Live · CricAPI</span>';
  if (source === 'api-football') return '<span class="match-source-badge live">● Live · API-Football</span>';
  if (source === 'ai-search' || source === 'ai-search-cached') {
    return '<span class="match-source-badge ai">🔍 AI Estimate</span>';
  }
  return '';
}

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
      ${formatSourceBadge(match)}
    </div>
    <div class="match-card-footer">
      ${match.status === 'upcoming' ? `<button class="remind-btn" aria-label="Set reminder for this match">🔔 Remind Me</button>` : ''}
      <button class="wa-share-btn" aria-label="Share on WhatsApp" style="background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.3);color:#25d366;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:0.85rem">💬 WhatsApp</button>
      <button class="share-card-btn" aria-label="Share this match">📤 Share</button>
    </div>
  `;

  // Add action buttons (favorite + share)
  const actions = createMatchActions(match);
  card.querySelector('.match-card-header').appendChild(actions);

  // Remind Me button
  const remindBtn = card.querySelector('.remind-btn');
  if (remindBtn) {
    remindBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setReminder(match);
    });
  }

  // Share buttons
  const shareBtn = card.querySelector('.share-card-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareMatch(match);
    });
  }
  const waBtn = card.querySelector('.wa-share-btn');
  if (waBtn) {
    waBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      shareMatchWhatsApp(match);
    });
  }

  if (onClick) {
    card.addEventListener('click', () => {
      if (!match.id) {
        showToast('Match detail unavailable for this entry');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const key = `esd_views_count_${today}`;
      const count = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, String(count + 1));
      onClick(match);
    });
  }

  // ── Live Score Update listener (from LiveScoreManager WebSocket) ──
  card.addEventListener('scoreupdate', (e) => {
    const { match: updated } = e.detail;
    if (!updated) return;

    // Update team A score
    const scoreA = card.querySelector('.team-row:first-child .team-score');
    if (scoreA && scoreA.textContent !== String(updated.teamA?.score ?? '')) {
      scoreA.textContent = updated.teamA?.score ?? scoreA.textContent;
      flashElement(scoreA);
    }

    // Update team B score
    const scoreB = card.querySelector('.team-row:last-child .team-score');
    if (scoreB && scoreB.textContent !== String(updated.teamB?.score ?? '')) {
      scoreB.textContent = updated.teamB?.score ?? scoreB.textContent;
      flashElement(scoreB);
    }

    // Update minute / status
    const metaSpans = card.querySelectorAll('.match-card-meta span');
    if (updated.minute && metaSpans.length > 1) {
      metaSpans[1].textContent = updated.minute;
    }

    // Update momentum bar
    if (updated.momentum !== undefined) {
      const fill = card.querySelector('.momentum-bar-fill');
      if (fill) fill.style.width = `${updated.momentum}%`;
    }

    // Update status badge if changed (e.g. upcoming → live)
    const statusEl = card.querySelector('.match-card-status');
    if (statusEl && updated.status && !statusEl.className.includes(updated.status)) {
      statusEl.className = `match-card-status ${updated.status}`;
      if (updated.status === 'live') {
        statusEl.innerHTML = `<span class="live-dot" style="display:inline-block" aria-hidden="true"></span> LIVE`;
      } else if (updated.status === 'finished') {
        statusEl.innerHTML = `✓ FINISHED`;
      }
    }
  });

  return card;
}

/** Flash an element with a neon highlight to signal a score change */
function flashElement(el) {
  el.classList.remove('score-flash');
  // Force reflow so animation re-triggers if already flashing
  void el.offsetWidth;
  el.classList.add('score-flash');
  setTimeout(() => el.classList.remove('score-flash'), 900);
}
