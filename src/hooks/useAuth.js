import { useCallback, useEffect, useState } from 'react';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(readUser);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const sync = useCallback(() => setUser(readUser()), []);

  useEffect(() => {
    document.addEventListener('esd:login-success', sync);
    window.addEventListener('storage', sync);
    return () => {
      document.removeEventListener('esd:login-success', sync);
      window.removeEventListener('storage', sync);
    };
  }, [sync]);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  }, []);

  return { user, token, isAuthenticated: !!user?.username, logout, refresh: sync };
}
