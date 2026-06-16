import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { gsap } from 'gsap';
import { createDynamicIsland, startTickerUpdates } from './DynamicIsland.js';
import { createNavRail, updateNavRailActive } from './NavRail.js';
import { initSearch } from './SearchOverlay.js';
import { checkApiHealth } from '../services/apiService.js';
import { registerServiceWorker, startReminderChecker } from './NotificationHelper.js';
import { initLiveScoreManager } from '../services/LiveScoreManager.js';
import MomentEngine from './MomentEngine.jsx';
import { pathToPageId, pageIdToPath, hashToPath } from '../utils/routes.js';

function renderTopBar(onLogin) {
  const existing = document.getElementById('esd-top-bar');
  if (existing) existing.remove();

  const topBar = document.createElement('div');
  topBar.id = 'esd-top-bar';
  topBar.style.cssText = 'position:fixed;top:14px;right:16px;z-index:1000;display:flex;align-items:center;gap:10px;';

  const notifBell = document.createElement('button');
  notifBell.id = 'notif-bell';
  notifBell.title = 'Notifications';
  notifBell.innerHTML = '🔔';
  notifBell.style.cssText = 'font-size:1.4em;background:none;border:none;cursor:pointer;';
  topBar.appendChild(notifBell);

  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  if (storedUser?.username) {
    const userBtn = document.createElement('button');
    userBtn.innerHTML = storedUser.avatar || '🦁';
    userBtn.style.cssText = 'font-size:1.4em;background:none;border:none;cursor:pointer;';
    userBtn.onclick = () => window.esportsNavigate?.('profile');
    const logoutBtn = document.createElement('button');
    logoutBtn.innerHTML = '⏻';
    logoutBtn.style.cssText = 'font-size:1.1em;background:rgba(255,80,80,0.15);border:1px solid rgba(255,80,80,0.3);border-radius:8px;padding:4px 8px;color:#ff5050;cursor:pointer;';
    logoutBtn.onclick = () => window.esportsLogout?.();
    topBar.appendChild(userBtn);
    topBar.appendChild(logoutBtn);
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Sign In';
    loginBtn.style.cssText = 'padding:6px 16px;border-radius:20px;font-size:0.9rem;font-weight:600;cursor:pointer;background:var(--accent-cyber);color:#000;border:none;';
    loginBtn.onclick = onLogin;
    topBar.appendChild(loginBtn);
  }
  document.body.appendChild(topBar);
}

function createMobileNav(navigate) {
  if (document.getElementById('mobile-nav')) return;
  const mobileNav = document.createElement('nav');
  mobileNav.id = 'mobile-nav';
  mobileNav.className = 'mobile-nav';
  mobileNav.innerHTML = `
    <button class="mobile-nav-item" data-page="dashboard"><span class="mobile-nav-icon">🏠</span><span>Home</span></button>
    <button class="mobile-nav-item" data-page="arena"><span class="mobile-nav-icon">🔮</span><span>Arena</span></button>
    <button class="mobile-nav-item" data-page="leaderboard"><span class="mobile-nav-icon">🏆</span><span>Ranks</span></button>
    <button class="mobile-nav-item" data-page="profile"><span class="mobile-nav-icon">👤</span><span>Profile</span></button>
  `;
  mobileNav.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(pageIdToPath(btn.dataset.page)));
  });
  document.body.appendChild(mobileNav);
}

export default function AppShell({ onLogin, shellReady }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      navigate(hashToPath(hash), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    window.esportsNavigate = (pageId) => navigate(pageIdToPath(pageId));
    window.esportsNavigatePath = (path) => navigate(path);
  }, [navigate]);

  useEffect(() => {
    const pageId = pathToPageId(location.pathname);
    updateNavRailActive(pageId);
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId || (pageId.startsWith('match/') && btn.dataset.page === 'dashboard'));
    });
  }, [location.pathname]);

  useEffect(() => {
    const refreshTopBar = () => renderTopBar(onLogin);
    document.addEventListener('esd:login-success', refreshTopBar);
    return () => document.removeEventListener('esd:login-success', refreshTopBar);
  }, [onLogin]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

      if (!document.getElementById('nav-rail')) {
        const nav = createNavRail('dashboard', (id) => navigate(pageIdToPath(id)));
        document.body.appendChild(nav);
      }
      if (!document.getElementById('dynamic-island')) {
        document.body.appendChild(createDynamicIsland());
        startTickerUpdates();
      }
      initSearch();
      createMobileNav(navigate);
      renderTopBar(onLogin);

      await checkApiHealth();
      registerServiceWorker().then(() => startReminderChecker());
      initLiveScoreManager();

      const loader = document.getElementById('app-loader');
      if (loader) {
        gsap.to(loader, { opacity: 0, duration: 0.4, onComplete: () => loader.remove() });
      }
      if (mounted) shellReady?.();
    })();
    return () => { mounted = false; };
  }, [onLogin, shellReady, navigate]);

  return (
    <>
      <main id="main-content" className="main-content" style={{ minHeight: '100vh' }}>
        <Outlet />
      </main>
      <MomentEngine />
    </>
  );
}
