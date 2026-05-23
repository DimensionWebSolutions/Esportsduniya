/* ============================================
   ESPORTSDUNIYA — Crowd Pulse (Innovation Feature)
   ============================================ */

// Fetch real fan pulse data from backend
async function fetchCrowdPulse() {
  try {
    const res = await fetch('/api/crowdpulse');
    const json = await res.json();
    return Array.isArray(json.regions) ? json.regions : [];
  } catch {
    return [];
  }
}

export function createCrowdPulse(gsap) {
  const page = document.createElement('div');
  page.className = 'page-enter';
  page.id = 'crowdpulse-page';

  page.innerHTML = `
    <div class="section-header" style="text-align:center; margin-bottom:var(--space-10)">
      <h1><span class="accent-dot"></span>Crowd Pulse</h1>
      <p>Feel the heartbeat of the global fanbase in real-time. Every cheer, every groan — visualized.</p>
    </div>

    <div class="pulse-globe-container" id="pulse-globe">
      <canvas id="pulse-canvas"></canvas>
      <div class="pulse-regions" id="pulse-regions"></div>
    </div>

    <div class="pulse-stats" id="pulse-stats">
      <div class="glass-card pulse-stat-card">
        <div class="pulse-stat-value text-neon" id="total-fans">0</div>
        <div class="pulse-stat-label">Global Fans Live</div>
      </div>
      <div class="glass-card pulse-stat-card">
        <div class="pulse-stat-value text-cyber" id="peak-emotion">ECSTATIC 🔥</div>
        <div class="pulse-stat-label">Peak Emotion</div>
      </div>
      <div class="glass-card pulse-stat-card">
        <div class="pulse-stat-value text-fire" id="trending-match">MI vs CSK</div>
        <div class="pulse-stat-label">Most Watched</div>
      </div>
    </div>

    <div class="pulse-feed" id="pulse-feed">
      <h3 style="margin-bottom:var(--space-4); font-size:var(--text-xl)">🫀 Live Pulse Feed</h3>
    </div>
  `;

  return page;
}

export function initCrowdPulse(gsap) {
  const canvas = document.getElementById('pulse-canvas');
  if (!canvas) return;
  const container = document.getElementById('pulse-globe');
  let regions = [];
  async function redraw() {
    regions = await fetchCrowdPulse();
    setupPulseCanvas(canvas, container, regions);
    renderPulseRegions(regions);
  }
  redraw();
  window.addEventListener('resize', redraw);
  // Live polling for updates
  let pollInterval = setInterval(redraw, 30000);
  animateTotalFans();
  startPulseFeed(gsap);
  // Cleanup on navigation away
  window.addEventListener('hashchange', () => {
    if (!document.getElementById('crowdpulse-page')) {
      window.removeEventListener('resize', redraw);
      clearInterval(pollInterval);
    }
  });
}

function setupPulseCanvas(canvas, container, regions) {
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

  // Draw dark globe background with grid lines
  ctx.fillStyle = 'rgba(10,10,15,0.5)';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < w; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
  }
  for (let j = 0; j < h; j += 40) {
    ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
  }

  // Pulse circles for each region
  (regions || []).forEach(region => {
    const rx = (region.x / 100) * w;
    const ry = (region.y / 100) * h;
    const radius = (region.intensity / 100) * 50 + 10;

    // Outer glow
    const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, radius * 2);
    const hue = region.intensity > 70 ? '0' : region.intensity > 50 ? '45' : '200';
    grad.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.3)`);
    grad.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.08)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(rx, ry, radius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.9)`;
    ctx.fill();
  });
}

function renderPulseRegions(regions) {
  const regionsEl = document.getElementById('pulse-regions');
  if (!regionsEl) return;
  regionsEl.innerHTML = (regions || []).map(region => {
    const color = region.intensity > 70 ? 'var(--accent-fire)'
      : region.intensity > 50 ? 'var(--accent-gold)' : 'var(--accent-cyber)';
    return `
      <div class="pulse-region" style="left:${region.x}%;top:${region.y}%">
        <div class="pulse-region-dot" style="background:${color}; box-shadow: 0 0 12px ${color}"></div>
        <div class="pulse-region-label">
          <span>${region.emoji} ${region.name}</span>
          <span class="font-mono" style="color:${color}; font-weight:700">${region.fans}</span>
        </div>
      </div>
    `;
  }).join('');
}

function animateTotalFans() {
  const el = document.getElementById('total-fans');
  if (!el) return;

  let current = 0;
  const target = 9870000;
  const duration = 2000;
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.floor(eased * target);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const PULSE_MESSAGES = [
  { msg: '🔥 Mumbai is going WILD after that six!', city: 'Mumbai', intensity: 'high' },
  { msg: '😤 London fans are frustrated — Arsenal conceding again', city: 'London', intensity: 'medium' },
  { msg: '🎉 São Paulo erupts as Barcelona scores the 3rd!', city: 'São Paulo', intensity: 'high' },
  { msg: '😱 Melbourne in disbelief — Australia loses another wicket', city: 'Melbourne', intensity: 'high' },
  { msg: '🤩 New York buzzing — Lakers closing the gap in Q4', city: 'New York', intensity: 'medium' },
  { msg: '⚡ Dubai crowd electric for Verstappen\'s overtake!', city: 'Dubai', intensity: 'high' },
  { msg: '🥺 Tokyo fans sending support after a tough loss', city: 'Tokyo', intensity: 'low' },
  { msg: '🏆 Lagos is celebrating — what a match!', city: 'Lagos', intensity: 'high' },
];

function startPulseFeed(gsap) {
  const feed = document.getElementById('pulse-feed');
  if (!feed) return;

  let idx = 0;

  function addMessage() {
    const msg = PULSE_MESSAGES[idx % PULSE_MESSAGES.length];
    const item = document.createElement('div');
    item.className = 'glass-card pulse-feed-item';
    item.style.cssText = 'padding:var(--space-4);margin-bottom:var(--space-3);font-size:var(--text-sm);opacity:0;transform:translateX(-20px)';

    const color = msg.intensity === 'high' ? 'var(--accent-fire)'
      : msg.intensity === 'medium' ? 'var(--accent-gold)' : 'var(--accent-cyber)';

    item.innerHTML = `
      <span style="color:${color};font-weight:700;margin-right:8px">${msg.city}</span>
      <span>${msg.msg}</span>
    `;

    // Insert at top
    if (feed.children.length > 1) {
      feed.insertBefore(item, feed.children[1]);
    } else {
      feed.appendChild(item);
    }

    // Keep max 6 items
    while (feed.children.length > 7) {
      feed.removeChild(feed.lastChild);
    }

    if (gsap) {
      gsap.to(item, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
    } else {
      item.style.opacity = '1';
      item.style.transform = 'translateX(0)';
    }

    idx++;
  }

  // Add initial batch
  for (let i = 0; i < 4; i++) {
    setTimeout(() => addMessage(), i * 200);
  }

  // Keep adding
  setInterval(addMessage, 4000);
}
