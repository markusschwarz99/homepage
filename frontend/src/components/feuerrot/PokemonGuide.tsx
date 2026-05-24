import { useState, useMemo } from 'react';
import { POKEMON, BASE_STATS } from '../../data/feuerrot/pokemon';
import type { Tier } from '../../data/feuerrot/pokemon';
import { TYPE_COLORS, TYPE_NAMES } from '../../data/feuerrot/types';
import type { TypeName } from '../../data/feuerrot/types';

const TIER_COLORS: Record<Tier, string> = {
  S: 'bg-amber-400 text-black',
  A: 'bg-purple-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-green-500 text-white',
  D: 'bg-gray-400 text-white',
};

const TIER_LABELS: Record<Tier, string> = {
  S: 'S – Unverzichtbar',
  A: 'A – Ausgezeichnet',
  B: 'B – Solide',
  C: 'C – Durchschnittlich',
  D: 'D – Schwach',
};

const ALL_TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];

function PokemonSprite({ id, size = 64 }: { id: number; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="bg-surface-secondary rounded-full mx-auto" style={{ width: size, height: size }} />;
  return (
    <img
      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
      alt=""
      width={size}
      height={size}
      className="pixelated mx-auto"
      onError={() => setErr(true)}
    />
  );
}

function StatBar({ value, max = 160 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = value >= 100 ? 'bg-green-500' : value >= 70 ? 'bg-blue-400' : value >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-secondary w-6 text-right">{value}</span>
    </div>
  );
}

export function PokemonGuide() {
  const [search, setSearch] = useState('');
  const [activeTiers, setActiveTiers] = useState<Set<Tier>>(new Set(ALL_TIERS));
  const [activeTypes, setActiveTypes] = useState<Set<TypeName>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const q = search.trim().toLowerCase();

  const toggleTier = (t: Tier) =>
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(t)) { if (next.size > 1) next.delete(t); }
      else next.add(t);
      return next;
    });

  const toggleType = (t: TypeName) =>
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const filtered = useMemo(() => {
    return POKEMON.filter(p => {
      if (!activeTiers.has(p.tier)) return false;
      if (activeTypes.size > 0 && !p.types.some(t => activeTypes.has(t))) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.nameEn.toLowerCase().includes(q) && !String(p.id).includes(q)) return false;
      return true;
    });
  }, [activeTiers, activeTypes, q]);

  const grouped = useMemo(() => {
    const g: Partial<Record<Tier, typeof POKEMON>> = {};
    for (const tier of ALL_TIERS) {
      const list = filtered.filter(p => p.tier === tier);
      if (list.length > 0) g[tier] = list;
    }
    return g;
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Filter-Leiste */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Pokémon suchen (Name oder Nummer)…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-text-secondary text-xs shrink-0">Tier:</span>
          {ALL_TIERS.map(t => (
            <button
              key={t}
              onClick={() => toggleTier(t)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeTiers.has(t) ? TIER_COLORS[t] : 'bg-surface-secondary text-text-secondary opacity-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-text-secondary text-xs shrink-0">Typ:</span>
          {TYPE_NAMES.map(t => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${TYPE_COLORS[t]} ${
                activeTypes.size === 0 || activeTypes.has(t) ? 'opacity-100' : 'opacity-30'
              }`}
            >
              {t}
            </button>
          ))}
          {activeTypes.size > 0 && (
            <button onClick={() => setActiveTypes(new Set())} className="text-xs text-text-secondary underline ml-1">
              zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Pokémon-Gruppen nach Tier */}
      {ALL_TIERS.map(tier => {
        const list = grouped[tier];
        if (!list) return null;
        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`${TIER_COLORS[tier]} text-sm font-bold px-2.5 py-1 rounded`}>{tier}</span>
              <span className="text-text-secondary text-sm">{TIER_LABELS[tier]}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map(poke => {
                const stats = BASE_STATS[poke.id - 1];
                const isExpanded = expandedId === poke.id;
                const bst = stats ? stats.reduce((a, b) => a + b, 0) : 0;
                return (
                  <div
                    key={poke.id}
                    className="border border-border rounded-lg bg-surface-primary overflow-hidden cursor-pointer hover:border-accent-primary/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : poke.id)}
                  >
                    <div className="p-3 flex gap-3 items-start">
                      <div className="shrink-0 w-16">
                        <PokemonSprite id={poke.id} size={56} />
                        <p className="text-center text-xs text-text-secondary">#{String(poke.id).padStart(3, '0')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div>
                            <p className="font-semibold text-text-primary leading-tight">{poke.name}</p>
                            <p className="text-xs text-text-secondary">{poke.nameEn}</p>
                          </div>
                          <span className={`${TIER_COLORS[poke.tier]} text-xs font-bold px-1.5 py-0.5 rounded shrink-0`}>{poke.tier}</span>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-2">
                          {poke.types.map(t => (
                            <span key={t} className={`${TYPE_COLORS[t]} text-xs px-1.5 py-0.5 rounded`}>{t}</span>
                          ))}
                          {poke.versionExclusive && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              poke.versionExclusive === 'FR'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>{poke.versionExclusive} exkl.</span>
                          )}
                          {poke.tradeRequired && (
                            <span className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs px-1.5 py-0.5 rounded">Tausch nötig</span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{poke.note}</p>
                      </div>
                    </div>
                    {isExpanded && stats && (
                      <div className="border-t border-border px-3 py-2 bg-surface-secondary space-y-1">
                        <p className="text-xs font-semibold text-text-primary mb-1">Basiswerte (BSW: {bst})</p>
                        {['HP', 'Ang', 'Vert', 'Sp.Ang', 'Sp.Vert', 'Init'].map((label, i) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary w-14 shrink-0">{label}</span>
                            <StatBar value={stats[i]} />
                          </div>
                        ))}
                        <p className="text-xs text-text-secondary pt-1">📍 {poke.obtain}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-8">Kein Pokémon gefunden.</p>
      )}
    </div>
  );
}
