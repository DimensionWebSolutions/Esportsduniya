import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SPORTS } from '../data/mockData.js';
import { fetchLiveMatches, getLiveScoresMeta } from '../services/apiService.js';
import { createMatchCard } from '../components/MatchCard.js';
import { createFooter } from '../components/Footer.js';
import { apiUrl } from '../config/apiBase.js';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function readPrefs() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const onboarding = JSON.parse(localStorage.getItem('esd_onboarding') || 'null');
    const favSports = user?.preferences?.favoriteSports?.length
      ? user.preferences.favoriteSports
      : onboarding?.sports?.length
        ? onboarding.sports
        : ['cricket', 'football'];
    return { user, favSports };
  } catch {
    return { user: null, favSports: ['cricket', 'football'] };
  }
}

export default function HomePage() {
  const { sport: sportParam } = useParams();
  const navigate = useNavigate();
  const gridRef = useRef(null);
  const footerRef = useRef(null);

  const [activeSport, setActiveSport] = useState(sportParam || 'all');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useState(null);
  const [trending, setTrending] = useState([]);
  const { user, favSports } = readPrefs();

  const goMatch = useCallback((m) => {
    if (window.esportsNavigatePath) window.esportsNavigatePath(`/match/${m.id}`);
    else navigate(`/match/${m.id}`);
  }, [navigate]);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sport = activeSport === 'all' ? 'all' : activeSport;
      const data = await fetchLiveMatches(sport);
      setMatches(Array.isArray(data) ? data : []);
      setMeta(getLiveScoresMeta());
    } catch (e) {
      setError(e.message || 'Could not load live scores');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [activeSport]);

  useEffect(() => {
    if (sportParam) setActiveSport(sportParam);
  }, [sportParam]);

  useEffect(() => {
    loadMatches();
    const id = setInterval(loadMatches, 60_000);
    return () => clearInterval(id);
  }, [loadMatches]);

  useEffect(() => {
    fetch(apiUrl('/api/trending'))
      .then(r => r.json())
      .then(d => setTrending(d.trending || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = activeSport === 'all'
      ? matches
      : matches.filter(m => m.sport === activeSport);

    const prioritized = [...filtered].sort((a, b) => {
      const fav = (m) => favSports.includes(m.sport) ? 1 : 0;
      const live = (m) => m.status === 'live' ? 1 : 0;
      return live(b) - live(a) || fav(b) - fav(a);
    });

    if (prioritized.length === 0 && !loading) {
      grid.innerHTML = `<div class="home-empty-state">
        <div class="home-empty-icon">📡</div>
        <h3>No matches right now</h3>
        <p>${error || 'Check back soon — live cricket & football refresh every minute.'}</p>
        <button type="button" class="home-retry-btn">↻ Retry</button>
      </div>`;
      grid.querySelector('.home-retry-btn')?.addEventListener('click', loadMatches);
      return;
    }

    prioritized.forEach(match => {
      grid.appendChild(createMatchCard(match, goMatch));
    });
  }, [matches, activeSport, loading, error, goMatch, favSports, loadMatches]);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(createFooter());
  }, []);

  const liveMatches = matches.filter(m => m.status === 'live');
  const yourMatches = matches.filter(m => favSports.includes(m.sport)).slice(0, 6);

  const setSport = (id) => {
    setActiveSport(id);
    navigate(id === 'all' ? '/' : `/sport/${id}`, { replace: true });
  };

  return (
    <div className="home-v2">
      <header className="home-hero">
        <h1>
          {user?.username ? `Welcome back, ${user.username}` : 'Live Sports Cockpit'}
        </h1>
        <p>
          Real scores, AI analyst, crowd energy & predictions — personalized for{' '}
          {favSports.map(s => SPORTS.find(x => x.id === s)?.label || s).join(' & ')}.
        </p>
      </header>

      {liveMatches.length > 0 && (
        <section aria-label="Live now">
          <h2 className="home-section-title">Live now</h2>
          <div className="home-live-strip">
            {liveMatches.slice(0, 8).map(m => (
              <Link key={m.id} to={`/match/${m.id}`} className="home-live-pill">
                <span className="home-live-dot" aria-hidden="true" />
                <span>{m.teamA?.name} vs {m.teamB?.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {yourMatches.length > 0 && (
        <section className="home-missed-card" aria-label="Your matches today">
          <strong>Your matches today</strong>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {yourMatches.filter(m => m.status === 'live').length} live ·{' '}
            {yourMatches.filter(m => m.status === 'upcoming').length} upcoming
          </p>
        </section>
      )}

      {trending.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 className="home-section-title">Trending</h2>
          <div className="home-live-strip">
            {trending.map(t => (
              <button
                key={t.sport}
                type="button"
                className="home-live-pill"
                onClick={() => setSport(t.sport)}
              >
                {t.icon} {t.label} · {t.count} cheers
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="sport-tabs" role="tablist">
        <button
          type="button"
          className={`sport-tab ${activeSport === 'all' ? 'active' : ''}`}
          onClick={() => setSport('all')}
        >
          🌐 All
        </button>
        {SPORTS.map(s => (
          <button
            key={s.id}
            type="button"
            className={`sport-tab ${activeSport === s.id ? 'active' : ''}`}
            onClick={() => setSport(s.id)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <div className="last-updated" style={{ margin: 'var(--space-4) 0' }}>
        {loading ? (
          <span className="home-skeleton-text">Connecting to live scores…</span>
        ) : meta?.fetchedAt ? (
          <>
            <span className="live-indicator" aria-hidden="true" />
            Updated {timeAgo(meta.fetchedAt)}
            {meta.source ? ` · ${meta.source}` : ''}
          </>
        ) : (
          <span>Live scores</span>
        )}
        {!loading && (
          <button type="button" className="live-retry-btn" onClick={loadMatches} style={{ marginLeft: 12 }}>
            ↻ Retry
          </button>
        )}
      </div>

      {loading && matches.length === 0 && (
        <div className="home-skeleton-grid" aria-hidden="true">
          {[1, 2, 3].map(i => (
            <div key={i} className="home-skeleton-card" />
          ))}
        </div>
      )}

      <div ref={gridRef} className="match-grid" />
      <div ref={footerRef} />
    </div>
  );
}
