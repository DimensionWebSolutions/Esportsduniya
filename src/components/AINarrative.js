/* ============================================
   ESPORTSDUNIYA — AI Narrative Component
   ============================================ */
import { fetchAINarrative } from '../services/apiService.js';

const TONES = [
  { id: 'hype', label: '🔥 Hype', color: 'var(--accent-fire)' },
  { id: 'analytical', label: '🧠 Analytical', color: 'var(--accent-cyber)' },
  { id: 'sarcastic', label: '😏 Sarcastic', color: 'var(--accent-purple)' },
];

export function createAINarrative() {
  const container = document.createElement('div');
  container.className = 'ai-narrative';
  container.id = 'ai-narrative';

  container.innerHTML = `
    <div class="ai-narrative-header">
      <div class="ai-narrative-title">
        <span>🤖</span>
        <span>AI Sports Journalist</span>
        <span class="ai-source-badge" id="ai-source-badge" style="
          font-size:0.65rem;
          padding:2px 8px;
          border-radius:var(--radius-full);
          background:rgba(0,212,255,0.1);
          color:var(--accent-cyber);
          border:1px solid rgba(0,212,255,0.2);
          margin-left:8px;
        "></span>
      </div>
      <div class="tone-switcher" id="tone-switcher">
        ${TONES.map((t, i) => `
          <button class="tone-btn ${i === 0 ? 'active' : ''}" data-tone="${t.id}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="ai-narrative-text" id="ai-narrative-text"></div>
  `;

  return container;
}

/**
 * Initialize tone switcher and start typewriter effect
 */
export function initAINarrative() {
  const switcher = document.getElementById('tone-switcher');
  const textEl = document.getElementById('ai-narrative-text');
  const sourceBadge = document.getElementById('ai-source-badge');
  if (!switcher || !textEl) return;

  let currentAnimation = null;

  function typewrite(text, el) {
    if (currentAnimation) clearInterval(currentAnimation);
    el.textContent = '';
    el.classList.add('typing');

    let i = 0;
    const speed = 12;

    currentAnimation = setInterval(() => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
      } else {
        clearInterval(currentAnimation);
        currentAnimation = null;
        el.classList.remove('typing');
      }
    }, speed);
  }

  async function loadNarrative(tone) {
    const matchContext = window.__currentMatchContext || 'Mumbai Indians 186/4 (18.2 ov) vs Chennai Super Kings 142/3 (15.0 ov) — IPL 2026, Live at Wankhede Stadium';

    // Show loading state
    textEl.textContent = '';
    textEl.classList.add('typing');
    if (sourceBadge) sourceBadge.textContent = '🔍 Searching Internet...';

    // Fetch from API (returns { text, source, provider })
    const result = await fetchAINarrative(matchContext, tone);
    const narrative = result.text || result;
    const source = result.source || 'mock';

    // Update source badge
    if (sourceBadge) {
      if (source === 'internet') {
        sourceBadge.textContent = 'Live AI + Search 🔍';
        sourceBadge.style.background = 'rgba(57,255,20,0.1)';
        sourceBadge.style.color = 'var(--accent-neon, #39FF14)';
      } else if (source === 'ai') {
        sourceBadge.textContent = 'Live AI ✨';
        sourceBadge.style.background = 'rgba(0,212,255,0.1)';
        sourceBadge.style.color = 'var(--accent-cyber)';
      } else {
        sourceBadge.textContent = 'Mock Data';
        sourceBadge.style.background = 'rgba(107,107,128,0.15)';
        sourceBadge.style.color = 'var(--text-muted)';
      }
    }

    typewrite(narrative, textEl);
  }

  // Load initial narrative
  loadNarrative('hype');

  // Tone button clicks
  switcher.addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-btn');
    if (!btn) return;

    const tone = btn.dataset.tone;
    switcher.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    loadNarrative(tone);
  });
}
