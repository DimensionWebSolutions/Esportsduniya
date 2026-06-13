/* ============================================
   ESPORTSDUNIYA — Notification Helper
   Handles SW registration, push permission,
   in-app notifications, and reminder checks.
   ============================================ */

const API_BASE = import.meta.env.VITE_API_URL || '';
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

// ── Subscribe to Web Push ──
export async function subscribeToPush() {
  if (!swRegistration) return null;
  try {
    const res = await fetch(`${API_BASE}/api/push/vapid-public-key`);
    if (!res.ok) return null;
    const { publicKey } = await res.json();

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    if (user?.username && token) {
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username: user.username, subscription }),
      });
    }
    console.log('✅ Push subscription saved');
    return subscription;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Request notification permission ──
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') {
    await subscribeToPush();
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await subscribeToPush();
  return perm;
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
