/* ============================================
   ESPORTSDUNIYA — Share & Favorites System
   ============================================
   Share match cards via Web Share API or clipboard.
   Save favorite matches to localStorage.
   ============================================ */

const FAVORITES_KEY = 'esportsduniya_favorites';

// ── Favorites ──

export function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
    } catch {
        return [];
    }
}

export function isFavorite(matchId) {
    return getFavorites().some(f => f.id === matchId);
}

export function toggleFavorite(match) {
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.id === match.id);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push({
            id: match.id,
            sport: match.sport,
            teamA: match.teamA.name,
            teamB: match.teamB.name,
            savedAt: Date.now(),
        });
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    return idx < 0; // returns true if newly favorited
}

// ── Share ──

export async function shareMatch(match) {
    const title = `${match.teamA.name} vs ${match.teamB.name}`;
    const text = `${match.sport.toUpperCase()} — ${match.league}\n${match.teamA.name} ${match.teamA.score} vs ${match.teamB.name} ${match.teamB.score}\n${match.status === 'live' ? '🔴 LIVE NOW' : match.status.toUpperCase()}\nVenue: ${match.venue}\n\nFollow live on Esportsduniya ⚡`;
    const url = `https://esportsduniya.com/#${match.sport}`;

    // Try native Web Share API first
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return 'shared';
        } catch (err) {
            if (err.name === 'AbortError') return 'cancelled';
        }
    }

    // Fallback: copy to clipboard
    try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        return 'copied';
    } catch {
        // Final fallback
        const ta = document.createElement('textarea');
        ta.value = `${text}\n${url}`;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return 'copied';
    }
}

// ── Toast Notification ──

export function showToast(message, type = 'info') {
    const existing = document.querySelector('.ed-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `ed-toast ed-toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
        <span class="ed-toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="ed-toast-text">${message}</span>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));

    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Create action buttons for a match card (favorite + share)
 */
export function createMatchActions(match) {
    const wrap = document.createElement('div');
    wrap.className = 'match-actions';

    const faved = isFavorite(match.id);

    // Favorite button
    const favBtn = document.createElement('button');
    favBtn.className = `match-action-btn fav-btn ${faved ? 'active' : ''}`;
    favBtn.setAttribute('aria-label', faved ? 'Remove from favorites' : 'Add to favorites');
    favBtn.innerHTML = faved ? '❤️' : '🤍';
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowFaved = toggleFavorite(match);
        favBtn.innerHTML = nowFaved ? '❤️' : '🤍';
        favBtn.classList.toggle('active', nowFaved);
        favBtn.setAttribute('aria-label', nowFaved ? 'Remove from favorites' : 'Add to favorites');
        showToast(nowFaved ? `${match.teamA.name} vs ${match.teamB.name} saved!` : 'Removed from favorites', 'success');
    });

    // Share button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'match-action-btn share-btn';
    shareBtn.setAttribute('aria-label', 'Share this match');
    shareBtn.innerHTML = '📤';
    shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const result = await shareMatch(match);
        if (result === 'copied') showToast('Score copied to clipboard!', 'success');
        else if (result === 'shared') showToast('Shared!', 'success');
    });

    wrap.appendChild(favBtn);
    wrap.appendChild(shareBtn);
    return wrap;
}
