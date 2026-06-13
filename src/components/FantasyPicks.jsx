import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SPORT_ICONS = { cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏁' };

export default function FantasyPicks({ match, onClose }) {
  const [pick, setPick] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingPick, setExistingPick] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const sportIcon = SPORT_ICONS[match?.sport] || '🏅';

  useEffect(() => {
    if (user?.username && match?.id) {
      fetch(`${API_BASE}/api/fantasy/${user.username}`)
        .then(r => r.json())
        .then(data => {
          const found = (data.picks || []).find(p => String(p.matchId) === String(match.id));
          if (found) setExistingPick(found);
        })
        .catch(() => {});
    }
  }, [match?.id]);

  const handleSubmit = async () => {
    if (!pick) { setError('Select a team to pick.'); return; }
    if (!user?.username || !token) { setError('Please log in to make a fantasy pick.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/fantasy/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: user.username,
          matchId: match.id,
          matchLabel: `${match.teamA?.name} vs ${match.teamB?.name}`,
          sport: match.sport,
          pick,
          pickType: 'team',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
        setExistingPick(data.pick);
      } else {
        setError(data.error || 'Could not save pick.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!match) return null;

  const alreadyPicked = existingPick || submitted;

  return (
    <div style={{
      background: 'rgba(16,16,28,0.97)',
      border: '1px solid rgba(100,100,220,0.3)',
      borderRadius: '16px',
      padding: '20px',
      margin: '12px 0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
          {sportIcon} Fantasy Pick
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        )}
      </div>

      <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '14px' }}>
        Pick the winner before the match ends to earn bonus FanPoints!
      </div>

      {alreadyPicked ? (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚡</div>
          <div style={{ color: 'var(--accent-neon)', fontWeight: 600 }}>
            You picked <strong>{existingPick?.pick || pick}</strong>
          </div>
          <div style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '4px' }}>
            Result pending — check your profile for updates
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            {[
              { key: match.teamA?.name, label: match.teamA?.name },
              { key: match.teamB?.name, label: match.teamB?.name },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPick(key)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: pick === key
                    ? '2px solid var(--accent-cyber)'
                    : '2px solid rgba(255,255,255,0.1)',
                  background: pick === key
                    ? 'rgba(30,200,200,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: pick === key ? 700 : 400,
                  transition: 'all 0.2s',
                }}
              >
                {sportIcon} {label}
              </button>
            ))}
          </div>

          {error && <div style={{ color: '#ff6060', fontSize: '0.85rem', marginBottom: '8px' }}>{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading || !pick}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: pick ? 'var(--accent-cyber)' : 'rgba(255,255,255,0.08)',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: pick ? 'pointer' : 'default',
              opacity: loading ? 0.7 : 1,
              fontSize: '1rem',
            }}
          >
            {loading ? 'Saving...' : 'Lock In Pick ⚡'}
          </button>
        </>
      )}
    </div>
  );
}
