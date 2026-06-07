/* ============================================
   ESPORTSDUNIYA — Share Card Component
   ============================================ */

import { trackShareAction } from './DailyChallenges.js';

const SPORT_COLORS = {
  cricket:  '#22C55E',
  football: '#3B82F6',
  nba:      '#F97316',
  tennis:   '#FACC15',
  f1:       '#EF4444',
};

function showToast(msg) {
  let t = document.getElementById('ed-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'ed-toast';
    t.className = 'ed-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

async function awardSharePoints(matchId) {
  const sharedKey = 'esd_shared_matches';
  const shared = JSON.parse(localStorage.getItem(sharedKey) || '[]');
  if (shared.includes(String(matchId))) return; // already awarded

  shared.push(String(matchId));
  localStorage.setItem(sharedKey, JSON.stringify(shared));

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.username) return;

  const API_BASE = import.meta.env.VITE_API_URL || '';
  try {
    const res = await fetch(`${API_BASE}/api/fanpoints/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, points: 10, reason: 'Shared a match' }),
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('user', JSON.stringify({ ...user, fanPoints: data.user.fanPoints, badges: data.user.badges }));
    }
  } catch (e) {
    console.warn('Share points award failed:', e);
  }
}

function generateShareCanvas(match) {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const sport = match.sport || 'football';
  const accentColor = SPORT_COLORS[sport] || '#39FF14';

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, 400, 220);

  // Accent top bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, 400, 4);

  // Logo
  ctx.fillStyle = '#39FF14';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('⚡ EsportsDuniya', 20, 28);

  // League
  ctx.fillStyle = '#888';
  ctx.font = '12px sans-serif';
  ctx.fillText(match.league || '', 20, 50);

  // Team A
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(match.teamA?.name || 'Team A', 20, 95);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(match.teamA?.score || '-', 380, 95);

  // VS divider
  ctx.fillStyle = '#333';
  ctx.fillRect(20, 105, 360, 1);

  // Team B
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(match.teamB?.name || 'Team B', 20, 140);
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(match.teamB?.score || '-', 380, 140);

  // Status pill
  ctx.textAlign = 'left';
  const statusColor = match.status === 'live' ? '#39FF14' : match.status === 'upcoming' ? '#00D4FF' : '#888';
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(match.status?.toUpperCase() || '', 20, 170);

  if (match.minute) {
    ctx.fillStyle = '#666';
    ctx.fillText(match.minute, 70, 170);
  }

  // Watermark
  ctx.fillStyle = '#444';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('esportsduniya.in', 380, 210);

  return canvas;
}

export async function shareMatch(match) {
  const canvas = generateShareCanvas(match);
  const shareText = `${match.teamA?.name} ${match.teamA?.score} vs ${match.teamB?.score} ${match.teamB?.name} — ${match.league} | esportsduniya.in`;

  try {
    if (navigator.share && navigator.canShare) {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'match.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'Live Match — EsportsDuniya', text: shareText, files: [file] });
        } else {
          await navigator.share({ title: 'Live Match — EsportsDuniya', text: shareText });
        }
        await awardSharePoints(match.id);
        trackShareAction();
        showToast('Shared! +10 FanPoints 🎉');
      });
    } else {
      // Fallback: copy text to clipboard
      await navigator.clipboard.writeText(shareText);
      await awardSharePoints(match.id);
      trackShareAction();
      showToast('📋 Copied to clipboard! +10 FanPoints');
    }
  } catch (err) {
    // User cancelled or error — still try clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('📋 Copied to clipboard!');
    } catch {
      showToast('Share failed. Try copying the URL manually.');
    }
  }
}
