const API_URL = import.meta.env.VITE_API_URL;

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // 401 bei authentifizierten Requests → Token ist ungültig/abgelaufen.
  // Ausloggen und auf Login leiten. /auth/me ausnehmen, damit das initiale
  // Laden (useAuth) nicht hart redirected — dort wird der Fehler bereits
  // sauber behandelt (Token wird entfernt, User bleibt null).
  if (response.status === 401 && token && path !== '/auth/me') {
    removeToken();
    window.location.href = '/login';
    throw new Error('Session abgelaufen');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Fehler' }));
    throw new Error(error.detail || 'Fehler');
  }

  return response.json();
}
