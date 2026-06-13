/* ============================================
   ESPORTSDUNIYA — Notification Helper
   Handles SW registration, push permission,
   in-app notifications, and reminder checks.
   ============================================ */

let swRegistration = null;

// ── Register Service Worker ──
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('✅ Service Worker registered');
    return swRegistration;
  } catch (err) {
    console.warn('SW registration failed:', err);
    return null;
  }
}

// ── Request notification permission ──
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

// ── Send a notification (SW or fallback to in-app toast) ──
export function sendNotification(title, options = {}) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    // Try via SW for richer notifications
    if (swRegistration?.showNotification) {
      swRegistration.showNotification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } else {
      new Notification(title, options);
    }
  } else {
    // Fallback: in-app toast
    showToast(`🔔 ${title}${options.body ? ' — ' + options.body : ''}`);
  }
}

// ── In-app toast ──
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
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── Reminder checker (call once on app load, repeats every minute) ──
export function startReminderChecker() {
  checkRemindersNow();
  setInterval(checkRemindersNow, 60_000);
}

function checkRemindersNow() {
  const reminders = JSON.parse(localStorage.getItem('esd_reminders') || '[]');
  if (reminders.length === 0) return;

  // Delegate to SW if available
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CHECK_REMINDERS', reminders });
    return;
  }

  // Fallback: check in main thread
  const now = Date.now();
  const FIFTEEN_MIN = 15 * 60 * 1000;
  const firedKey = 'esd_fired_reminders';
  const fired = JSON.parse(localStorage.getItem(firedKey) || '[]');

  reminders.forEach(reminder => {
    if (!reminder.kickoff) return;
    const kickoffTime = new Date(reminder.kickoff).getTime();
    const diff = kickoffTime - now;

    if (diff > 0 && diff <= FIFTEEN_MIN && !fired.includes(String(reminder.matchId))) {
      fired.push(String(reminder.matchId));
      localStorage.setItem(firedKey, JSON.stringify(fired));

      if (Notification.permission === 'granted') {
        sendNotification('⏰ Match Starting Soon!', {
          body: `${reminder.teamA} vs ${reminder.teamB} kicks off in ~15 minutes`,
          tag: `reminder-${reminder.matchId}`,
        });
      } else {
        showToast(`⏰ ${reminder.teamA} vs ${reminder.teamB} starts in ~15 min!`);
      }
    }
  });
}

// ── Add a match reminder ──
export function addReminder(match) {
  const reminders = JSON.parse(localStorage.getItem('esd_reminders') || '[]');
  const exists = reminders.find(r => String(r.matchId) === String(match.id));
  if (exists) return false; // already set

  reminders.push({
    matchId: match.id,
    teamA: match.teamA?.name || 'Team A',
    teamB: match.teamB?.name || 'Team B',
    sport: match.sport,
    kickoff: match.kickoff || match.minute || null,
    league: match.league,
  });
  localStorage.setItem('esd_reminders', JSON.stringify(reminders));
  return true;
}
