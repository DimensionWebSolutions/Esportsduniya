import { useState, useEffect } from 'react';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser && storedUser.username) {
      fetchProfile(storedUser.username);
    } else {
      setError('Please log in to view your profile.');
    }
  }, []);

  const fetchProfile = async (username) => {
    try {
      const response = await fetch(`/api/profile/${username}`);
      const data = await response.json();
      if (response.ok) {
        setUser(data);
        setPreferences(data.preferences || {});
      } else {
        setError(data.error || 'Failed to fetch profile.');
      }
    } catch (err) {
      setError('Network error or server unavailable.');
      console.error('Fetch profile error:', err);
    }
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!user || !user.username) {
      setError('User not logged in.');
      return;
    }

    try {
      const response = await fetch(`/api/profile/${user.username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      });
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setPreferences(data.user.preferences);
        setEditing(false);
        setMessage('Profile updated successfully!');
      } else {
        setError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Network error or server unavailable.');
      console.error('Update profile error:', err);
    }
  };

  if (!user) {
    return <div className="profile-container">{error || 'Loading profile...'}</div>;
  }

  return (
    <div className="profile-container">
      <h2>{user.username}'s Profile</h2>
      {message && <div className="profile-message success">{message}</div>}
      {error && <div className="profile-message error">{error}</div>}

      {!editing ? (
        <div>
          <h3>Preferences</h3>
          <p><b>Theme:</b> {preferences.theme || 'dark'}</p>
          <p><b>Notifications:</b> {preferences.notifications ? 'Enabled' : 'Disabled'}</p>
          <p><b>Favorite Sports:</b> {(preferences.favoriteSports && preferences.favoriteSports.length > 0) ? preferences.favoriteSports.join(', ') : 'None selected'}</p>
          
          <h3>Match History</h3>
          {user.matchHistory && user.matchHistory.length > 0 ? (
            <ul>
              {user.matchHistory.map((match, index) => (
                <li key={index}>{match.details} - Prediction: {match.prediction}, Outcome: {match.outcome}</li>
              ))}
            </ul>
          ) : (
            <p>No match predictions yet.</p>
          )}

          <h3>Achievements</h3>
          {user.achievements && user.achievements.length > 0 ? (
            <ul>
              {user.achievements.map((achievement, index) => (
                <li key={index}>{achievement.name}: {achievement.description}</li>
              ))}
            </ul>
          ) : (
            <p>No achievements unlocked yet.</p>
          )}

          <button onClick={() => setEditing(true)} style={{ marginTop: '1rem' }}>Edit Preferences</button>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <h3>Edit Preferences</h3>
          <label>
            Theme:
            <select name="theme" value={preferences.theme || 'dark'} onChange={handlePreferenceChange}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label>
            Notifications:
            <input
              type="checkbox"
              name="notifications"
              checked={preferences.notifications || false}
              onChange={handlePreferenceChange}
            />
          </label>
          <label>
            Favorite Sports (comma-separated):
            <input
              type="text"
              name="favoriteSports"
              value={(preferences.favoriteSports || []).join(', ')}
              onChange={(e) => setPreferences(prev => ({ ...prev, favoriteSports: e.target.value.split(',').map(s => s.trim()) }))}
            />
          </label>
          <button type="submit">Save Changes</button>
          <button type="button" onClick={() => setEditing(false)} style={{ marginLeft: '10px' }}>Cancel</button>
        </form>
      )}
    </div>
  );
}
