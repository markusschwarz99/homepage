import { useState, useEffect } from 'react';
import { api, getToken, removeToken } from '../lib/api';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await api<User>('/auth/me');
      setUser(userData);
    } catch {
      removeToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    removeToken();
    setUser(null);
    window.location.href = '/';
  }

  return { user, loading, logout, refetch: checkAuth };
}
