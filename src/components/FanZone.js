/* ============================================
   ESPORTSDUNIYA — Fan Zone Component
   Interactive Cheers & Confetti
   ============================================ */
import confetti from 'canvas-confetti';

export function createFanZone(teamA, teamB, matchId = 'global') {
    const container = document.createElement('div');
    container.className = 'fan-zone glass-card';
    container.dataset.matchId = matchId;
    container.innerHTML = `
    <div class="fan-zone-header">
      <div class="title">🎆 Fan Zone</div>
      <div class="desc">Who are you supporting? Tap to cheer!</div>
    </div>
    <div class="fan-zone-buttons">
      <button class="cheer-btn team-a" id="cheer-a" data-choice="teamA" data-team="${teamA.name}">
        <span class="team-initial">${teamA.name[0]}</span>
        <span class="cheer-label">Cheer for ${teamA.name}</span>
        <span class="count" id="count-a">0</span>
      </button>
      <div class="vs-divider">VS</div>
      <button class="cheer-btn team-b" id="cheer-b" data-choice="teamB" data-team="${teamB.name}">
        <span class="team-initial">${teamB.name[0]}</span>
        <span class="cheer-label">Cheer for ${teamB.name}</span>
        <span class="count" id="count-b">0</span>
      </button>
    </div>
  `;
    return container;
}

export function initFanZone() {
    const container = document.querySelector('.fan-zone');
    const cheerA = document.getElementById('cheer-a');
    const cheerB = document.getElementById('cheer-b');
    const countA = document.getElementById('count-a');
    const countB = document.getElementById('count-b');

    if (!container || !cheerA || !cheerB) return;

    const matchId = container.dataset.matchId || 'global';
    let cheers = { teamA: 0, teamB: 0 };

    loadState();
    connectLiveUpdates();

    cheerA.addEventListener('click', (e) => handleCheer('teamA', e));
    cheerB.addEventListener('click', (e) => handleCheer('teamB', e));

    async function loadState() {
        try {
            const state = await fetch(`/api/fanzone/${encodeURIComponent(matchId)}`, { cache: 'no-store' }).then(r => r.json());
            updateCounts(state.cheers);
        } catch (err) {
            console.warn('Fan Zone state unavailable:', err);
        }
    }

    function connectLiveUpdates() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.hostname}:3002`);
        socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'fan_zone_update' && String(message.matchId) === String(matchId)) {
                    updateCounts(message.state.cheers);
                }
            } catch {
                // Ignore non-JSON websocket messages.
            }
        });
    }

    function updateCounts(nextCheers = {}) {
        cheers = {
            teamA: Number(nextCheers.teamA || 0),
            teamB: Number(nextCheers.teamB || 0),
        };
        countA.textContent = cheers.teamA;
        countB.textContent = cheers.teamB;
    }

    async function handleCheer(team, e) {
        updateCounts({ ...cheers, [team]: cheers[team] + 1 });
        try {
            const state = await fetch(`/api/fanzone/${encodeURIComponent(matchId)}/cheer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team }),
            }).then(r => r.json());
            if (state.cheers) updateCounts(state.cheers);
        } catch (err) {
            console.warn('Fan Zone cheer failed:', err);
        }

        // Animate button
        const btn = team === 'teamA' ? cheerA : cheerB;
        btn.classList.add('pop');
        setTimeout(() => btn.classList.remove('pop'), 200);

        // Confetti Explosion!
        const rect = btn.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        const color = team === 'teamA' ? '#00D4FF' : '#FF3D00'; // Cyber vs Fire

        confetti({
            particleCount: 60,
            spread: 70,
            origin: { x, y },
            colors: [color, '#ffffff'],
            disableForReducedMotion: true,
            zIndex: 2000
        });
    }
}
