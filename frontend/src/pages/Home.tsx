import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { getSetting } from '../api/settings';
import type { User } from '../types';

const FALLBACK_INTRO = 'Hier teile ich meine Gedanken, Rezepte und Ideen. Schön dass du da bist!';

interface NavCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  visible: (user: User | null) => boolean;
}

const NAV_CARDS: NavCard[] = [
  {
    title: 'Rezepte',
    description: 'Gesammelte Rezepte mit Zutaten, Schritten und Bildern.',
    icon: '🍳',
    path: '/rezepte',
    visible: (u) => !!u?.is_member,
  },
  {
    title: 'Saisonkalender',
    description: 'Regional und saisonal verfügbares Obst und Gemüse.',
    icon: '🌱',
    path: '/saisonkalender',
    visible: (u) => !!u?.is_member,
  },
  {
    title: 'Einkaufsliste',
    description: 'Gemeinsame Einkaufsliste für den Haushalt.',
    icon: '🛒',
    path: '/einkaufsliste',
    visible: (u) => !!u?.is_household,
  },
  {
    title: 'Impostor-Spiel',
    description: 'Wer kennt das Wort nicht? Ein Ratespiel für die Runde.',
    icon: '🕵️',
    path: '/impostor',
    visible: () => true,
  },
  {
    title: 'Tagebuch',
    description: 'Persönliche Einträge und Fotos.',
    icon: '📖',
    path: '/diary',
    visible: (u) => !!u?.is_admin,
  },
  {
    title: 'Administration',
    description: 'Nutzerverwaltung, Tags und Seiteneinstellungen.',
    icon: '⚙️',
    path: '/admin/users',
    visible: (u) => !!u?.is_admin,
  },
];

export function Home() {
  const { user, loading } = useAuth();
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

  const visibleCards = loading ? [] : NAV_CARDS.filter((c) => c.visible(user));

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

        {visibleCards.length > 0 && (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCards.map((card) => (
              <Link
                key={card.path}
                to={card.path}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-bg-primary p-5 hover:border-text-hint transition-colors"
              >
                <span className="text-2xl">{card.icon}</span>
                <span className="font-medium group-hover:text-accent transition-colors">{card.title}</span>
                <span className="text-sm text-text-muted">{card.description}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
