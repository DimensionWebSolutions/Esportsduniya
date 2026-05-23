import { useState, useEffect } from 'react';
import Login from './Login.jsx';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogin = (userObj) => {
    setUser(userObj);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <div style={{ textAlign: 'right', margin: '1rem' }}>
        <span>Welcome, {user.username}! </span>
        <button onClick={handleLogout}>Logout</button>
      </div>
      {children}
    </div>
  );
}
