import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getSetting } from '../api/settings';

const FALLBACK_INTRO = 'Hier teile ich meine Gedanken, Rezepte und Ideen. Schön dass du da bist!';

export function Home() {
  const { user } = useAuth();
  const [intro, setIntro] = useState<string>(FALLBACK_INTRO);

  useEffect(() => {
    let cancelled = false;
    getSetting('homepage_intro')
      .then((s) => {
        if (!cancelled && s.value.trim()) setIntro(s.value);
      })
      .catch(() => {
        // Fallback bleibt — kein Crash, kein Error-Toast nötig
      });
    return () => { cancelled = true; };
  }, []);

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
        <p className="text-base text-text-muted max-w-lg whitespace-pre-line">
          {intro}
        </p>
      </div>
    </Layout>
  );
}
