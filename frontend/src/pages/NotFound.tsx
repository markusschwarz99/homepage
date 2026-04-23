import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function NotFound() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-8 py-24 text-center">
        <h1 className="text-6xl font-medium mb-4">404</h1>
        <p className="text-lg text-text-muted mb-8">Diese Seite existiert nicht.</p>
        <Link
          to="/"
          className="text-sm text-text-primary underline hover:opacity-70"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </Layout>
  );
}
