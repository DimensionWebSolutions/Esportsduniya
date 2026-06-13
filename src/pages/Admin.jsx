import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AdminPanel() {
  const [matches, setMatches] = useState([]);
  const [newMatch, setNewMatch] = useState({ teamA: '', teamB: '', sport: 'cricket' });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');

  useEffect(() => {
    const stored = localStorage.getItem('admin_matches');
    if (stored) {
      setMatches(JSON.parse(stored));
    } else {
      setMatches([
        { id: 1, teamA: 'Mumbai Indians', teamB: 'Chennai Super Kings', sport: 'cricket' },
        { id: 2, teamA: 'Arsenal', teamB: 'Manchester City', sport: 'football' },
      ]);
    }

    // Fetch leaderboard as a proxy for user stats
    fetch(`${API_BASE}/api/leaderboard?window=alltime`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.leaderboard || []);
        setStats({
          totalUsers: d.leaderboard?.length || 0,
          topFanPoints: d.leaderboard?.[0]?.fanPoints || 0,
        });
      })
      .catch(() => {});
  }, []);

  const saveMatches = (list) => {
    setMatches(list);
    localStorage.setItem('admin_matches', JSON.stringify(list));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newMatch.teamA || !newMatch.teamB) return;
    const updated = [...matches, { ...newMatch, id: Date.now() }];
    saveMatches(updated);
    setNewMatch({ teamA: '', teamB: '', sport: 'cricket' });
  };

  const handleDelete = (id) => {
    const updated = matches.filter(m => m.id !== id);
    saveMatches(updated);
  };

  const tabStyle = (tab) => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    background: activeTab === tab ? 'var(--accent-cyber, #1ee6a7)' : 'rgba(255,255,255,0.07)',
    color: activeTab === tab ? '#000' : '#aaa',
    marginRight: '8px',
  });

  return (
    <div className="admin-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--accent-cyber)', marginBottom: '8px' }}>Admin Panel</h2>
      <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>
        Manage matches and view platform stats. Only visible to admin accounts.
      </p>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-cyber)' }}>{stats.totalUsers}</div>
            <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Registered Users</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8c300' }}>{stats.topFanPoints.toLocaleString()}</div>
            <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Top FanPoints</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button style={tabStyle('matches')} onClick={() => setActiveTab('matches')}>Matches</button>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>Users</button>
      </div>

      {activeTab === 'matches' && (
        <>
          <form onSubmit={handleAdd} className="admin-form" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input
              type="text" placeholder="Team A" value={newMatch.teamA}
              onChange={e => setNewMatch({ ...newMatch, teamA: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', flex: 1 }}
            />
            <input
              type="text" placeholder="Team B" value={newMatch.teamB}
              onChange={e => setNewMatch({ ...newMatch, teamB: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', flex: 1 }}
            />
            <select
              value={newMatch.sport}
              onChange={e => setNewMatch({ ...newMatch, sport: e.target.value })}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(20,20,30,1)', color: '#fff' }}
            >
              <option value="cricket">Cricket</option>
              <option value="football">Football</option>
              <option value="nba">NBA</option>
              <option value="tennis">Tennis</option>
              <option value="f1">F1</option>
            </select>
            <button
              type="submit"
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent-cyber)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Add Match
            </button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {matches.map(m => (
              <li key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', marginBottom: '8px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
              }}>
                <span style={{ fontWeight: 600 }}>{m.teamA} vs {m.teamB}</span>
                <span style={{ color: '#aaa', fontSize: '0.85rem', marginLeft: '12px' }}>{m.sport}</span>
                <button
                  onClick={() => handleDelete(m.id)}
                  style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,60,60,0.3)', color: '#ff6060', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {activeTab === 'users' && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {users.slice(0, 20).map((u, i) => (
            <li key={u.username} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 16px', marginBottom: '6px',
              background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            }}>
              <span style={{ color: '#aaa', width: '24px', textAlign: 'right' }}>#{i + 1}</span>
              <span style={{ fontSize: '1.3rem' }}>{u.avatar}</span>
              <span style={{ fontWeight: 600, flex: 1 }}>{u.username}</span>
              <span style={{ color: '#f8c300', fontWeight: 700 }}>🪙 {u.fanPoints.toLocaleString()}</span>
              <span style={{ color: '#aaa', fontSize: '0.8rem' }}>🔥 {u.streak}d</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
