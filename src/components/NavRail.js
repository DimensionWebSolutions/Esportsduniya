/* ============================================
   ESPORTSDUNIYA — Navigation Rail
   ============================================ */
import { NAV_ITEMS } from '../data/mockData.js';

export function createNavRail(activePage, onNavigate) {
    const nav = document.createElement('nav');
    nav.className = 'nav-rail';
    nav.id = 'nav-rail';
    nav.setAttribute('aria-label', 'Main navigation');

    nav.innerHTML = NAV_ITEMS.map(item => {
        if (item.type === 'divider') {
            return '<div class="nav-divider"></div>';
        }
        const isActive = item.id === activePage;
        return `
      <button
        class="nav-item ${isActive ? 'active' : ''}"
        data-page="${item.id}"
        aria-label="${item.label}"
        aria-current="${isActive ? 'page' : 'false'}"
      >
        <span>${item.icon}</span>
        <span class="nav-tooltip">${item.label}</span>
      </button>
    `;
    }).join('');

    // Attach click handlers
    nav.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page && onNavigate) {
                onNavigate(page);
            }
        });
    });

    return nav;
}

export function updateNavRailActive(pageId) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        const isActive = btn.dataset.page === pageId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
}
