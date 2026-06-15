/* ============================================
   ESPORTSDUNIYA — Time Machine / Chronicles Page
   ============================================ */
import { HISTORICAL_EVENTS } from '../data/mockData.js';

const ERAS = [
    { id: 'all', label: '🌍 All Eras' },
    { id: 'vintage', label: '📜 1920s–1950s' },
    { id: 'retro', label: '📼 1960s–1980s' },
    { id: 'digital', label: '💿 1990s–2010s' },
    { id: 'modern', label: '⚡ 2020s+' },
];

export function createTimeMachine(gsap) {
    const page = document.createElement('div');
    page.className = 'page-enter';
    page.id = 'timemachine-page';

    // Header
    const header = document.createElement('div');
    header.className = 'tm-header';
    header.innerHTML = `
    <h1>⏳ The Chronicles</h1>
    <p>Travel through time and relive the moments that defined sport. <span class="curated-badge">Curated · Fan Zone</span></p>
  `;
    page.appendChild(header);

    // Era Navigation
    const eraNav = document.createElement('div');
    eraNav.className = 'tm-era-nav';
    eraNav.id = 'era-nav';
    eraNav.innerHTML = ERAS.map((era, i) => `
    <button class="era-btn ${i === 0 ? 'active' : ''}" data-era="${era.id}">
      ${era.label}
    </button>
  `).join('');
    page.appendChild(eraNav);

    // Timeline Container
    const timeline = document.createElement('div');
    timeline.className = 'timeline';
    timeline.id = 'timeline-container';
    page.appendChild(timeline);

    function renderTimeline(eraFilter) {
        timeline.innerHTML = '';

        const events = eraFilter === 'all'
            ? HISTORICAL_EVENTS
            : HISTORICAL_EVENTS.filter(e => e.era === eraFilter);

        // Group by decade
        const decades = {};
        events.forEach(ev => {
            if (!decades[ev.decade]) decades[ev.decade] = [];
            decades[ev.decade].push(ev);
        });

        Object.entries(decades).forEach(([decade, decadeEvents]) => {
            const era = decadeEvents[0].era;
            const section = document.createElement('div');
            section.className = `timeline-decade era-${era}`;

            // Decade marker
            section.innerHTML = `
        <div class="decade-marker">${decade.slice(0, 4)}</div>
        <div class="decade-label">${decade}</div>
      `;

            // Event cards
            decadeEvents.forEach(ev => {
                const card = document.createElement('div');
                card.className = 'glass-card event-card';
                card.innerHTML = `
          ${ev.onThisDay ? '<div class="otd-badge">📅 On This Day</div>' : ''}
          <div class="event-date">${ev.date}</div>
          <div class="event-title">${ev.title}</div>
          <div class="event-description">${ev.description}</div>
          <div class="event-stats">
            ${ev.stats.map(s => `
              <div class="event-stat">
                <span style="color:var(--text-muted);margin-right:4px">${s.label}:</span>
                <span style="font-weight:700">${s.value}</span>
              </div>
            `).join('')}
          </div>
        `;

                // Click to expand (toggle description visibility)
                card.addEventListener('click', () => {
                    card.classList.toggle('expanded');
                    const desc = card.querySelector('.event-description');
                    if (card.classList.contains('expanded')) {
                        desc.style.maxHeight = desc.scrollHeight + 'px';
                        desc.style.opacity = '1';
                    } else {
                        desc.style.maxHeight = '0px';
                        desc.style.opacity = '0.5';
                    }
                });

                section.appendChild(card);
            });

            timeline.appendChild(section);
        });

        // GSAP entrance animations
        if (gsap) {
            gsap.fromTo(
                timeline.querySelectorAll('.event-card'),
                { opacity: 0, x: -20, scale: 0.97 },
                {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power3.out',
                    clearProps: 'transform',
                }
            );

            gsap.fromTo(
                timeline.querySelectorAll('.decade-marker'),
                { opacity: 0, scale: 0.5 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    stagger: 0.15,
                    ease: 'back.out(1.7)',
                    clearProps: 'transform',
                }
            );
        }
    }

    renderTimeline('all');

    // Era filter handler
    eraNav.addEventListener('click', (e) => {
        const btn = e.target.closest('.era-btn');
        if (!btn) return;

        eraNav.querySelectorAll('.era-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTimeline(btn.dataset.era);
    });

    return page;
}
