import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SPORT_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️', unknown: '🏅',
};

function PredictionCard({ pred }) {
  const sportIcon = SPORT_ICONS[pred.sport] || '🏅';
  const statusConfig = {
    correct: { label: '✅ Correct', cls: 'pred-correct', pts: `+${pred.pointsResult} pts` },
    incorrect: { label: '❌ Wrong', cls: 'pred-incorrect', pts: `−${pred.wager} pts` },
    pending: { label: '⏳ Pending', cls: 'pred-pending', pts: `${pred.potentialWin} possible` },
  };
  const cfg = statusConfig[pred.status] || statusConfig.pending;

  return (
    <div className={`prediction-card ${cfg.cls}`}>
      <div className="pred-sport-icon">{sportIcon}</div>
      <div className="pred-body">
        <div className="pred-match">{pred.matchLabel}</div>
        <div className="pred-pick">
          Picked: <strong>{pred.teamPickedName}</strong>
          <span className="pred-odds">@ {pred.odds}x</span>
        </div>
        <div className="pred-meta">
          Wagered {pred.wager} pts · {new Date(pred.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div className="pred-result">
        <span className={`pred-status-badge ${cfg.cls}`}>{cfg.label}</span>
        <span className="pred-pts">{cfg.pts}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reminders, setReminders] = useState([]);
  const [predData, setPredData] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser?.username) {
      fetchProfile(storedUser.username);
      fetchPredictions(storedUser.username);
    } else {
      setError('Please log in to view your profile.');
    }
    setReminders(JSON.parse(localStorage.getItem('esd_reminders') || '[]'));
  }, []);

  const fetchProfile = async (username) => {
    try {
      const response = await fetch(`${API_BASE}/api/profile/${username}`);
      const data = await response.json();
      if (response.ok) {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        const merged = { ...data, fanPoints: stored.fanPoints ?? data.fanPoints ?? 0, badges: stored.badges ?? data.badges ?? [] };
        setUser(merged);
        setPreferences(data.preferences || {});
      } else {
        setError(data.error || 'Failed to fetch profile.');
      }
    } catch (err) {
      setError('Network error or server unavailable.');
    }
  };

  const fetchPredictions = async (username) => {
    setPredLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/predictions/${username}`);
      if (res.ok) {
        const data = await res.json();
        setPredData(data);
      }
    } catch (err) {
      console.warn('Could not load predictions:', err);
    } finally {
      setPredLoading(false);
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    if (!user?.username) { setError('User not logged in.'); return; }
    try {
      const response = await fetch(`${API_BASE}/api/profile/${user.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });
      const data = await response.json();
      if (response.ok) {
        setUser(prev => ({ ...prev, ...data.user }));
        setPreferences(data.user.preferences);
        setEditing(false);
        setMessage('Profile updated successfully!');
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch {
      setError('Network error or server unavailable.');
    }
  };

  const cancelReminder = (matchId) => {
    const updated = reminders.filter(r => r.matchId !== matchId);
    setReminders(updated);
    localStorage.setItem('esd_reminders', JSON.stringify(updated));
  };

  if (!user) {
    return <div className="profile-container">{error || 'Loading profile...'}</div>;
  }

  const fanPoints = user.fanPoints || 0;
  const badges = user.badges || [];
  const streak = user.streak || 0;
  const stats = predData?.stats;
  const predictions = predData?.predictions || [];

  return (
    <div className="profile-container">
      {/* ── Fan Identity Header ── */}
      <div className="profile-hero">
        <div className="profile-avatar-big">{user.avatar || user.preferences?.avatar || '🦁'}</div>
        <div className="profile-hero-info">
          <h2 className="profile-username">{user.username}</h2>
          <div className="profile-stats-row">
            <div className="profile-stat">
              <span className="profile-stat-val">🪙 {fanPoints.toLocaleString()}</span>
              <span className="profile-stat-label">FanPoints</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-val">🔥 {streak}</span>
              <span className="profile-stat-label">Day Streak</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-val">🏅 {badges.length}</span>
              <span className="profile-stat-label">Badges</span>
            </div>
          </div>
        </div>
      </div>

      {message && <div className="profile-message success">{message}</div>}
      {error && <div className="profile-message error">{error}</div>}

      {/* ── Oracle Prediction Accuracy Card ── */}
      <div className="profile-section">
        <h3 className="profile-section-title">🔮 Prediction Accuracy</h3>
        {predLoading ? (
          <div className="pred-stats-loading">Analysing your Oracle record...</div>
        ) : stats && stats.total > 0 ? (
          <>
            <div className="pred-accuracy-card">
              {/* Accuracy ring */}
              <div className="accuracy-ring-wrap">
                <svg viewBox="0 0 80 80" className="accuracy-ring">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                  <circle
                    cx="40" cy="40" r="34"
                    fill="none"
                    stroke={stats.accuracyPct >= 60 ? 'var(--accent-neon)' : stats.accuracyPct >= 40 ? 'var(--accent-gold)' : 'var(--accent-fire)'}
                    strokeWidth="8"
                    strokeDasharray={`${(stats.accuracyPct / 100) * 213.6} 213.6`}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                  />
                  <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="700" fill="white">{stats.accuracyPct}%</text>
                </svg>
                <div className="accuracy-ring-label">Accuracy</div>
              </div>

              {/* Stats grid */}
              <div className="pred-stats-grid">
                <div className="pred-stat-item">
                  <span className="pred-stat-val text-neon">{stats.total}</span>
                  <span className="pred-stat-label">Total</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-val" style={{color:'var(--accent-neon)'}}>{stats.correct}</span>
                  <span className="pred-stat-label">Correct</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-val" style={{color:'var(--accent-fire)'}}>{stats.incorrect}</span>
                  <span className="pred-stat-label">Wrong</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-val" style={{color:'var(--accent-gold)'}}>{stats.pending}</span>
                  <span className="pred-stat-label">Pending</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-val" style={{color: stats.netPoints >= 0 ? 'var(--accent-neon)' : 'var(--accent-fire)'}}>
                    {stats.netPoints >= 0 ? '+' : ''}{stats.netPoints}
                  </span>
                  <span className="pred-stat-label">Net pts</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-val">🔥{stats.streak}</span>
                  <span className="pred-stat-label">Win streak</span>
                </div>
              </div>
            </div>

            {/* Prediction history list */}
            {predictions.length > 0 && (
              <div className="pred-history">
                <div className="pred-history-title">Recent Predictions</div>
                <div className="pred-list">
                  {predictions.slice(0, 10).map(pred => (
                    <PredictionCard key={pred.id} pred={pred} />
                  ))}
                </div>
                {predictions.length > 10 && (
                  <div className="pred-more">+{predictions.length - 10} more predictions</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="pred-empty">
            <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>🔮</div>
            <p>No predictions yet. Go to a match and use <strong>The Oracle</strong> to start predicting!</p>
          </div>
        )}
      </div>

      {/* ── Badges ── */}
      {badges.length > 0 && (
        <div className="profile-section">
          <h3 className="profile-section-title">🏅 Badges</h3>
          <div className="badges-grid">
            {badges.map((badge, i) => {
              const name = typeof badge === 'string' ? badge : badge.name;
              return (
                <div key={i} className="badge-item">
                  <span className="badge-emoji">{name.split(' ')[0]}</span>
                  <span className="badge-name">{name.split(' ').slice(1).join(' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Preferences ── */}
      <div className="profile-section">
        <h3 className="profile-section-title">⚙️ Preferences</h3>
        {!editing ? (
          <div>
            <p><b>Theme:</b> {preferences.theme || 'dark'}</p>
            <p><b>Notifications:</b> {preferences.notifications ? 'Enabled' : 'Disabled'}</p>
            <p><b>Favourite Sports:</b> {preferences.favoriteSports?.length > 0 ? preferences.favoriteSports.join(', ') : 'None selected'}</p>
            <button className="profile-edit-btn" onClick={() => setEditing(true)}>Edit Preferences</button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="profile-form">
            <label>
              Theme:
              <select name="theme" value={preferences.theme || 'dark'} onChange={handlePreferenceChange}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
            <label>
              Notifications:
              <input type="checkbox" name="notifications" checked={preferences.notifications || false} onChange={handlePreferenceChange} />
            </label>
            <label>
              Favourite Sports (comma-separated):
              <input
                type="text"
                name="favoriteSports"
                value={(preferences.favoriteSports || []).join(', ')}
                onChange={(e) => setPreferences(prev => ({ ...prev, favoriteSports: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
              />
            </label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button type="submit" className="profile-save-btn">Save Changes</button>
              <button type="button" className="profile-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Match Reminders ── */}
      <div className="profile-section">
        <h3 className="profile-section-title">⏰ Reminders</h3>
        {reminders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No reminders set. Click "Remind Me" on any upcoming match.</p>
        ) : (
          <div className="reminders-list">
            {reminders.map((r) => (
              <div key={r.matchId} className="reminder-item">
                <div className="reminder-info">
                  <span className="reminder-match">{r.teamA} vs {r.teamB}</span>
                  <span className="reminder-meta">{r.sport} · {r.kickoff || 'Upcoming'}</span>
                </div>
                <button className="reminder-cancel" onClick={() => cancelReminder(r.matchId)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Match History ── */}
      <div className="profile-section">
        <h3 className="profile-section-title">📋 Match History</h3>
        {user.matchHistory?.length > 0 ? (
          <ul className="profile-list">
            {user.matchHistory.map((match, i) => (
              <li key={i}>{match.details} — Prediction: {match.prediction}, Outcome: {match.outcome}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No match predictions yet.</p>
        )}
      </div>
    </div>
  );
}
