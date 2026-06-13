import './styles/theme.css';
import './styles/admin.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/analytics.css';
/* ============================================
   ESPORTSDUNIYA — Main Entry Point
   ============================================ */

// Styles
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/eras.css';
import './styles/crowdpulse.css';
import './styles/features.css';
import './styles/login.css';
import './styles/profile.css';
import './styles/engagement.css';
import './styles/fifa.css';

// Components
import { createDynamicIsland, startTickerUpdates, updateTickerData } from './components/DynamicIsland.js';
import { createNavRail, updateNavRailActive } from './components/NavRail.js';
import { initSearch } from './components/SearchOverlay.js';
import { createFooter } from './components/Footer.js';
import AuthGate from './components/AuthGate.jsx';

// Pages
import { createDashboard, initDashboard } from './pages/Dashboard.js';
import { createTimeMachine } from './pages/TimeMachine.js';
import { createCrowdPulse, initCrowdPulse } from './pages/CrowdPulse.js';
import { createMatchDetail } from './pages/MatchDetail.js';
import { createStandingsPage } from './pages/Standings.js';
import { createLeaderboard } from './pages/Leaderboard.js';
import { createFifaPage } from './pages/FIFA.js';
import ProfilePage from './pages/Profile.jsx';

// API Service
import { checkApiHealth, fetchLiveMatches } from './services/apiService.js';
import { registerServiceWorker, startReminderChecker } from './components/NotificationHelper.js';
import { initLiveScoreManager } from './services/LiveScoreManager.js';

// GSAP
import { gsap } from 'gsap';

/* ── State ── */
let currentPage = 'dashboard';

/* ── App Initialization ── */
async function renderApp() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="app-body">
            <main id="main-content" class="main-content" tabindex="-1"></main>
        </div>
    `;

    // PWA install prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallSnackbar();
    });
    function showInstallSnackbar() {
        if (document.getElementById('pwa-install-snackbar')) return;
        const bar = document.createElement('div');
        bar.id = 'pwa-install-snackbar';
        bar.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(20,20,30,0.98);color:#fff;padding:14px 28px;border-radius:24px;box-shadow:0 4px 24px #0005;z-index:2000;font-size:1.1em;display:flex;align-items:center;gap:18px;';
        bar.innerHTML = `Install Esportsduniya for a better experience <button style='margin-left:18px;padding:6px 18px;border-radius:16px;background:var(--accent-cyber);color:#fff;border:none;cursor:pointer;font-size:1em;'>Install</button>`;
        bar.querySelector('button').onclick = async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') bar.remove();
            }
        };
        document.body.appendChild(bar);
    }

    // Theme switcher
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    function getTheme() {
        return localStorage.getItem('theme') || 'dark';
    }
    setTheme(getTheme());
    if (!document.getElementById('theme-switcher')) {
        const btn = document.createElement('button');
        btn.id = 'theme-switcher';
        btn.className = 'theme-switcher';
        btn.title = 'Toggle dark/light mode';
        btn.innerHTML = getTheme() === 'dark' ? '🌙' : '☀️';
        document.body.appendChild(btn);
    }

    // Notification bell
    const existingBell = document.getElementById('notif-bell');
    if (existingBell) existingBell.remove();
    const notifBell = document.createElement('button');
    notifBell.id = 'notif-bell';
    notifBell.title = 'Notifications';
    notifBell.innerHTML = '🔔';
    notifBell.style.cssText = 'position:fixed;top:18px;right:22px;z-index:1000;font-size:1.6em;background:none;border:none;cursor:pointer;';
    notifBell.addEventListener('click', async () => {
        const { requestNotificationPermission } = await import('./components/NotificationHelper.js');
        const perm = await requestNotificationPermission();
        if (perm === 'granted') {
            notifBell.textContent = '🔔';
        } else if (perm === 'denied') {
            notifBell.textContent = '🚫';
        } else {
            notifBell.textContent = '🔕';
        }
    });
    document.body.appendChild(notifBell);

    // 1. Dynamic score island
    const island = createDynamicIsland();
    document.body.appendChild(island);

    // 2. Search overlay
    initSearch();

    // 3. Navigation Rail
    const nav = createNavRail(currentPage, navigateTo);
    document.body.appendChild(nav);

    // 4. Mobile navigation
    createMobileNav();

    // 7. Create back-to-top button
    createBackToTop();

    // 8. Start ticker updates
    startTickerUpdates();

    // 9. Discover backend state before the first dashboard fetch.
    await checkApiHealth();

    // 9.1 Register Service Worker and start reminder checker
    registerServiceWorker().then(() => startReminderChecker());

        // 9.5. Refresh ticker with real AI data
    refreshTicker();

    // 9.6. Initialize live score WebSocket updates
    initLiveScoreManager();

    // 10. Render initial page
    const initialPage = location.hash.slice(1) || 'dashboard';
    navigateTo(initialPage);

    // 11. Handle hash routing
    window.addEventListener('hashchange', () => {
        const page = location.hash.slice(1) || 'dashboard';
        if (page !== currentPage) {
            navigateTo(page);
        }
    });

    // 12. Dismiss loading screen
    dismissLoader();

    // 13. Start reminder checker (every minute)
    startReminderChecker();

    // Entry animation
    gsap.fromTo(app,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out' }
    );
}

// Mount AuthGate and renderApp
function initApp() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    // Render AuthGate, which will render the app only if logged in
    // This is a minimal vanilla JS mount for AuthGate (React-style):
    import('./components/AuthGate.jsx').then(({ default: AuthGate }) => {
        // For a real React app, we'd use ReactDOM.render, but here, just call renderApp if "logged in"
        // For now, just call renderApp directly (since the rest of the app is not React-based)
        renderApp();
    });
}

/* ── Loading Screen ── */
function dismissLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }, 600);
    }
}

/* ── Mobile Bottom Navigation ── */
function createMobileNav() {
    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-nav';
    mobileNav.setAttribute('aria-label', 'Mobile navigation');
    mobileNav.innerHTML = `
        <div class="mobile-nav-items">
            <button class="mobile-nav-item active" data-page="dashboard">
                <span class="mobile-nav-icon">📊</span>
                <span>Live</span>
            </button>
            <button class="mobile-nav-item" data-page="fifa">
                <span class="mobile-nav-icon">🌍</span>
                <span>FIFA</span>
            </button>
            <button class="mobile-nav-item" data-page="leaderboard">
                <span class="mobile-nav-icon">🏆</span>
                <span>Ranks</span>
            </button>
            <button class="mobile-nav-item" data-page="timemachine">
                <span class="mobile-nav-icon">⏳</span>
                <span>History</span>
            </button>
            <button class="mobile-nav-item" data-page="crowdpulse">
                <span class="mobile-nav-icon">🫀</span>
                <span>Pulse</span>
            </button>
            <button class="mobile-nav-item" data-page="profile">
                <span class="mobile-nav-icon">👤</span>
                <span>Profile</span>
            </button>
        </div>
    `;

    mobileNav.querySelectorAll('.mobile-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            mobileNav.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            navigateTo(btn.dataset.page);
        });
    });

    document.body.appendChild(mobileNav);
}

/* ── Back to Top ── */
function createBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '↑';
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
}

/* ── Ticker Refresh with Live Data ── */
async function refreshTicker() {
    try {
        const matches = await fetchLiveMatches('all');
        if (matches && matches.length > 0) {
            updateTickerData(matches);
        }
    } catch (e) {
        console.warn('Ticker refresh failed:', e);
    }
    // Refresh ticker every 60 seconds
    setTimeout(refreshTicker, 60_000);
}

/* ── Routing ── */
function navigateTo(pageId) {
    const main = document.getElementById('main-content');
    if (!main) return;

    // Treat sport filters as dashboard views
    const sportPages = ['cricket', 'football', 'nba', 'tennis', 'f1', 'standings'];
    const isSportFilter = sportPages.includes(pageId);
    let actualPage = isSportFilter ? 'dashboard' : pageId;
    let matchId = null;
    // Match detail route: #/match/12345
    if (pageId.startsWith('match/')) {
        actualPage = 'match';
        matchId = pageId.split('/')[1];
    }

    currentPage = pageId;
    location.hash = pageId;
    updateNavRailActive(pageId);

    // Update mobile nav
    document.querySelectorAll('.mobile-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Update document title for SEO
    const titles = {
        dashboard: 'Live Sports Scores — Esportsduniya',
        cricket: 'Cricket Live Score — IPL, ICC, T20 | Esportsduniya',
        football: 'Football Live Score — Premier League, La Liga | Esportsduniya',
        fifa: 'FIFA World Cup 2026 — Live Scores, Standings, Predictions | Esportsduniya',
        nba: 'NBA Live Score — Basketball Scores | Esportsduniya',
        tennis: 'Tennis Live Score — ATP, WTA, Grand Slams | Esportsduniya',
        f1: 'F1 Live Results — Formula 1 | Esportsduniya',
        timemachine: 'Sports Time Machine — Relive Legendary Moments | Esportsduniya',
        crowdpulse: 'Crowd Pulse — Global Fan Activity | Esportsduniya',
    };
    document.title = titles[pageId] || 'Esportsduniya — Live Sports Scores & AI Insights';

    // Fade out current content
    gsap.to(main, {
        opacity: 0,
        y: 10,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
            if (window.__pageIntervals && window.__pageIntervals.length) {
                window.__pageIntervals.forEach(interval => clearInterval(interval));
                window.__pageIntervals = [];
            }
            main.innerHTML = '';
            let page;


            switch (actualPage) {
                case 'standings':
                    page = createStandingsPage(gsap);
                    main.appendChild(page);
                    break;
                case 'leaderboard':
                    page = createLeaderboard(gsap);
                    main.appendChild(page);
                    break;
                case 'match':
                    page = createMatchDetail(matchId, gsap);
                    main.appendChild(page);
                    break;
                case 'timemachine':
                    page = createTimeMachine(gsap);
                    main.appendChild(page);
                    break;
                case 'crowdpulse':
                    page = createCrowdPulse(gsap);
                    main.appendChild(page);
                    requestAnimationFrame(() => {
                        initCrowdPulse(gsap);
                    });
                    break;
                case 'profile':
                    // Profile/settings page
                    main.appendChild(ProfilePage());
                    break;
                case 'fifa':
                    page = createFifaPage(gsap);
                    main.appendChild(page);
                    break;
                case 'dashboard':
                default:
                    page = createDashboard(gsap);
                    main.appendChild(page);
                    if (isSportFilter) {
                        requestAnimationFrame(() => {
                            const tab = document.querySelector(`.sport-tab[data-sport="${pageId}"]`);
                            if (tab) tab.click();
                        });
                    }
                    requestAnimationFrame(() => initDashboard());
                    break;
            }

            // Add footer after page content
            main.appendChild(createFooter());

            // Fade in new content
            gsap.fromTo(main,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' }
            );
        },
    });
}

/* ── Boot ── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
