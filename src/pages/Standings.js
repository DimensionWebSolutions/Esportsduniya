// Standings Page
import { fetchStandings } from '../services/apiService.js';

export function createStandingsPage(gsap) {
    const page = document.createElement('div');
    page.className = 'page-enter';
    page.id = 'standings-page';
    page.innerHTML = `
      <div class="section-header">
        <h1>🏆 Standings & Leaderboards</h1>
        <div id="standings-league-tabs"></div>
      </div>
      <div id="standings-content">
        <div style="padding:32px;text-align:center;color:var(--text-muted);">Loading standings...</div>
      </div>
    `;
    (async () => {
        const leagues = ['football', 'cricket', 'nba', 'tennis', 'f1'];
        const tabs = page.querySelector('#standings-league-tabs');
        tabs.innerHTML = leagues.map(l => `<button class="standings-tab" data-league="${l}">${l.toUpperCase()}</button>`).join('');
        let current = 'football';
        async function renderTable(league) {
            const content = page.querySelector('#standings-content');
            content.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);">Loading...</div>';
            try {
                const data = await fetchStandings(league);
                if (!data || data.length === 0) {
                    content.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);">No standings data available.</div>';
                    return;
                }
            content.innerHTML = `
            <div style="overflow-x:auto;">
            <table class="standings-table" style="width:100%;border-collapse:collapse;margin-top:16px;font-size:1em;background:rgba(255,255,255,0.01);border-radius:10px;overflow:hidden;">
                <thead style="background:rgba(57,255,20,0.08);">
                  <tr style="font-size:1.05em;">
                    <th style="padding:8px 6px;">#</th>
                    <th style="padding:8px 6px;text-align:left;">Team</th>
                    <th style="padding:8px 6px;">W</th>
                    <th style="padding:8px 6px;">L</th>
                    <th style="padding:8px 6px;">D</th>
                    <th style="padding:8px 6px;">Pts</th>
                  </tr>
                </thead>
                <tbody>
                ${data.map((row,i) => `<tr style="border-bottom:1px solid #222;">
                  <td style="padding:7px 6px;text-align:center;">${i+1}</td>
                  <td style="padding:7px 6px;text-align:left;font-weight:600;">${row.team}</td>
                  <td style="padding:7px 6px;text-align:center;">${row.wins||'-'}</td>
                  <td style="padding:7px 6px;text-align:center;">${row.losses||'-'}</td>
                  <td style="padding:7px 6px;text-align:center;">${row.draws||'-'}</td>
                  <td style="padding:7px 6px;text-align:center;font-weight:700;">${row.points||'-'}</td>
                </tr>`).join('')}
                </tbody>
            </table>
            </div>`;
            } catch {
                content.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);">Standings unavailable right now. Try again later.</div>';
            }
        }
        tabs.addEventListener('click', e => {
            const btn = e.target.closest('.standings-tab');
            if (!btn) return;
            current = btn.dataset.league;
            renderTable(current);
        });
        renderTable(current);
    })();
    return page;
}
