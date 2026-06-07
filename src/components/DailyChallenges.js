/* ============================================
   ESPORTSDUNIYA — Daily Challenges Component
   ============================================ */

const CHALLENGE_SETS = [
  [ // Sunday
    { id: 'oracle2', icon: '🔮', title: 'Oracle Prophet', desc: 'Make 2 Oracle predictions', target: 2, trackKey: 'esd_oracle_count' },
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
    { id: 'cheer1',  icon: '📣', title: 'Loud Fan',       desc: 'Cheer in the Fan Zone',     target: 1, trackKey: 'esd_cheered' },
  ],
  [ // Monday
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
    { id: 'cheer1',  icon: '📣', title: 'Loud Fan',       desc: 'Cheer in the Fan Zone',     target: 1, trackKey: 'esd_cheered' },
    { id: 'share1',  icon: '📤', title: 'Spread the Word', desc: 'Share a match result',     target: 1, trackKey: 'esd_shared_today' },
  ],
  [ // Tuesday
    { id: 'oracle2', icon: '🔮', title: 'Oracle Prophet', desc: 'Make 2 Oracle predictions', target: 2, trackKey: 'esd_oracle_count' },
    { id: 'share1',  icon: '📤', title: 'Spread the Word', desc: 'Share a match result',     target: 1, trackKey: 'esd_shared_today' },
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
  ],
  [ // Wednesday
    { id: 'cheer1',  icon: '📣', title: 'Loud Fan',       desc: 'Cheer in the Fan Zone',     target: 1, trackKey: 'esd_cheered' },
    { id: 'oracle2', icon: '🔮', title: 'Oracle Prophet', desc: 'Make 2 Oracle predictions', target: 2, trackKey: 'esd_oracle_count' },
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
  ],
  [ // Thursday
    { id: 'share1',  icon: '📤', title: 'Spread the Word', desc: 'Share a match result',     target: 1, trackKey: 'esd_shared_today' },
    { id: 'cheer1',  icon: '📣', title: 'Loud Fan',       desc: 'Cheer in the Fan Zone',     target: 1, trackKey: 'esd_cheered' },
    { id: 'oracle2', icon: '🔮', title: 'Oracle Prophet', desc: 'Make 2 Oracle predictions', target: 2, trackKey: 'esd_oracle_count' },
  ],
  [ // Friday
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
    { id: 'oracle2', icon: '🔮', title: 'Oracle Prophet', desc: 'Make 2 Oracle predictions', target: 2, trackKey: 'esd_oracle_count' },
    { id: 'share1',  icon: '📤', title: 'Spread the Word', desc: 'Share a match result',     target: 1, trackKey: 'esd_shared_today' },
  ],
  [ // Saturday
    { id: 'cheer1',  icon: '📣', title: 'Loud Fan',       desc: 'Cheer in the Fan Zone',     target: 1, trackKey: 'esd_cheered' },
    { id: 'share1',  icon: '📤', title: 'Spread the Word', desc: 'Share a match result',     target: 1, trackKey: 'esd_shared_today' },
    { id: 'view3',   icon: '📺', title: 'Match Watcher',  desc: 'View 3 match details',      target: 3, trackKey: 'esd_views_count' },
  ],
];

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getTodayChallenges() {
  const day = new Date().getDay();
  return CHALLENGE_SETS[day];
}

function getProgress(trackKey) {
  const today = getToday();
  const val = localStorage.getItem(`${trackKey}_${today}`);
  return val ? parseInt(val, 10) : 0;
}

function isDone(challenge) {
  return getProgress(challenge.trackKey) >= challenge.target;
}

function getCompletedToday() {
  const key = `esd_challenges_${getToday()}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function markChallengeComplete(id) {
  const key = `esd_challenges_${getToday()}`;
  const done = getCompletedToday();
  if (!done.includes(id)) {
    done.push(id);
    localStorage.setItem(key, JSON.stringify(done));
  }
}

function getStreak() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user?.streak || 0;
}

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

async function awardPoints(points, reason) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.username) return;
  const API_BASE = import.meta.env.VITE_API_URL || '';
  try {
    const res = await fetch(`${API_BASE}/api/fanpoints/award`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, points, reason }),
    });
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('user', JSON.stringify({ ...user, fanPoints: data.user.fanPoints, badges: data.user.badges }));
    }
  } catch (e) {
    console.warn('FanPoints award failed:', e);
  }
}

export function createDailyChallenges() {
  const challenges = getTodayChallenges();
  const completedIds = getCompletedToday();
  const streak = getStreak();

  const panel = document.createElement('div');
  panel.className = 'daily-challenges glass-card';
  panel.id = 'daily-challenges';

  function render() {
    const completed = getCompletedToday();
    const allDone = challenges.every(c => completed.includes(c.id) || isDone(c));

    panel.innerHTML = `
      <div class="dc-header">
        <div class="dc-title">🎯 Daily Challenges</div>
        <div class="dc-streak">🔥 ${getStreak()} day streak</div>
      </div>
      <div class="dc-list">
        ${challenges.map(c => {
          const progress = getProgress(c.trackKey);
          const done = completed.includes(c.id) || progress >= c.target;
          const pct = Math.min(100, Math.round((progress / c.target) * 100));
          return `
            <div class="challenge-card ${done ? 'challenge-done' : ''}">
              <div class="challenge-icon">${c.icon}</div>
              <div class="challenge-info">
                <div class="challenge-title">${c.title}</div>
                <div class="challenge-desc">${c.desc}</div>
                <div class="challenge-progress-wrap">
                  <div class="challenge-progress-bar">
                    <div class="challenge-progress-fill" style="width:${pct}%"></div>
                  </div>
                  <span class="challenge-progress-label">${Math.min(progress, c.target)}/${c.target}</span>
                </div>
              </div>
              <div class="challenge-reward ${done ? 'done' : ''}">
                ${done ? '✅' : '+50 pts'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      ${allDone ? '<div class="dc-complete">🎉 All done! Bonus +25 pts earned!</div>' : ''}
    `;
  }

  render();

  // Check for newly completed challenges every 5 seconds
  const interval = setInterval(async () => {
    const completed = getCompletedToday();
    let changed = false;

    for (const c of challenges) {
      if (!completed.includes(c.id) && isDone(c)) {
        markChallengeComplete(c.id);
        await awardPoints(50, `Daily challenge: ${c.title}`);
        showToast(`✅ Challenge complete: ${c.title} +50 pts!`);
        changed = true;
      }
    }

    // Bonus for all 3 done
    const allDone = challenges.every(c => getCompletedToday().includes(c.id) || isDone(c));
    const bonusKey = `esd_bonus_${getToday()}`;
    if (allDone && !localStorage.getItem(bonusKey)) {
      localStorage.setItem(bonusKey, '1');
      await awardPoints(25, 'All daily challenges bonus');
      showToast('🎉 All challenges done! Bonus +25 pts!');
      changed = true;
    }

    if (changed) render();
  }, 5000);

  // Cleanup on navigation
  window.addEventListener('hashchange', () => clearInterval(interval), { once: true });

  return panel;
}

// ── Tracker helpers (called from other components) ──
export function trackOracleAction() {
  const today = getToday();
  const key = `esd_oracle_count_${today}`;
  localStorage.setItem(key, String((parseInt(localStorage.getItem(key) || '0', 10)) + 1));
}

export function trackViewAction() {
  const today = getToday();
  const key = `esd_views_count_${today}`;
  localStorage.setItem(key, String((parseInt(localStorage.getItem(key) || '0', 10)) + 1));
}

export function trackCheerAction() {
  const today = getToday();
  localStorage.setItem(`esd_cheered_${today}`, '1');
}

export function trackShareAction() {
  const today = getToday();
  localStorage.setItem(`esd_shared_today_${today}`, '1');
}
