/* ============================================
   ESPORTSDUNIYA — The Oracle Component
   Prediction Game & Streaks
   ============================================ */
export function createOracle(matchId, teamA = { name: 'Team A' }, teamB = { name: 'Team B' }) {
    const container = document.createElement('div');
    container.className = 'oracle-widget glass-card';
    container.id = `oracle-${matchId}`;
    container.dataset.matchId = matchId;
    container.dataset.teamA = teamA.name;
    container.dataset.teamB = teamB.name;
    container.innerHTML = `
    <div class="oracle-header">
      <div class="oracle-icon">🔮</div>
      <div class="oracle-title">The Oracle</div>
      <div class="streak-badge">Run: <span id="streak-val">0</span>x</div>
    </div>
    
    <div class="prediction-state" id="prediction-state">
      <div class="question">Who will win this match?</div>
      <div class="options">
        <button class="pred-btn" data-choice="teamA">
          <span class="team-initial">${teamA.name[0] || 'A'}</span>
          <span class="team-name-mini">${teamA.name}</span>
          <span class="ratio">1.8x</span>
        </button>
        <button class="pred-btn" data-choice="teamB">
          <span class="team-initial">${teamB.name[0] || 'B'}</span>
          <span class="team-name-mini">${teamB.name}</span>
          <span class="ratio">2.1x</span>
        </button>
      </div>
      <div class="wager-slider">
        <label>Wager Points: <span id="wager-val">50</span></label>
        <input type="range" min="10" max="500" value="50" step="10" id="wager-input">
      </div>
      <button class="lock-btn" id="lock-pred">🔒 Lock Prediction</button>
    </div>

    <div class="locked-state" id="locked-state" style="display:none">
      <div class="locked-msg">
        <div>Prediction Locked!</div>
        <div class="user-choice" id="user-choice-disp">Team A</div>
      </div>
      <div class="potential-win">Potential Win: <span class="neon-text" id="pot-win">90</span> pts</div>
      <div class="oracle-pool" id="oracle-pool">Community pool loading...</div>
      <div class="oracle-status">Waiting for match result...</div>
    </div>
  `;
    return container;
}

export function initOracle(matchId) {
    const widget = document.getElementById(`oracle-${matchId}`);
    if (!widget) return;

    const storageKey = `oracle_pred_${matchId}`;
    const streakKey = 'oracle_streak';
    const teamNames = {
        teamA: widget.dataset.teamA || 'Team A',
        teamB: widget.dataset.teamB || 'Team B',
    };

    // Load streak
    const streak = localStorage.getItem(streakKey) || 0;
    widget.querySelector('#streak-val').textContent = streak;
    loadPool();
    connectLiveUpdates();

    // Check if locked
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        showLockedState(JSON.parse(saved));
    }

    // Wager slider
    const range = widget.querySelector('#wager-input');
    const label = widget.querySelector('#wager-val');
    range.addEventListener('input', (e) => {
        label.textContent = e.target.value;
    });

    // Selection logic
    let selected = null;
    widget.querySelectorAll('.pred-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            widget.querySelectorAll('.pred-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selected = btn.dataset.choice;
        });
    });

    // Lock logic
    widget.querySelector('#lock-pred').addEventListener('click', async () => {
        if (!selected) {
            alert('Please select a team first!'); // Simple feedback
            return;
        }

        const wager = parseInt(range.value);
        const prediction = {
            team: selected,
            wager,
            timestamp: Date.now(),
            potentialWin: Math.floor(wager * (selected === 'teamA' ? 1.8 : 2.1))
        };

        localStorage.setItem(storageKey, JSON.stringify(prediction));
        showLockedState(prediction);
        try {
            const pool = await fetch(`/api/oracle/${encodeURIComponent(matchId)}/prediction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team: selected, wager }),
            }).then(r => r.json());
            updatePool(pool);
        } catch (err) {
            console.warn('Oracle prediction sync failed:', err);
        }

        // Simulate "Oracle sees all" effect
        triggerOracleEffect(widget);
    });

    function showLockedState(pred) {
        widget.querySelector('#prediction-state').style.display = 'none';
        const locked = widget.querySelector('#locked-state');
        locked.style.display = 'flex';
        locked.querySelector('#user-choice-disp').textContent = `My Pick: ${teamNames[pred.team] || pred.team}`;
        locked.querySelector('#pot-win').textContent = pred.potentialWin;
    }

    async function loadPool() {
        try {
            const pool = await fetch(`/api/oracle/${encodeURIComponent(matchId)}`, { cache: 'no-store' }).then(r => r.json());
            updatePool(pool);
        } catch (err) {
            console.warn('Oracle pool unavailable:', err);
        }
    }

    function connectLiveUpdates() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${protocol}//${window.location.hostname}:3002`);
        socket.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'oracle_update' && String(message.matchId) === String(matchId)) {
                    updatePool(message.pool);
                }
            } catch {
                // Ignore non-JSON websocket messages.
            }
        });
    }

    function updatePool(pool = {}) {
        const poolEl = widget.querySelector('#oracle-pool');
        if (!poolEl) return;
        const totalA = Number(pool.totals?.teamA || 0);
        const totalB = Number(pool.totals?.teamB || 0);
        const pointsA = Number(pool.points?.teamA || 0);
        const pointsB = Number(pool.points?.teamB || 0);
        poolEl.textContent = `Community: ${teamNames.teamA} ${totalA} picks/${pointsA} pts · ${teamNames.teamB} ${totalB} picks/${pointsB} pts`;
    }
}

function triggerOracleEffect(widget) {
    // Add a mystical glow animation or sound
    widget.classList.add('mystical-pulse');
    setTimeout(() => widget.classList.remove('mystical-pulse'), 2000);
}
