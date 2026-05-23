// Match Detail Page
import { fetchLiveMatches, fetchMomentumAnalysis, connectWebSocket } from '../services/apiService.js';
import { createMomentumEngine, updateMomentumEngine, showMomentumLoading } from '../components/MomentumEngine.js';
import { createAINarrative, initAINarrative } from '../components/AINarrative.js';
import { createAIRadio, initAIRadio, queueCommentary } from '../components/AIRadio.js';
import { createFanZone, initFanZone } from '../components/FanZone.js';
import { createOracle, initOracle } from '../components/Oracle.js';
import { createSocialPulse, initSocialPulse } from '../components/SocialPulse.js';
import { buildMatchContext, fetchSocialSentiment } from '../services/apiService.js';
import { createOracleChat } from '../components/OracleChat.js';
import '../styles/tactics.css';

export function createMatchDetail(matchId, gsap) {
  const page = document.createElement('div');
  page.className = 'page-enter';
  page.id = 'matchdetail-page';
  page.innerHTML = `
      <div class="section-header">
        <h1>Match Details</h1>
        <div id="match-detail-header"></div>
      </div>
      <div id="match-detail-content">
        <div id="ai-radio-root"></div>
        <div class="interactive-grid">
          <div id="fan-zone-root"></div>
          <div id="oracle-root"></div>
        </div>
        
        <!-- Tactical Room -->
        <div class="tactical-room">
          <div class="section-label">THE TACTICAL ROOM</div>
          <div class="tactical-grid">
            <div id="tactical-blueprint-root"></div>
            <div id="oracle-chat-root"></div>
          </div>
        </div>

        <div id="social-pulse-root"></div>
        <div id="momentum-engine-root"></div>
        <div id="ai-narrative-root"></div>
      </div>
    `;

  // Fetch and render match data
  (async () => {
    const allMatches = await fetchLiveMatches('all');
    const match = allMatches.find(m => String(m.id) === String(matchId));
    const header = page.querySelector('#match-detail-header');
    if (!match) {
      header.innerHTML = '<div class="text-error">Match not found.</div>';
      return;
    }
    header.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;">
            <div>
              <div style="font-size:1.3em;font-weight:700;">${match.teamA?.name || ''} <span style="color:var(--text-muted);font-weight:400;">vs</span> ${match.teamB?.name || ''}</div>
              <div style="margin-top:4px;font-size:1em;">${match.league || ''} &mdash; <span style="color:var(--text-secondary)">${match.status || ''}</span></div>
              <div style="margin-top:4px;font-size:1em;">${match.venue || ''} &mdash; <span style="color:var(--text-secondary)">${match.minute || ''}</span></div>
            </div>
            <div style="display:flex;gap:8px;">
              <button id="share-btn" title="Share" style="font-size:1.2em;padding:6px 10px;border-radius:6px;background:var(--accent-cyber);color:#fff;border:none;cursor:pointer;">🔗</button>
              <button id="fav-btn" title="Favorite" style="font-size:1.2em;padding:6px 10px;border-radius:6px;background:var(--accent-gold);color:#fff;border:none;cursor:pointer;">★</button>
            </div>
          </div>
        `;
    // Share button logic
    const shareBtn = header.querySelector('#share-btn');
    if (shareBtn && navigator.share) {
      shareBtn.addEventListener('click', () => {
        navigator.share({
          title: `${match.teamA?.name} vs ${match.teamB?.name} — ${match.league}`,
          text: `Live: ${match.teamA?.name} vs ${match.teamB?.name} (${match.league})`,
          url: window.location.href
        });
      });
    } else if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        shareBtn.textContent = '✅';
        setTimeout(() => shareBtn.textContent = '🔗', 1200);
      });
    }
    // Favorite button logic
    const favBtn = header.querySelector('#fav-btn');
    if (favBtn) {
      const favKey = `fav-match-${match.id}`;
      favBtn.addEventListener('click', () => {
        localStorage.setItem(favKey, '1');
        favBtn.textContent = '★';
        favBtn.style.background = 'var(--accent-fire)';
      });
      // Show as favorited if already in localStorage
      if (localStorage.getItem(favKey)) {
        favBtn.textContent = '★';
        favBtn.style.background = 'var(--accent-fire)';
      }
    }
    // Momentum
    const momentumRoot = page.querySelector('#momentum-engine-root');
    if (momentumRoot) {
      momentumRoot.appendChild(createMomentumEngine());
      showMomentumLoading();
      fetchMomentumAnalysis(match).then(data => {
        updateMomentumEngine(data);
      });
    }

    // AI Narrative
    const narrativeRoot = page.querySelector('#ai-narrative-root');
    let lastReadText = '';
    if (narrativeRoot) {
      narrativeRoot.appendChild(createAINarrative());
      initAINarrative();

      // Periodically check for new text to read (for AI Radio)
      setInterval(() => {
        const text = narrativeRoot.querySelector('#ai-narrative-text')?.textContent;
        if (text && text !== lastReadText) {
          queueCommentary(text);
          lastReadText = text;
        }
      }, 5000);
    }

    // Initialize AI Radio
    const radioRoot = page.querySelector('#ai-radio-root');
    if (radioRoot) {
      radioRoot.appendChild(createAIRadio());
      initAIRadio();
    }

    // Initialize Fan Zone
    const fanZoneRoot = page.querySelector('#fan-zone-root');
    if (fanZoneRoot) {
      fanZoneRoot.appendChild(createFanZone(match.teamA, match.teamB, match.id));
      initFanZone();
    }

    // Initialize Social Pulse
    const socialRoot = page.querySelector('#social-pulse-root');
    if (socialRoot) {
      socialRoot.appendChild(createSocialPulse());
      const context = buildMatchContext(match);
      fetchSocialSentiment(context).then(data => {
        if (data && !data.error) initSocialPulse(data);
        else if (data && data.error) {
          document.getElementById('social-feed-list').innerHTML = `<div class='text-error'>${data.error}</div>`;
        }
      });
    }

    // Initialize Oracle
    const oracleRoot = page.querySelector('#oracle-root');
    if (oracleRoot) {
      oracleRoot.appendChild(createOracle(match.id, match.teamA, match.teamB));
      initOracle(match.id);
    }

    // Initialize Tactical Room
    const context = buildMatchContext(match);

    // 1. Oracle Chat
    const oracleChatRoot = page.querySelector('#oracle-chat-root');
    if (oracleChatRoot) {
      oracleChatRoot.appendChild(createOracleChat(context, gsap));
    }

    // 2. Tactical Blueprint
    const blueprintRoot = page.querySelector('#tactical-blueprint-root');
    if (blueprintRoot) {
      blueprintRoot.innerHTML = `<div class="blueprint-card loading">Decrypting formations...</div>`;
      fetch('/api/ai/tactics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchContext: context })
      })
        .then(r => r.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          blueprintRoot.innerHTML = `
          <div class="blueprint-card">
            <h3 style="margin-bottom:10px;">Tactical Blueprint</h3>
            <p style="font-size:0.9em;color:var(--text-secondary);">${data.tacticalStyle}</p>
            <div class="formation-display">
              <div class="formation-item">
                <span class="formation-label">${match.teamA?.name}</span>
                <span class="formation-val">${data.formationA}</span>
              </div>
              <div style="font-size:1.2em;opacity:0.5;">VS</div>
              <div class="formation-item">
                <span class="formation-label">${match.teamB?.name}</span>
                <span class="formation-val">${data.formationB}</span>
              </div>
            </div>
            <div class="tactical-shifts">
              <h4 style="margin:15px 0 10px;font-size:0.9em;text-transform:uppercase;">Key Strategic Shifts</h4>
              ${data.keyShifts.map(s => `
                <div class="shift-item">
                  <div style="font-weight:700;font-size:0.85em;">${s.time}</div>
                  <div style="font-size:0.9em;">${s.description}</div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top:15px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.05);">
              <div style="font-size:0.85em;color:var(--text-muted);">HEATMAP FOCUS</div>
              <div style="font-size:0.95em;color:var(--accent-cyber);">${data.heatmapFocus}</div>
            </div>
          </div>
        `;
          gsap.from(blueprintRoot.querySelector('.blueprint-card'), { opacity: 0, x: -20, duration: 0.5 });
        })
        .catch(err => {
          blueprintRoot.innerHTML = `<div class="blueprint-card error">Tactical data currently unavailable.</div>`;
        });
    }
  })();
  return page;
}
