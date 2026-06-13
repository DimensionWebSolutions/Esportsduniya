import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const authenticate = async (endpoint) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('token', data.token);
        onLogin(data.user);
        setMessage(data.message);

        // Show onboarding for new registrations
        if (endpoint === 'register' && !localStorage.getItem('esd_onboarded')) {
          import('../components/Onboarding.js').then(({ showOnboarding }) => {
            setTimeout(() => showOnboarding(data.user.username), 800);
          });
        }
      } else {
        setError(data.error || data.message || 'Authentication failed.');
      }
    } catch (err) {
      setError('Network error or server unavailable.');
      console.error('Authentication error:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (isRegistering) {
      authenticate('register');
    } else {
      authenticate('login');
    }
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
      </form>
      {error && <div className="error">{error}</div>}
      {message && <div className="message">{message}</div>}
      <p onClick={() => setIsRegistering(!isRegistering)} className="toggle-auth">
        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
      </p>
    </div>
  );
}
