import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Kein Token in der URL');
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen haben');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Fehler' }));
        setError(data.detail || 'Fehler');
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="bg-bg-primary p-10 rounded-lg border border-border max-w-md w-full">
          <h1 className="text-2xl font-medium mb-2">Neues Passwort setzen</h1>

          {success ? (
            <>
              <p className="text-sm text-text-muted mb-4">
                Dein Passwort wurde erfolgreich geändert. Du wirst gleich zum Login weitergeleitet...
              </p>
              <Link to="/login" className="text-sm text-text-primary underline">
                Jetzt einloggen →
              </Link>
            </>
          ) : !token ? (
            <>
              <p className="text-sm text-red-600 mb-8">
                Der Link ist ungültig. Bitte fordere einen neuen Reset-Link an.
              </p>
              <Link to="/forgot-password" className="text-sm text-text-primary underline">
                Neuen Link anfordern →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted mb-8">
                Gib dein neues Passwort ein. Mindestens 12 Zeichen.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-text-muted mb-2">Neues Passwort</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    minLength={12}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-2">Passwort bestätigen</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
                  />
                </div>
                <Button type="submit" className={`w-full mt-6 ${loading ? 'opacity-50' : ''}`}>
                  {loading ? 'Speichern...' : 'Passwort ändern'}
                </Button>
                {error && (
                  <p className="text-sm text-red-600 text-center mt-4">{error}</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
