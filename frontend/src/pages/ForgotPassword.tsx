import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Fehler' }));
        setError(data.detail || 'Fehler');
        return;
      }
      setSubmitted(true);
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
          <h1 className="text-2xl font-medium mb-2">Passwort vergessen</h1>

          {submitted ? (
            <>
              <p className="text-sm text-text-muted mb-8">
                Falls ein Account mit dieser Email existiert, wurde eine Email mit Anweisungen zum Zurücksetzen deines Passworts verschickt. Der Link ist eine Stunde lang gültig.
              </p>
              <Link to="/login" className="text-sm text-text-primary underline">
                ← Zurück zum Login
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted mb-8">
                Gib deine Email-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen deines Passworts.
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
                <Button type="submit" className={`w-full mt-6 ${loading ? 'opacity-50' : ''}`}>
                  {loading ? 'Sende...' : 'Link anfordern'}
                </Button>
                {error && (
                  <p className="text-sm text-red-600 text-center mt-4">{error}</p>
                )}
              </form>
              <p className="text-xs text-text-hint text-center mt-6">
                <Link to="/login" className="text-text-primary underline">
                  ← Zurück zum Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
