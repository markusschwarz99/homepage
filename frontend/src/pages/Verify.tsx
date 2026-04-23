import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function Verify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/auth/verify?token=${token}`)
      .then(res => {
        if (res.ok) setStatus('success');
        else setStatus('error');
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="bg-bg-primary p-10 rounded-lg border border-border max-w-md w-full text-center">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-4">⏳</div>
              <h1 className="text-2xl font-medium">Wird verifiziert...</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-4xl mb-4">✅</div>
              <h1 className="text-2xl font-medium mb-2">Email bestätigt!</h1>
              <p className="text-text-muted text-sm mb-6">
                Deine Email wurde erfolgreich bestätigt. Ein Administrator wird deinen Account nun freigeben – du bekommst eine Email sobald es soweit ist.
              </p>
              <Link to="/login" className="text-text-primary underline text-sm">
                Zur Anmeldung
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-4xl mb-4">❌</div>
              <h1 className="text-2xl font-medium mb-2">Fehler</h1>
              <p className="text-text-muted text-sm mb-6">
                Der Verifikationslink ist ungültig oder bereits abgelaufen.
              </p>
              <Link to="/login" className="text-text-primary underline text-sm">
                Zur Anmeldung
              </Link>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
