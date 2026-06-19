import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
  const [socialStats, setSocialStats] = useState(null);
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
    fetch(apiUrl('/api/stats/public'))
      .then(r => r.json())
      .then(setSocialStats)
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
  const upcomingMatches = matches.filter(m => m.status === 'upcoming').slice(0, 5);
  const risingMatches = [...matches]
    .sort((a, b) => (b.momentum || 0) - (a.momentum || 0))
    .slice(0, 4);
  const activeSports = SPORTS.filter(s => s.id !== 'all');
  const setSport = (id) => {
    setActiveSport(id);
    navigate(id === 'all' ? '/' : `/sport/${id}`, { replace: true });
  };

  return (
    <div className="home-v2">
      <Helmet>
        <title>Esportsduniya — Live Sports Scores, AI Insights &amp; Predictions</title>
      </Helmet>
      <header className="home-hero home-cockpit-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">EsportsDuniya Fan Operating System</span>
          <h1>
            {user?.username ? `${user.username}'s Live Sports Cockpit` : 'Live Sports Cockpit'}
          </h1>
          <p>
            Enter the match room, lock your Oracle call, watch crowd belief move, and build a Fan Passport across cricket, football, and global sport.
          </p>
        </div>
        <div className="home-hero-panel" aria-label="Live cockpit status">
          <div>
            <span className="home-metric-value">{liveMatches.length}</span>
            <span className="home-metric-label">Live rooms</span>
          </div>
          <div>
            <span className="home-metric-value">{matches.length}</span>
            <span className="home-metric-label">Tracked matches</span>
          </div>
          <div>
            <span className="home-metric-value">{trending.reduce((sum, t) => sum + (t.count || 0), 0)}</span>
            <span className="home-metric-label">Crowd signals</span>
          </div>
        </div>
      </header>

      {socialStats && (
        <div className="home-social-proof" style={{
          display: 'flex', justifyContent: 'center', gap: 32, padding: '12px 20px',
          background: 'rgba(30,230,167,0.04)', borderBottom: '1px solid rgba(30,230,167,0.1)',
          fontSize: '0.85rem', color: '#aaa', flexWrap: 'wrap',
        }}>
          <span><strong style={{ color: '#1ee6a7' }}>{socialStats.users.toLocaleString()}</strong> fans joined</span>
          <span><strong style={{ color: '#f8c300' }}>{socialStats.predictions.toLocaleString()}</strong> predictions locked</span>
          <span><strong style={{ color: '#fff' }}>{socialStats.sports}</strong> sports tracked</span>
        </div>
      )}

      {liveMatches.length > 0 && (
        <section className="home-command-section" aria-label="Live now">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Live Now</h2>
              <p>Tap into rooms where the score, crowd, AI, and Oracle are moving right now.</p>
            </div>
          </div>
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
        <section className="home-missed-card home-passport-card" aria-label="Your matches today">
          <strong>Your sports radar</strong>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {yourMatches.filter(m => m.status === 'live').length} live ·{' '}
            {yourMatches.filter(m => m.status === 'upcoming').length} upcoming · tuned to {favSports.join(', ')}
          </p>
        </section>
      )}

      {trending.length > 0 && (
        <section className="home-command-section">
          <h2 className="home-section-title">Rising Crowd Signals</h2>
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

      <section className="home-command-section" aria-label="Crowd pulse">
        <div className="home-section-head">
          <div>
            <h2 className="home-section-title">Crowd Pulse</h2>
            <p>Real-time fan energy from cheers and match-room signals.</p>
          </div>
          <Link to="/crowdpulse" className="home-text-link">Open Pulse →</Link>
        </div>
      </section>

      <div className="sport-tabs" role="tablist">
        <button
          type="button"
          className={`sport-tab ${activeSport === 'all' ? 'active' : ''}`}
          onClick={() => setSport('all')}
        >
          🌐 All
        </button>
        {activeSports.map(s => (
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

      {risingMatches.length > 0 && (
        <section className="home-command-section" aria-label="Rising matches">
          <div className="home-section-head">
            <div>
              <h2 className="home-section-title">Rising Matches</h2>
              <p>Highest momentum rooms to enter before the crowd catches up.</p>
            </div>
          </div>
          <div className="home-rising-grid">
            {risingMatches.map((m, i) => (
              <Link key={m.id} to={`/match/${m.id}`} className="home-rising-card">
                <span className="home-rising-rank">#{i + 1}</span>
                <strong>{m.teamA?.name} vs {m.teamB?.name}</strong>
                <small>{m.league} · {m.status}</small>
                <div className="home-belief-bar"><span style={{ width: `${Math.max(8, m.momentum || 50)}%` }} /></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcomingMatches.length > 0 && (
        <section className="home-command-section" aria-label="Upcoming big fixtures">
          <h2 className="home-section-title">Upcoming Big Fixtures</h2>
          <div className="home-upcoming-list">
            {upcomingMatches.map(m => (
              <Link key={m.id} to={`/match/${m.id}`} className="home-upcoming-row">
                <span>{m.sport}</span>
                <strong>{m.teamA?.name} vs {m.teamB?.name}</strong>
                <em>{m.minute || m.kickoff || m.league}</em>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div ref={gridRef} className="match-grid" />
      <section className="home-command-section home-stories-strip" aria-label="Latest stories">
        <div>
          <h2 className="home-section-title">Latest Stories</h2>
          <p>SEO stories now support the live product: previews, rivalry explainers, prediction reports, and match-turning recaps.</p>
        </div>
        <Link to="/blog" className="home-retry-btn">Read Stories</Link>
      </section>
      <div ref={footerRef} />
    </div>
  );
}
