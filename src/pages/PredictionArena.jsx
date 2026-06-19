import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiUrl } from '../config/apiBase.js';

const RIVALRIES = [
  { id: 'mi-csk', label: 'MI vs CSK', filter: /mumbai|chennai/i },
  { id: 'ind-pak', label: 'India vs Pakistan', filter: /india|pakistan/i },
  { id: 'el-clasico', label: 'El Clásico', filter: /barcelona|real madrid/i },
];

export default function PredictionArena() {
  const [season, setSeason] = useState(null);
  const [tab, setTab] = useState('season');
  const [rivalry, setRivalry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl('/api/arena/season'))
      .then(r => r.json())
      .then(data => {
        setSeason(data);
        setError('');
      })
      .catch(() => setError('Could not load arena standings'))
      .finally(() => setLoading(false));
  }, []);

  const standings = season?.standings || [];
  const myRank = user?.username
    ? standings.findIndex(s => s.username === user.username) + 1
    : 0;
  const myStats = standings.find(s => s.username === user?.username);

  const rivalryBoard = rivalry
    ? (season?.rivalries?.[rivalry.id] || []).slice(0, 20)
    : [];

  return (
    <div className="arena-page">
      <Helmet>
        <title>Prediction Arena — Skill-Rated Predictions | Esportsduniya</title>
      </Helmet>
      <header className="arena-hero">
        <h1>◈ Prediction Arena</h1>
        <p>Weekly Oracle seasons · Rivalry rooms · Calibration score against crowd belief and AI reads</p>
        {season?.weekId && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Season {season.weekId}
          </p>
        )}
      </header>

      <div className="arena-stats">
        <div className="arena-stat">
          <div className="arena-stat-value">{myStats?.calibrationScore ?? '—'}</div>
          <div className="arena-stat-label">Your calibration</div>
        </div>
        <div className="arena-stat">
          <div className="arena-stat-value">{myRank || '—'}</div>
          <div className="arena-stat-label">Your rank</div>
        </div>
        <div className="arena-stat">
          <div className="arena-stat-value">{myStats?.seasonPoints ?? 0}</div>
          <div className="arena-stat-label">Season points</div>
        </div>
        <div className="arena-stat">
          <div className="arena-stat-value">{user?.streak ?? 0}</div>
          <div className="arena-stat-label">Login streak</div>
        </div>
      </div>

      {!user?.username && (
        <div className="home-missed-card" style={{ marginBottom: 'var(--space-6)' }}>
          <strong>Open your Fan Passport to compete</strong>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
            Lock Oracle predictions inside Match Command Centers to climb weekly seasons.
          </p>
          <button type="button" className="home-retry-btn" onClick={() => window.mountLoginScreen?.()}>
            Sign In
          </button>
        </div>
      )}

      <div className="arena-tabs">
        <button type="button" className={`arena-tab ${tab === 'season' ? 'active' : ''}`} onClick={() => setTab('season')}>
          Season board
        </button>
        <button type="button" className={`arena-tab ${tab === 'rivalry' ? 'active' : ''}`} onClick={() => setTab('rivalry')}>
          Rivalry rooms
        </button>
      </div>

      {loading && <div className="home-skeleton-card" style={{ height: 120 }} />}

      {error && !loading && (
        <div className="home-empty-state"><p>{error}</p></div>
      )}

      {tab === 'season' && !loading && !error && (
        <div className="arena-table-wrap">
          <table className="arena-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Calibration</th>
                <th>Points</th>
                <th>Predictions</th>
              </tr>
            </thead>
            <tbody>
              {standings.length === 0 ? (
                <tr><td colSpan={5}>No predictors yet — be the first on a live match!</td></tr>
              ) : standings.map((row, i) => (
                <tr key={row.username} className={row.username === user?.username ? 'arena-row-you' : ''}>
                  <td>{i + 1}</td>
                  <td>{row.avatar} {row.username}</td>
                  <td>{row.calibrationScore}</td>
                  <td>{row.seasonPoints}</td>
                  <td>{row.predictions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rivalry' && (
        <>
          <div className="arena-tabs">
            {RIVALRIES.map(r => (
              <button
                key={r.id}
                type="button"
                className={`arena-tab ${rivalry?.id === r.id ? 'active' : ''}`}
                onClick={() => setRivalry(r)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {rivalry && (
            <div className="arena-table-wrap">
              <table className="arena-table">
                <thead>
                  <tr><th>#</th><th>Player</th><th>Rivalry picks</th><th>Win rate</th></tr>
                </thead>
                <tbody>
                  {rivalryBoard.length === 0 ? (
                    <tr><td colSpan={4}>No rivalry predictions yet for {rivalry.label}</td></tr>
                  ) : rivalryBoard.map((row, i) => (
                    <tr key={row.username}>
                      <td>{i + 1}</td>
                      <td>{row.avatar} {row.username}</td>
                      <td>{row.rivalryPicks}</td>
                      <td>{row.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: 'var(--space-8)', textAlign: 'center' }}>
        <Link to="/">← Pick a live match and lock your Oracle prediction</Link>
      </p>
    </div>
  );
}
