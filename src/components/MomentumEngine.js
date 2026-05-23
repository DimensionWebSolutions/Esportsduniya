/* ============================================
   ESPORTSDUNIYA — Momentum Engine Component
   Dynamic, AI-powered momentum visualization
   ============================================ */
import { MOMENTUM_DATA } from '../data/mockData.js';

// Current momentum data (starts with mock, updated by AI)
let currentData = { ...MOMENTUM_DATA };
let lastProbA = 50;
import { gsap } from 'gsap';

export function createMomentumEngine() {
  const panel = document.createElement('div');
  panel.className = 'momentum-panel';
  panel.id = 'momentum-engine';

  panel.innerHTML = `
    <div class="momentum-panel-header">
      <h2>⚡ Momentum Engine</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="ai-badge" id="momentum-source-badge" style="
          font-size:0.6rem;
          padding:2px 8px;
          border-radius:var(--radius-full, 20px);
          background:rgba(107,107,128,0.15);
          color:var(--text-muted, #888);
          border:1px solid rgba(107,107,128,0.2);
        ">Mock Data</span>
        <span class="ai-badge">AI Powered</span>
      </div>
    </div>

    <div class="momentum-loading" id="momentum-loading" style="
      display:block;
      text-align:center;
      padding:24px;
      color:var(--text-muted, #888);
      font-size:0.85rem;
    ">
      <div style="font-size:1.5rem;margin-bottom:8px">🔍</div>
      Analyzing match momentum via AI + Internet Search...
    </div>

    <div id="momentum-content" style="display:none">
      <div class="momentum-graph" id="momentum-graph">
        <div class="momentum-impact-flare" id="impact-flare"></div>
        <canvas id="momentum-canvas"></canvas>
      </div>

      <div class="win-probability">
        <div class="prob-bar">
          <div class="prob-bar-label" id="momentum-team-a">${currentData.teamA}</div>
          <div class="prob-bar-track">
            <div class="prob-bar-fill team-a" style="width: 0%" id="prob-fill-a"></div>
          </div>
          <div class="prob-bar-value text-cyber" id="prob-val-a">0%</div>
        </div>
        <div class="prob-bar">
          <div class="prob-bar-label" id="momentum-team-b">${currentData.teamB}</div>
          <div class="prob-bar-track">
            <div class="prob-bar-fill team-b" style="width: 0%" id="prob-fill-b"></div>
          </div>
          <div class="prob-bar-value text-fire" id="prob-val-b">0%</div>
        </div>
      </div>

      <div class="momentum-narrative" id="momentum-narrative" style="
        padding:8px 12px;
        margin:8px 0;
        font-size:0.8rem;
        color:var(--accent-cyber, #00D4FF);
        background:rgba(0,212,255,0.05);
        border-radius:8px;
        border-left:3px solid var(--accent-cyber, #00D4FF);
        display:none;
      "></div>

      <div class="key-moments" id="key-moments">
        ${currentData.keyMoments.map(m => `
          <div class="key-moment">
            <span class="moment-time">Over ${m.over}</span>
            <span style="margin-left:8px">${m.text}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  return panel;
}

/**
 * Update the momentum engine with new data (from AI or other source)
 */
export function updateMomentumEngine(data) {
  if (!data) return;

  currentData = {
    teamA: data.teamA || currentData.teamA,
    teamB: data.teamB || currentData.teamB,
    probA: data.probA ?? currentData.probA,
    probB: data.probB ?? currentData.probB,
    points: data.points && data.points.length > 0 ? data.points : currentData.points,
    keyMoments: data.keyMoments && data.keyMoments.length > 0 ? data.keyMoments : currentData.keyMoments,
  };

  // Update team names
  const teamAEl = document.getElementById('momentum-team-a');
  const teamBEl = document.getElementById('momentum-team-b');
  if (teamAEl) teamAEl.textContent = currentData.teamA;
  if (teamBEl) teamBEl.textContent = currentData.teamB;

  // Update key moments
  const momentsEl = document.getElementById('key-moments');
  if (momentsEl && currentData.keyMoments.length > 0) {
    momentsEl.innerHTML = currentData.keyMoments.map(m => `
      <div class="key-moment">
        <span class="moment-time">${m.over ? 'Over ' + m.over : ''}</span>
        <span style="margin-left:8px">${m.text}</span>
      </div>
    `).join('');
  }

  // Update narrative
  const narrativeEl = document.getElementById('momentum-narrative');
  if (narrativeEl && data.narrative) {
    narrativeEl.textContent = '💡 ' + data.narrative;
    narrativeEl.style.display = 'block';
  }

  // Update source badge
  const sourceBadge = document.getElementById('momentum-source-badge');
  if (sourceBadge) {
    const isLive = data.source === 'internet';
    sourceBadge.textContent = isLive ? 'Live AI + Search 🔍' : 'Mock Data';
    sourceBadge.style.background = isLive ? 'rgba(57,255,20,0.1)' : 'rgba(107,107,128,0.15)';
    sourceBadge.style.color = isLive ? 'var(--accent-neon, #39FF14)' : 'var(--text-muted, #888)';
    sourceBadge.style.borderColor = isLive ? 'rgba(57,255,20,0.3)' : 'rgba(107,107,128,0.2)';
  }

  // Hide loading
  const loadingEl = document.getElementById('momentum-loading');
  const contentEl = document.getElementById('momentum-content');
  if (loadingEl) loadingEl.style.display = 'none';
  if (contentEl) contentEl.style.display = 'block';

  // Redraw the graph and animate bars
  drawMomentumGraph();
  animateProbBars();

  // Impact Flare check
  const diff = Math.abs((data.probA || 50) - lastProbA);
  if (diff > 15) {
    triggerImpactFlare(data.probA > lastProbA ? 'cyber' : 'fire');
  }
  lastProbA = data.probA || 50;
}

function triggerImpactFlare(type) {
  const flare = document.getElementById('impact-flare');
  if (!flare) return;

  flare.classList.toggle('fire', type === 'fire');

  gsap.fromTo(flare,
    { opacity: 0, scale: 0.8 },
    {
      opacity: 1,
      scale: 1.2,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(flare, { opacity: 0, scale: 1.5, duration: 0.8, ease: 'power2.in' });
      }
    }
  );
}

/**
 * Show loading state on the momentum engine
 */
export function showMomentumLoading() {
  const loadingEl = document.getElementById('momentum-loading');
  const contentEl = document.getElementById('momentum-content');
  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';
}

/**
 * Draw the momentum graph on canvas using currentData
 */
export function drawMomentumGraph() {
  const canvas = document.getElementById('momentum-canvas');
  if (!canvas) return;

  const container = document.getElementById('momentum-graph');
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pts = currentData.points;
  if (!pts || pts.length === 0) return;

  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  // Draw 50% baseline
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  const baseY = padding.top + chartH / 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, baseY);
  ctx.lineTo(w - padding.right, baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Team labels
  ctx.fillStyle = 'rgba(0,212,255,0.4)';
  ctx.font = '10px Inter';
  ctx.fillText(currentData.teamA, padding.left, padding.top - 6);
  ctx.fillStyle = 'rgba(255,61,0,0.4)';
  ctx.fillText(currentData.teamB, padding.left, h - 6);

  // Plot gradient line
  const getX = (i) => padding.left + (i / (pts.length - 1)) * chartW;
  const getY = (val) => padding.top + chartH - (val / 100) * chartH;

  // Gradient fill under line
  const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
  gradient.addColorStop(0, 'rgba(0,212,255,0.15)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(255,61,0,0.15)');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(pts[0].value));
  for (let i = 1; i < pts.length; i++) {
    const cpx = (getX(i - 1) + getX(i)) / 2;
    ctx.bezierCurveTo(cpx, getY(pts[i - 1].value), cpx, getY(pts[i].value), getX(i), getY(pts[i].value));
  }
  ctx.lineTo(getX(pts.length - 1), h - padding.bottom);
  ctx.lineTo(getX(0), h - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line stroke
  const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
  lineGrad.addColorStop(0, '#00D4FF');
  lineGrad.addColorStop(0.6, '#39FF14');
  lineGrad.addColorStop(1, '#39FF14');

  ctx.beginPath();
  ctx.moveTo(getX(0), getY(pts[0].value));
  for (let i = 1; i < pts.length; i++) {
    const cpx = (getX(i - 1) + getX(i)) / 2;
    ctx.bezierCurveTo(cpx, getY(pts[i - 1].value), cpx, getY(pts[i].value), getX(i), getY(pts[i].value));
  }
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Glow effect
  ctx.shadowColor = 'rgba(57,255,20,0.4)';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Key moment dots
  currentData.keyMoments.forEach(m => {
    const pt = pts.find(p => p.over === m.over);
    if (!pt) return;
    const x = getX(pts.indexOf(pt));
    const y = getY(pt.value);

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = m.type === 'positive' ? '#39FF14'
      : m.type === 'negative' ? '#FF3D00' : '#6B6B80';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Current point (last)
  const lastPt = pts[pts.length - 1];
  const lx = getX(pts.length - 1);
  const ly = getY(lastPt.value);
  ctx.beginPath();
  ctx.arc(lx, ly, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#39FF14';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lx, ly, 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(57,255,20,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Over labels
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  const labelStep = Math.max(1, Math.floor(pts.length / 8));
  for (let i = 0; i < pts.length; i += labelStep) {
    ctx.fillText(`${pts[i].over}`, getX(i), h - 8);
  }
}

/**
 * Animate the probability bars using currentData
 */
export function animateProbBars() {
  setTimeout(() => {
    const fillA = document.getElementById('prob-fill-a');
    const fillB = document.getElementById('prob-fill-b');
    const valA = document.getElementById('prob-val-a');
    const valB = document.getElementById('prob-val-b');

    if (fillA) fillA.style.width = currentData.probA + '%';
    if (fillB) fillB.style.width = currentData.probB + '%';
    if (valA) valA.textContent = currentData.probA + '%';
    if (valB) valB.textContent = currentData.probB + '%';
  }, 400);
}
