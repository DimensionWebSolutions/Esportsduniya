/* ============================================
   ESPORTSDUNIYA — Service Worker
   Handles: offline caching + push notifications
   ============================================ */

const CACHE_NAME = 'esd-pwa-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// ── Install: cache static shell ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// ── Activate: clean old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API, cache-first for assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls — always network, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets — cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for static assets
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── Push Notifications ──
self.addEventListener('push', event => {
  let data = { title: 'EsportsDuniya', body: 'New sports update!', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'esd-notif',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// ── Notification click — deep-link into app ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ── Background sync for reminders ──
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_REMINDERS') {
    checkReminders(event.data.reminders || []);
  }
});

function checkReminders(reminders) {
  const now = Date.now();
  const FIFTEEN_MIN = 15 * 60 * 1000;

  reminders.forEach(reminder => {
    if (!reminder.kickoff) return;
    const kickoffTime = new Date(reminder.kickoff).getTime();
    const diff = kickoffTime - now;

    // Fire if within 15 minutes of kickoff and not already fired
    if (diff > 0 && diff <= FIFTEEN_MIN) {
      self.registration.showNotification(`⏰ Match Starting Soon!`, {
        body: `${reminder.teamA} vs ${reminder.teamB} kicks off in ~15 minutes`,
        icon: '/favicon.svg',
        tag: `reminder-${reminder.matchId}`,
        data: { url: `/#match/${reminder.matchId}` },
        requireInteraction: true,
      });
    }
  });
}
