import { useState, useEffect } from 'react';

// Simple admin panel for managing mock matches
export default function AdminPanel() {
  const [matches, setMatches] = useState([]);
  const [newMatch, setNewMatch] = useState({ teamA: '', teamB: '', sport: 'cricket' });

  useEffect(() => {
    // Load from localStorage or mock
    const stored = localStorage.getItem('admin_matches');
    if (stored) {
      setMatches(JSON.parse(stored));
    } else {
      setMatches([
        { id: 1, teamA: 'Mumbai Indians', teamB: 'Chennai Super Kings', sport: 'cricket' },
        { id: 2, teamA: 'Arsenal', teamB: 'Manchester City', sport: 'football' }
      ]);
    }
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

  return (
    <div className="admin-container">
      <h2>Admin Panel</h2>
      <form onSubmit={handleAdd} className="admin-form">
        <input type="text" placeholder="Team A" value={newMatch.teamA} onChange={e => setNewMatch({ ...newMatch, teamA: e.target.value })} />
        <input type="text" placeholder="Team B" value={newMatch.teamB} onChange={e => setNewMatch({ ...newMatch, teamB: e.target.value })} />
        <select value={newMatch.sport} onChange={e => setNewMatch({ ...newMatch, sport: e.target.value })}>
          <option value="cricket">Cricket</option>
          <option value="football">Football</option>
          <option value="nba">NBA</option>
        </select>
        <button type="submit">Add Match</button>
      </form>
      <ul className="admin-list">
        {matches.map(m => (
          <li key={m.id}>
            <b>{m.teamA}</b> vs <b>{m.teamB}</b> <span>({m.sport})</span>
            <button onClick={() => handleDelete(m.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
