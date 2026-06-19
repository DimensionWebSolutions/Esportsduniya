/* ============================================
   ESPORTSDUNIYA — Onboarding Flow Component
   ============================================ */

const SPORTS_OPTIONS = [
  { id: 'cricket',  icon: '🏏', label: 'Cricket' },
  { id: 'football', icon: '⚽', label: 'Football' },
  { id: 'nba',      icon: '🏀', label: 'NBA' },
  { id: 'tennis',   icon: '🎾', label: 'Tennis' },
  { id: 'f1',       icon: '🏎️', label: 'F1' },
];

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🐉', '⚡', '🔥'];

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
  setTimeout(() => t.classList.remove('show'), 3500);
}

export function showOnboarding(username) {
  if (localStorage.getItem('esd_onboarded')) return;

  const API_BASE = import.meta.env.VITE_API_URL || '';

  let step = 1;
  let selectedSports = [];
  let selectedAvatar = '🦁';

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.id = 'onboarding-overlay';

  function renderStep() {
    overlay.innerHTML = `
      <div class="onboarding-modal">
        <div class="onboarding-progress">
          <div class="onboarding-step-dot ${step >= 1 ? 'active' : ''}"></div>
          <div class="onboarding-step-line"></div>
          <div class="onboarding-step-dot ${step >= 2 ? 'active' : ''}"></div>
          <div class="onboarding-step-line"></div>
          <div class="onboarding-step-dot ${step >= 3 ? 'active' : ''}"></div>
        </div>

        ${step === 1 ? `
          <div class="onboarding-step">
            <div class="onboarding-emoji">🏟️</div>
            <h2 class="onboarding-title">Pick your sports</h2>
            <p class="onboarding-sub">We'll personalise your feed based on what you love.</p>
            <div class="sports-picker">
              ${SPORTS_OPTIONS.map(s => `
                <button class="sport-pick-btn ${selectedSports.includes(s.id) ? 'selected' : ''}" data-sport="${s.id}">
                  <span class="sport-pick-icon">${s.icon}</span>
                  <span>${s.label}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : step === 2 ? `
          <div class="onboarding-step">
            <div class="onboarding-emoji">🎭</div>
            <h2 class="onboarding-title">Choose your avatar</h2>
            <p class="onboarding-sub">This is how other fans will see you.</p>
            <div class="avatar-grid">
              ${AVATARS.map(a => `
                <button class="avatar-option ${selectedAvatar === a ? 'selected' : ''}" data-avatar="${a}">${a}</button>
              `).join('')}
            </div>
          </div>
        ` : `
          <div class="onboarding-step onboarding-complete">
            <div class="onboarding-emoji">🎉</div>
            <h2 class="onboarding-title">You're all set!</h2>
            <p class="onboarding-sub">Welcome to EsportsDuniya. You've earned <strong>50 FanPoints</strong> as a welcome gift!</p>
            <div class="onboarding-summary">
              <div class="summary-row"><span>Avatar</span><span>${selectedAvatar}</span></div>
              <div class="summary-row"><span>Sports</span><span>${selectedSports.map(s => SPORTS_OPTIONS.find(o => o.id === s)?.icon).join(' ') || 'All'}</span></div>
            </div>
          </div>
        `}

        <div class="onboarding-actions">
          ${step > 1 && step < 3 ? `<button class="onboarding-back">← Back</button>` : ''}
          <button class="onboarding-skip">Skip</button>
          <button class="onboarding-next ${step === 3 ? 'primary' : ''}">
            ${step === 3 ? '🚀 Start Exploring' : 'Next →'}
          </button>
        </div>
      </div>
    `;

    // Sport picker
    overlay.querySelectorAll('.sport-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sport = btn.dataset.sport;
        if (selectedSports.includes(sport)) {
          selectedSports = selectedSports.filter(s => s !== sport);
          btn.classList.remove('selected');
        } else {
          selectedSports.push(sport);
          btn.classList.add('selected');
        }
      });
    });

    // Avatar picker
    overlay.querySelectorAll('.avatar-option').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedAvatar = btn.dataset.avatar;
        overlay.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Back
    overlay.querySelector('.onboarding-back')?.addEventListener('click', () => {
      step--;
      renderStep();
    });

    // Skip
    overlay.querySelector('.onboarding-skip').addEventListener('click', () => {
      localStorage.setItem('esd_onboarded', 'skipped');
      overlay.remove();
      showToast('You can complete your profile anytime from the Profile page.');
    });

    // Next / Finish
    overlay.querySelector('.onboarding-next').addEventListener('click', async () => {
      if (step < 3) {
        step++;
        renderStep();
      } else {
        // Save and finish
        await finishOnboarding();
      }
    });
  }

  async function finishOnboarding() {
    localStorage.setItem('esd_onboarded', 'true');

    // Save preferences
    try {
      await fetch(`${API_BASE}/api/profile/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { favoriteSports: selectedSports, avatar: selectedAvatar },
          avatar: selectedAvatar,
        }),
      });

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/fanpoints/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
        body: JSON.stringify({ username, action: 'first_prediction', reason: 'Welcome bonus' }),
      });
      const data = await res.json();
      if (data.user) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...stored, fanPoints: data.user.fanPoints, badges: data.user.badges, avatar: selectedAvatar }));
      }
    } catch (e) {
      console.warn('Onboarding save failed:', e);
    }

    overlay.remove();
    showToast('🎉 Welcome! +50 FanPoints added to your account!');
  }

  renderStep();
  document.body.appendChild(overlay);
}
