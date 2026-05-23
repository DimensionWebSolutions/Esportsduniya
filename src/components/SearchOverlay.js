/* ============================================
   ESPORTSDUNIYA — Global Search Overlay
   ============================================
   Cmd/Ctrl+K opens a sports search overlay.
   Searches across live matches, sports, and pages.
   ============================================ */

import { SPORTS } from '../data/mockData.js';
import { NAV_ITEMS } from '../data/mockData.js';

let searchOverlay = null;
let currentResults = [];
let selectedIndex = 0;
let onNavigateCallback = null;

// Pages & sport shortcuts for search
const SEARCH_ITEMS = [
    { type: 'page', id: 'dashboard', label: 'Live Dashboard', icon: '📊', desc: 'Real-time scores across all sports' },
    { type: 'page', id: 'timemachine', label: 'Time Machine', icon: '⏳', desc: 'Relive legendary sports moments' },
    { type: 'page', id: 'crowdpulse', label: 'Crowd Pulse', icon: '🌍', desc: 'Global fan activity heatmap' },
    ...SPORTS.filter(s => s.id !== 'all').map(s => ({
        type: 'sport', id: s.id, label: `${s.label} Live Scores`, icon: s.icon, desc: `Live ${s.label} scores & updates`
    })),
];

export function initSearch(onNavigate) {
    onNavigateCallback = onNavigate;
    
    // Keyboard shortcut: Ctrl/Cmd + K
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            toggleSearch();
        }
        if (e.key === 'Escape' && searchOverlay?.classList.contains('open')) {
            closeSearch();
        }
    });

    // Create the overlay
    searchOverlay = document.createElement('div');
    searchOverlay.className = 'search-overlay';
    searchOverlay.id = 'search-overlay';
    searchOverlay.setAttribute('role', 'dialog');
    searchOverlay.setAttribute('aria-label', 'Search sports, matches, and pages');
    searchOverlay.innerHTML = `
        <div class="search-backdrop"></div>
        <div class="search-container" role="combobox" aria-expanded="true">
            <div class="search-input-wrap">
                <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input 
                    type="text" 
                    class="search-input" 
                    id="search-input"
                    placeholder="Search matches, sports, pages..."
                    autocomplete="off"
                    aria-label="Search"
                />
                <kbd class="search-kbd">ESC</kbd>
            </div>
            <div class="search-results" id="search-results" role="listbox"></div>
            <div class="search-footer">
                <span><kbd>↑↓</kbd> Navigate</span>
                <span><kbd>↵</kbd> Select</span>
                <span><kbd>esc</kbd> Close</span>
            </div>
        </div>
    `;
    document.body.appendChild(searchOverlay);

    // Event listeners
    searchOverlay.querySelector('.search-backdrop').addEventListener('click', closeSearch);
    const input = searchOverlay.querySelector('#search-input');
    input.addEventListener('input', (e) => handleSearch(e.target.value));
    input.addEventListener('keydown', handleSearchKeydown);

    // Initial results
    renderResults(SEARCH_ITEMS.slice(0, 8));
}

function toggleSearch() {
    if (searchOverlay.classList.contains('open')) {
        closeSearch();
    } else {
        openSearch();
    }
}

function openSearch() {
    searchOverlay.classList.add('open');
    const input = searchOverlay.querySelector('#search-input');
    input.value = '';
    input.focus();
    renderResults(SEARCH_ITEMS.slice(0, 8));
    selectedIndex = 0;
    document.body.style.overflow = 'hidden';
}

function closeSearch() {
    searchOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

function handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
        renderResults(SEARCH_ITEMS.slice(0, 8));
        return;
    }

    // Search through all items
    const filtered = SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );

    // Also try to find live match data in the DOM
    const matchCards = document.querySelectorAll('.match-card');
    const matchResults = [];
    matchCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(q)) {
            const sport = card.dataset.sport || 'football';
            const teamNames = card.querySelectorAll('.team-name');
            const label = teamNames.length >= 2
                ? `${teamNames[0].textContent} vs ${teamNames[1].textContent}`
                : 'Match';
            matchResults.push({
                type: 'match',
                id: card.dataset.matchId,
                label,
                icon: SPORTS.find(s => s.id === sport)?.icon || '🏅',
                desc: `${sport.toUpperCase()} • Click to view`,
                element: card,
            });
        }
    });

    renderResults([...matchResults, ...filtered].slice(0, 10));
    selectedIndex = 0;
}

function handleSearchKeydown(e) {
    const results = searchOverlay.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
        updateSelection(results);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(results);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) selected.click();
    }
}

function updateSelection(results) {
    results.forEach((r, i) => r.classList.toggle('selected', i === selectedIndex));
    results[selectedIndex]?.scrollIntoView({ block: 'nearest' });
}

function renderResults(items) {
    const container = searchOverlay.querySelector('#search-results');
    if (items.length === 0) {
        container.innerHTML = `
            <div class="search-empty">
                <span style="font-size:2rem">🔍</span>
                <p>No results found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map((item, i) => `
        <button class="search-result-item ${i === 0 ? 'selected' : ''}" data-type="${item.type}" data-id="${item.id}" role="option">
            <span class="search-result-icon">${item.icon}</span>
            <div class="search-result-info">
                <span class="search-result-label">${item.label}</span>
                <span class="search-result-desc">${item.desc}</span>
            </div>
            <span class="search-result-type">${item.type}</span>
        </button>
    `).join('');

    // Click handlers
    container.querySelectorAll('.search-result-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            closeSearch();

            if (type === 'match') {
                // Scroll to matching card
                const card = document.querySelector(`.match-card[data-match-id="${id}"]`);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.boxShadow = 'var(--shadow-glow-neon)';
                    setTimeout(() => { card.style.boxShadow = ''; }, 2000);
                }
            } else if (onNavigateCallback) {
                onNavigateCallback(id);
            }
        });
    });
}

/**
 * Creates the search trigger button for the Dynamic Island
 */
export function createSearchTrigger() {
    const btn = document.createElement('button');
    btn.className = 'island-search-btn';
    btn.setAttribute('aria-label', 'Search (Ctrl+K)');
    btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="search-hint">Search</span>
        <kbd>⌘K</kbd>
    `;
    btn.addEventListener('click', openSearch);
    return btn;
}
