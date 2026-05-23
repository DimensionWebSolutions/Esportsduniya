/* ============================================
   ESPORTSDUNIYA — Social Pulse Component
   AI-Powered Sentiment & Reactions Feed
   ============================================ */

export function createSocialPulse() {
  const container = document.createElement('div');
  container.className = 'social-pulse glass-card';
  container.id = 'social-pulse';
  container.innerHTML = `
    <div class="social-header">
      <div class="social-title">𝕏 Social Pulse</div>
      <div class="ai-badge">Real-time AI Analysis</div>
    </div>
    
    <div class="sentiment-meter-wrap">
      <div class="sentiment-labels">
        <span class="sentiment-val" id="sentiment-val">0</span>
        <span class="sentiment-label" id="sentiment-label">ANALYZING...</span>
      </div>
      <div class="sentiment-bar">
        <div class="sentiment-fill" id="sentiment-fill" style="width: 50%"></div>
        <div class="sentiment-center"></div>
      </div>
      <p class="sentiment-summary" id="sentiment-summary">Scanning social signals for real-time fan reactions...</p>
    </div>

    <div class="social-feed" id="social-feed-list">
      <!-- Reactions will be injected here -->
      <div class="social-loading">
        <div class="pulse-dot"></div>
        <span>Listening to global chatter...</span>
      </div>
    </div>

    <div class="social-hashtags" id="social-hashtags">
      <!-- Hashtags injected here -->
    </div>
  `;
  return container;
}

export async function initSocialPulse(data) {
  const feed = document.getElementById('social-feed-list');
  const fill = document.getElementById('sentiment-fill');
  const val = document.getElementById('sentiment-val');
  const label = document.getElementById('sentiment-label');
  const summary = document.getElementById('sentiment-summary');
  const hashtagsEl = document.getElementById('social-hashtags');

  if (!feed || !data) return;

  // Clear loading
  feed.innerHTML = '';

  // Update Sentiment Meter
  // map -100 to 100 -> 0% to 100%
  const sentiment = typeof data.sentiment === 'number' ? data.sentiment : 0;
  const percentage = ((sentiment + 100) / 200) * 100;

  if (fill) fill.style.width = `${percentage}%`;
  if (val) val.textContent = (sentiment > 0 ? '+' : '') + sentiment;
  if (label) label.textContent = data.label || 'NEUTRAL';
  if (summary) summary.textContent = data.summary || 'Global fan sentiment is being processed.';

  // Set color based on sentiment
  const color = sentiment > 30 ? 'var(--accent-neon)' : (sentiment < -30 ? 'var(--accent-fire)' : 'var(--accent-gold)');
  if (fill) fill.style.background = color;
  if (val) val.style.color = color;
  if (label) label.style.color = color;

  // Render Reactions
  if (data.reactions && data.reactions.length > 0) {
    data.reactions.forEach((rx, i) => {
      const item = document.createElement('div');
      item.className = 'social-item';
      item.style.animationDelay = `${i * 0.1}s`;

      const typeIcon = rx.type === 'positive' ? '🚀' : (rx.type === 'negative' ? '⚠️' : '💬');

      item.innerHTML = `
        <div class="social-user">${rx.user} <span class="social-icon">${typeIcon}</span></div>
        <div class="social-text">${rx.text}</div>
      `;
      feed.appendChild(item);
    });
  }

  // Render Hashtags
  if (data.hashtags) {
    hashtagsEl.innerHTML = data.hashtags.map(h => `<span class="hashtag">${h}</span>`).join('');
  }
}
