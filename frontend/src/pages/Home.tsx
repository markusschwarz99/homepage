import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export function Home() {
  const { user } = useAuth();

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <p className="text-xs text-text-hint mb-2">Willkommen</p>
        <h1 className="text-2xl sm:text-4xl font-medium mb-4 leading-tight">
          {user ? `${getGreeting()}, ${user.name}.` : 'Guten Tag.'}
        </h1>
        <p className="text-base text-text-muted max-w-lg">
          Hier teile ich meine Gedanken, Rezepte und Ideen. Schön dass du da bist!
        </p>
      </div>
    </Layout>
  );
}
