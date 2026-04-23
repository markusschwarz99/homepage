import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    if (password.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen haben');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
          <div className="bg-bg-primary p-10 rounded-lg border border-border max-w-md w-full text-center">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-2xl font-medium mb-2">Fast geschafft!</h1>
            <p className="text-text-muted text-sm mb-6">
              Wir haben dir eine Bestätigungsmail an <strong>{email}</strong> geschickt.
              Bitte klicke auf den Link um deine Registrierung abzuschließen.
            </p>
            <p className="text-xs text-text-hint">
              Danach wird dein Account von einem Administrator freigegeben.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="bg-bg-primary p-10 rounded-lg border border-border max-w-md w-full">
          <h1 className="text-2xl font-medium mb-2">Registrieren</h1>
          <p className="text-sm text-text-muted mb-8">
            Erstelle einen Account um Zugang zu erhalten.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
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
            <div>
              <label className="block text-xs text-text-muted mb-2">Passwort bestätigen</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              />
            </div>

            <Button type="submit" className="w-full mt-6">
              Registrieren
            </Button>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </form>

          <p className="text-xs text-text-hint text-center mt-6">
            Bereits registriert?{' '}
            <Link to="/login" className="text-text-primary underline">Anmelden</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}
