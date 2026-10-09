import { useCallback, useEffect, useState } from 'react';
import { safeReadStorageJson, safeStorageGet, safeStorageRemove } from '@/lib/utils';

function readUser() {
  return safeReadStorageJson('user', null);
}

export function useAuth() {
  const [user, setUser] = useState(readUser);
  const token = typeof window !== 'undefined' ? safeStorageGet('token') : null;

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
    safeStorageRemove('user');
    safeStorageRemove('token');
    setUser(null);
    window.location.href = '/';
  }, []);

  return { user, token, isAuthenticated: !!user?.username, logout, refresh: sync };
}
