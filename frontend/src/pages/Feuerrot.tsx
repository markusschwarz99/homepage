import { useState } from 'react';
import { Layout } from '../components/Layout';
import { TypeChart } from '../components/feuerrot/TypeChart';
import { LocationGuide } from '../components/feuerrot/LocationGuide';
import { PokemonGuide } from '../components/feuerrot/PokemonGuide';

type Tab = 'typen' | 'fundorte' | 'pokedex';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'typen', label: '⚔️ Typen-Chart', desc: 'Stärken & Schwächen' },
  { id: 'fundorte', label: '📍 Fundorte', desc: 'Wo findet man welches Pokémon?' },
  { id: 'pokedex', label: '📊 Pokédex & Tier-Liste', desc: 'Wie gut sind die Pokémon?' },
];

export function Feuerrot() {
  const [activeTab, setActiveTab] = useState<Tab>('typen');

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-1">Pokémon Feuerrot — Guide</h1>
          <p className="text-text-secondary">Typen-Chart, Fundorte und Tier-Liste für dein Durchspielen.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col px-4 py-3 rounded-lg text-left transition-colors border ${
                activeTab === tab.id
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-surface-secondary text-text-secondary border-border hover:border-accent-primary/50'
              }`}
            >
              <span className="font-semibold text-sm">{tab.label}</span>
              <span className={`text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-text-secondary'}`}>{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-surface-primary border border-border rounded-xl p-4 sm:p-6">
          {activeTab === 'typen' && <TypeChart />}
          {activeTab === 'fundorte' && <LocationGuide />}
          {activeTab === 'pokedex' && <PokemonGuide />}
        </div>

        <p className="mt-4 text-xs text-text-secondary text-center">
          Gen 3 Typen-Chart (FireRed/LeafGreen). Tier-Bewertungen basieren auf Community-Konsens für den Durchspiel-Modus.
        </p>
      </div>
    </Layout>
  );
}
