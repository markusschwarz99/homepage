import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { setToken } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || 'Login fehlgeschlagen');
        return;
      }

      const data = await response.json();
      setToken(data.access_token);
      // Harter Redirect per window.location, damit useAuth frisch lädt
      // (SPA-Navigate würde den neuen Token nicht mitbekommen)
      window.location.href = '/';
    } catch {
      setError('Verbindungsfehler');
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="bg-bg-primary p-10 rounded-lg border border-border max-w-md w-full">
          <h1 className="text-2xl font-medium mb-2">Anmelden</h1>
          <p className="text-sm text-text-muted mb-8">
            Bitte melde dich an um fortzufahren.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-2">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>

            <Button type="submit" className="w-full mt-6">
              Anmelden
            </Button>

            {error && (
              <p className="text-sm text-red-600 text-center mt-4">{error}</p>
            )}
          </form>

          <p className="text-xs text-text-hint text-center mt-4">
            <Link to="/forgot-password" className="text-text-primary underline">
              Passwort vergessen?
            </Link>
          </p>
          <p className="text-xs text-text-hint text-center mt-6">
            Noch kein Account?{' '}
            <Link to="/register" className="text-text-primary underline">
              Registrieren
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
