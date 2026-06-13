import Login from './Login.jsx';

export default function AuthGate({ onLoginSuccess }) {
  const handleLogin = (userObj) => {
    if (onLoginSuccess) onLoginSuccess(userObj);
  };

  return <Login onLogin={handleLogin} />;
}
