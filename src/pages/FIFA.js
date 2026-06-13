import {
  fetchFifaLiveMatches,
  fetchFifaMatchesByDateRange,
  fetchFifaStandings,
  fetchFifaKnockoutMatches,
  fetchTeamStats,
} from '../services/footballApi.js';
import { generateMatchPrediction, getPredictionCache, setPredictionCache } from '../services/geminiService.js';

const TAB_ITEMS = [
  { id: 'live', label: 'Live Scores' },
  { id: 'standings', label: 'Standings' },
  { id: 'bracket', label: 'Bracket' },
  { id: 'predictions', label: 'Predictions' },
];

function renderError(container, message) {
  container.innerHTML = `
    <div class="fifa-error-card">
      <div class="fifa-error-title">Unable to load FIFA data</div>
      <p>${message}</p>
      <button class="fifa-retry-btn">Retry</button>
    </div>
  `;
  container.querySelector('.fifa-retry-btn')?.addEventListener('click', () => {
    container.innerHTML = '<div class="fifa-loading">Retrying...</div>';
    renderFifaTab(container.dataset.tab, container.parentElement);
  });
}

function createSectionHeader(title, subtitle = '') {
  return `<div class="fifa-section-header"><div><h2>${title}</h2><p>${subtitle}</p></div></div>`;
}

function renderMatchCard(match) {
  return `
    <div class="fifa-match-card" data-match-id="${match.id}">
      <div class="fifa-match-meta">
        <div class="fifa-match-title">${match.homeTeam.name} vs ${match.awayTeam.name}</div>
        <div class="fifa-match-subtitle">${match.competition} · ${match.dateString} · ${match.localTime}</div>
      </div>
      <div class="fifa-match-score ${match.status}">
        <div class="team-line"><span class="team-name">${match.homeTeam.shortName}</span><span class="team-score">${match.homeTeam.score}</span></div>
        <div class="team-line"><span class="team-name">${match.awayTeam.shortName}</span><span class="team-score">${match.awayTeam.score}</span></div>
      </div>
      <div class="fifa-match-status">
        ${match.status === 'live' ? '<span class="fifa-live-dot"></span>' : ''}
        <span>${match.status.toUpperCase()}</span>
        <span>${match.minute}</span>
      </div>
    </div>`;
}

async function renderLiveSection(container) {
  try {
    const liveMatches = await fetchFifaLiveMatches();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const [todayMatches, recentMatches] = await Promise.all([
      fetchFifaMatchesByDateRange(today, today),
      fetchFifaMatchesByDateRange(yesterday, yesterday),
    ]);

    const grouped = {
      live: liveMatches,
      today: todayMatches.filter(m => m.status !== 'live'),
      recent: recentMatches.filter(m => m.status === 'finished'),
    };

    container.innerHTML = `
      ${createSectionHeader('FIFA World Cup 2026', 'Live matches, today’s schedule, and recent results in one place.')}
      <div class="fifa-group">
        <section class="fifa-group-panel"><h3>LIVE</h3><div class="fifa-group-list" data-group="live"></div></section>
        <section class="fifa-group-panel"><h3>TODAY</h3><div class="fifa-group-list" data-group="today"></div></section>
        <section class="fifa-group-panel"><h3>RECENT</h3><div class="fifa-group-list" data-group="recent"></div></section>
      </div>`;

    ['live', 'today', 'recent'].forEach(groupId => {
      const list = container.querySelector(`[data-group="${groupId}"]`);
      const matches = grouped[groupId];
      if (!matches || matches.length === 0) {
        list.innerHTML = '<div class="fifa-empty">No matches found.</div>';
        return;
      }
      list.innerHTML = matches.map(renderMatchCard).join('');
    });
  } catch (err) {
    console.error('[FIFA] Live section failed', err);
    renderError(container, err.message || 'Could not fetch live FIFA data.');
  }
}

async function renderStandingsSection(container) {
  try {
    const standings = await fetchFifaStandings();
    if (!standings || standings.length === 0) {
      container.innerHTML = '<div class="fifa-empty">Standings are unavailable at the moment.</div>';
      return;
    }

    const groups = {}; // build groups from all positions since WC uses a single table in API
    standings.forEach(entry => {
      const groupKey = entry.group || 'Group';
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(entry);
    });

    container.innerHTML = `
      ${createSectionHeader('Group Stage Standings', 'Top two teams highlighted in green.')}
      <div class="fifa-standings-grid"></div>`;
    const grid = container.querySelector('.fifa-standings-grid');
    Object.keys(groups).forEach(groupKey => {
      const rows = groups[groupKey];
      const table = `
        <div class="fifa-standings-card">
          <div class="fifa-standings-title">${groupKey}</div>
          <div class="fifa-standings-table-wrap">
            <table>
              <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead>
              <tbody>
                ${rows.map((row, index) => `
                  <tr class="${index < 2 ? 'qualify' : ''} ${index >= 2 ? 'eliminate' : ''}">
                    <td>${row.position}</td>
                    <td>${row.team}</td>
                    <td>${row.playedGames}</td>
                    <td>${row.won}</td>
                    <td>${row.draw}</td>
                    <td>${row.lost}</td>
                    <td>${row.goalsFor}</td>
                    <td>${row.goalsAgainst}</td>
                    <td>${row.goalDifference}</td>
                    <td>${row.points}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      grid.insertAdjacentHTML('beforeend', table);
    });
  } catch (err) {
    console.error('[FIFA] Standings section failed', err);
    renderError(container, err.message || 'Could not fetch FIFA standings.');
  }
}

function buildBracketHtml(matches) {
  const stages = ['ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'];
  const stageLabels = {
    ROUND_OF_16: 'Round of 16',
    QUARTER_FINAL: 'Quarter-finals',
    SEMI_FINAL: 'Semi-finals',
    FINAL: 'Final',
  };
  return `
    <div class="fifa-bracket-grid">
      ${stages.map(stage => {
        const stageMatches = matches.filter(m => m.stage === stage);
        return `<div class="fifa-bracket-column">
          <div class="fifa-bracket-stage">${stageLabels[stage] || stage}</div>
          ${stageMatches.map(match => `
            <div class="fifa-bracket-match ${match.status}">
              <div class="fifa-bracket-teams">
                <span>${match.homeTeam.shortName}</span>
                <span>${match.awayTeam.shortName}</span>
              </div>
              <div class="fifa-bracket-score">${match.homeTeam.score} - ${match.awayTeam.score}</div>
              <div class="fifa-bracket-meta">${match.status === 'upcoming' ? 'TBD' : `${match.minute}`}</div>
            </div>`).join('')}
        </div>`;
      }).join('')}
    </div>`;
}

async function renderBracketSection(container) {
  try {
    const matches = await fetchFifaKnockoutMatches();
    if (!matches || matches.length === 0) {
      container.innerHTML = '<div class="fifa-empty">Knockout bracket is unavailable.</div>';
      return;
    }
    container.innerHTML = `
      ${createSectionHeader('Knockout Bracket', 'Follow the path to the FIFA World Cup final.')}
      ${buildBracketHtml(matches)}`;
  } catch (err) {
    console.error('[FIFA] Bracket section failed', err);
    renderError(container, err.message || 'Could not load the World Cup bracket.');
  }
}

async function renderPredictionsSection(container) {
  try {
    const matches = await fetchFifaMatchesByDateRange(new Date(), new Date(new Date().setDate(new Date().getDate() + 7)));
    const upcoming = matches.filter(match => match.status === 'upcoming').slice(0, 4);
    if (upcoming.length === 0) {
      container.innerHTML = '<div class="fifa-empty">No upcoming FIFA matches found for predictions.</div>';
      return;
    }
    container.innerHTML = `
      ${createSectionHeader('AI Match Predictions', 'Gemini analyzes upcoming FIFA matches and returns a JSON-backed prediction.')}
      <div class="fifa-predictions-grid"></div>`;
    const grid = container.querySelector('.fifa-predictions-grid');

    for (const match of upcoming) {
      const card = document.createElement('div');
      card.className = 'fifa-prediction-card';
      card.innerHTML = `<div class="fifa-prediction-loading">Loading prediction for ${match.homeTeam.shortName} vs ${match.awayTeam.shortName}...</div>`;
      grid.appendChild(card);

      const cached = getPredictionCache(match.id);
      if (cached) {
        card.innerHTML = buildPredictionCard(match, cached, true);
        continue;
      }

      try {
        const [homeStats, awayStats] = await Promise.all([
          fetchTeamStats(match.homeTeam.id),
          fetchTeamStats(match.awayTeam.id),
        ]);
        const prediction = await generateMatchPrediction(match, homeStats, awayStats);
        setPredictionCache(match.id, prediction);
        card.innerHTML = buildPredictionCard(match, prediction, false);
      } catch (predictionError) {
        console.error('[FIFA] Prediction failed', predictionError);
        card.innerHTML = `
          <div class="fifa-prediction-card error">
            <div class="fifa-prediction-title">${match.homeTeam.shortName} vs ${match.awayTeam.shortName}</div>
            <div class="fifa-prediction-error">Prediction unavailable. ${predictionError.message}</div>
          </div>`;
      }
    }
  } catch (err) {
    console.error('[FIFA] Predictions section failed', err);
    renderError(container, err.message || 'Could not load predictions.');
  }
}

function buildPredictionCard(match, prediction, fromCache) {
  const confidence = Number(prediction.confidence) || 0;
  return `
    <div class="fifa-prediction-card">
      <div class="fifa-prediction-title">${match.homeTeam.shortName} vs ${match.awayTeam.shortName}</div>
      <div class="fifa-prediction-meta">${match.dateString} · ${match.localTime} · ${fromCache ? 'Cached' : 'Live'}</div>
      <div class="fifa-prediction-score">${prediction.scoreline}</div>
      <div class="fifa-prediction-winner">Predicted winner: <strong>${prediction.winner}</strong></div>
      <div class="fifa-confidence-bar"><div class="fifa-confidence-fill" style="width:${Math.min(confidence, 100)}%"></div></div>
      <div class="fifa-confidence-text">Confidence: ${confidence}%</div>
      <ul class="fifa-prediction-factors">${prediction.factors.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="fifa-bold-pick">Bold pick: ${prediction.boldPick}</div>
    </div>`;
}

async function renderFifaTab(tabId, container) {
  const section = container.querySelector(`#fifa-tab-${tabId}`);
  if (!section) return;
  section.innerHTML = '<div class="fifa-loading">Loading...</div>';
  section.dataset.tab = tabId;
  switch (tabId) {
    case 'live':
      await renderLiveSection(section);
      break;
    case 'standings':
      await renderStandingsSection(section);
      break;
    case 'bracket':
      await renderBracketSection(section);
      break;
    case 'predictions':
      await renderPredictionsSection(section);
      break;
    default:
      section.innerHTML = '<div class="fifa-empty">Section unavailable.</div>';
  }
}

export function createFifaPage(gsap) {
  const page = document.createElement('div');
  page.className = 'page-enter';
  page.id = 'fifa-page';
  page.innerHTML = `
    <div class="section-header">
      <h1>⚽ FIFA World Cup 2026</h1>
      <p>Live scores, group standings, knockout bracket, and AI match predictions all in one place.</p>
    </div>
    <div class="fifa-tabs">
      ${TAB_ITEMS.map(item => `<button class="fifa-tab-button${item.id === 'live' ? ' active' : ''}" data-tab="${item.id}">${item.label}</button>`).join('')}
    </div>
    <div class="fifa-tab-panels">
      ${TAB_ITEMS.map(item => `<div class="fifa-tab-panel" id="fifa-tab-${item.id}"></div>`).join('')}
    </div>
  `;

  const tabs = page.querySelectorAll('.fifa-tab-button');
  const panels = page.querySelectorAll('.fifa-tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(btn => btn.classList.toggle('active', btn === tab));
      panels.forEach(panel => panel.style.display = panel.id === `fifa-tab-${tab.dataset.tab}` ? '' : 'none');
      await renderFifaTab(tab.dataset.tab, page);
    });
  });

  panels.forEach((panel, index) => {
    panel.style.display = index === 0 ? '' : 'none';
  });

  renderFifaTab('live', page);

  const interval = setInterval(() => {
    const active = page.querySelector('.fifa-tab-button.active');
    if (active) {
      renderFifaTab(active.dataset.tab, page);
    }
  }, 30000);
  window.__pageIntervals = window.__pageIntervals || [];
  window.__pageIntervals.push(interval);

  return page;
}
