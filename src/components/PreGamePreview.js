/* ============================================
   ESPORTSDUNIYA — AI Pre-game Preview Component
   ============================================ */
import { fetchPreGamePreview, buildMatchContext } from '../services/apiService.js';

export function createPreGamePreview(match, gsap) {
  const container = document.createElement('div');
  container.className = 'glass-card pregame-preview-card';
  container.id = `pregame-preview-${match.id}`;

  const teamAName = match.teamA?.name || 'Team A';
  const teamBName = match.teamB?.name || 'Team B';

  container.innerHTML = `
    <div class="preview-header">
      <span class="preview-icon">🧠</span>
      <div class="preview-title-group">
        <h3>AI Pre-match Preview</h3>
        <span class="preview-source-badge" id="preview-source">🔍 Analyzing...</span>
      </div>
    </div>

    <!-- Win Probability Bar -->
    <div class="probability-section">
      <div class="prob-labels">
        <span class="prob-team team-a">${teamAName}</span>
        <span class="prob-team team-b">${teamBName}</span>
      </div>
      <div class="prob-bar-container">
        <div class="prob-fill-a" id="prob-fill-a" style="width: 50%;">50%</div>
        <div class="prob-fill-b" id="prob-fill-b" style="width: 50%;">50%</div>
      </div>
    </div>

    <!-- Recent Form Grid -->
    <div class="form-grid">
      <div class="form-column">
        <span class="form-label">${teamAName} Form</span>
        <div class="form-badges" id="form-badges-a">
          <span class="skeleton-dot"></span>
          <span class="skeleton-dot"></span>
          <span class="skeleton-dot"></span>
        </div>
      </div>
      <div class="form-column">
        <span class="form-label">${teamBName} Form</span>
        <div class="form-badges" id="form-badges-b">
          <span class="skeleton-dot"></span>
          <span class="skeleton-dot"></span>
          <span class="skeleton-dot"></span>
        </div>
      </div>
    </div>

    <!-- Head to Head Record -->
    <div class="h2h-section">
      <h4 class="sub-heading">⚔️ Head-to-Head</h4>
      <p id="h2h-text" class="h2h-text">Loading head-to-head records...</p>
    </div>

    <!-- Key Matchups -->
    <div class="matchups-section">
      <h4 class="sub-heading">🎯 Tactical Focus & Key matchups</h4>
      <ul id="matchups-list" class="matchups-list">
        <li>Analyzing key players...</li>
      </ul>
    </div>

    <!-- Summary Commentary -->
    <div class="summary-section">
      <h4 class="sub-heading">📝 Pre-match Analysis Summary</h4>
      <div id="summary-text" class="summary-text typing">Researching match conditions...</div>
    </div>
  `;

  // Fetch data in async IIFE
  (async () => {
    const context = buildMatchContext(match);
    const data = await fetchPreGamePreview(context);

    const sourceEl = container.querySelector('#preview-source');
    const probA = container.querySelector('#prob-fill-a');
    const probB = container.querySelector('#prob-fill-b');
    const formA = container.querySelector('#form-badges-a');
    const formB = container.querySelector('#form-badges-b');
    const h2hText = container.querySelector('#h2h-text');
    const matchupsList = container.querySelector('#matchups-list');
    const summaryText = container.querySelector('#summary-text');

    if (data.unavailable) {
      if (sourceEl) sourceEl.textContent = 'Preview unavailable';
      if (summaryText) summaryText.textContent = 'Pre-match preview is unavailable right now.';
      return;
    }

    // Source Badge
    if (sourceEl) {
      if (data.source === 'ai') {
        sourceEl.textContent = 'Live AI + Search 🔍';
        sourceEl.style.background = 'rgba(57,255,20,0.1)';
        sourceEl.style.color = 'var(--accent-neon)';
      } else {
        sourceEl.textContent = 'Unavailable';
        sourceEl.style.background = 'rgba(107,107,128,0.15)';
        sourceEl.style.color = 'var(--text-muted)';
      }
    }

    // Win Probabilities
    const pA = data.winProbability?.teamA ?? 50;
    const pB = data.winProbability?.teamB ?? 50;
    if (probA && probB) {
      if (gsap) {
        gsap.to(probA, { width: `${pA}%`, duration: 0.8, ease: 'power2.out' });
        gsap.to(probB, { width: `${pB}%`, duration: 0.8, ease: 'power2.out' });
      } else {
        probA.style.width = `${pA}%`;
        probB.style.width = `${pB}%`;
      }
      probA.textContent = `${pA}%`;
      probB.textContent = `${pB}%`;
    }

    // Form Badges helper
    function renderFormBadges(formList, element) {
      if (!element) return;
      element.innerHTML = '';
      const list = Array.isArray(formList) ? formList : ['W', 'D', 'L'];
      list.forEach(char => {
        const span = document.createElement('span');
        const outcome = char.toUpperCase();
        span.className = `form-dot outcome-${outcome.toLowerCase()}`;
        span.textContent = outcome;
        element.appendChild(span);
      });
    }
    renderFormBadges(data.teamAForm, formA);
    renderFormBadges(data.teamBForm, formB);

    // Head-to-Head
    if (h2hText) {
      h2hText.textContent = data.headToHead || 'No head-to-head records found.';
    }

    // Key Matchups
    if (matchupsList) {
      matchupsList.innerHTML = '';
      const list = Array.isArray(data.keyMatchups) ? data.keyMatchups : [];
      if (list.length === 0) {
        matchupsList.innerHTML = '<li>Tactical formations balanced. No key standout matchup highlights found.</li>';
      } else {
        list.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item;
          matchupsList.appendChild(li);
        });
      }
    }

    // Summary Commentary (Typewriter effect)
    if (summaryText) {
      summaryText.textContent = '';
      summaryText.classList.remove('typing');
      const text = data.summary || 'Summary preview data unavailable.';
      
      let idx = 0;
      const timer = setInterval(() => {
        if (idx < text.length) {
          summaryText.textContent += text[idx];
          idx++;
        } else {
          clearInterval(timer);
        }
      }, 10);

      // Save animation timer in DOM element so it can be cleared if removed
      summaryText.dataset.timerId = timer;
    }

    // Entrance animation
    if (gsap) {
      gsap.fromTo(
        [probA, probB, formA, formB, h2hText, matchupsList, summaryText],
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
      );
    }

  })();

  return container;
}
