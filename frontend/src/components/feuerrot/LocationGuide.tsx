import { useState, useMemo } from 'react';
import { LOCATIONS } from '../../data/feuerrot/locations';
import { POKEMON } from '../../data/feuerrot/pokemon';
import type { EncounterMethod } from '../../data/feuerrot/locations';

const METHOD_ICONS: Record<EncounterMethod, string> = {
  'Gras': '🌿',
  'Surfen': '🏄',
  'Alte Angel': '🎣',
  'Gute Angel': '🎣',
  'Superangel': '🎣',
  'Spezial': '⭐',
  'Interaktion': '🎁',
  'Tausch': '🔄',
};

function getPokemon(id: number) {
  return POKEMON.find(p => p.id === id);
}

function PokemonSprite({ id, size = 32 }: { id: number; size?: number }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="bg-surface-secondary rounded-full" style={{ width: size, height: size }} />;
  return (
    <img
      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
      alt=""
      width={size}
      height={size}
      className="pixelated"
      onError={() => setErr(true)}
    />
  );
}

export function LocationGuide() {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'byLocation' | 'byPokemon'>('byLocation');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const q = search.trim().toLowerCase();

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredLocations = useMemo(() => {
    if (!q) return LOCATIONS;
    return LOCATIONS.map(loc => {
      const nameMatch = loc.name.toLowerCase().includes(q);
      const filteredEnc = loc.encounters.filter(e => {
        const poke = getPokemon(e.pokemonId);
        return poke && (poke.name.toLowerCase().includes(q) || poke.nameEn.toLowerCase().includes(q));
      });
      if (nameMatch) return loc;
      if (filteredEnc.length > 0) return { ...loc, encounters: filteredEnc };
      return null;
    }).filter(Boolean) as typeof LOCATIONS;
  }, [q]);

  // By Pokémon view: one row per Pokémon, listing all locations
  const pokemonLocationMap = useMemo(() => {
    const map = new Map<number, { locationName: string; method: EncounterMethod; levels: string; note?: string; fireRedOnly?: boolean; leafGreenOnly?: boolean }[]>();
    for (const loc of LOCATIONS) {
      for (const enc of loc.encounters) {
        const existing = map.get(enc.pokemonId) ?? [];
        existing.push({ locationName: loc.name, method: enc.method, levels: enc.levels, note: enc.note, fireRedOnly: enc.fireRedOnly, leafGreenOnly: enc.leafGreenOnly });
        map.set(enc.pokemonId, existing);
      }
    }
    return map;
  }, []);

  const filteredPokemon = useMemo(() => {
    return POKEMON.filter(p => {
      const inMap = pokemonLocationMap.has(p.id);
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || String(p.id).includes(q);
      return inMap && matchesSearch;
    });
  }, [q, pokemonLocationMap]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Pokémon oder Ort suchen…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-surface-secondary border border-border text-text-primary placeholder:text-text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('byLocation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'byLocation' ? 'bg-accent-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
            }`}
          >
            Nach Ort
          </button>
          <button
            onClick={() => setViewMode('byPokemon')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'byPokemon' ? 'bg-accent-primary text-white' : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
            }`}
          >
            Nach Pokémon
          </button>
        </div>
      </div>

      {/* By Location */}
      {viewMode === 'byLocation' && (
        <div className="space-y-2">
          {filteredLocations.map(loc => (
            <div key={loc.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(loc.id)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-secondary hover:bg-surface-secondary/80 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold text-text-primary">{loc.name}</span>
                  {loc.region && <span className="text-text-secondary text-sm ml-2">— {loc.region}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-text-secondary text-xs">{loc.encounters.length} Pokémon</span>
                  <span className="text-text-secondary">{expanded.has(loc.id) ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded.has(loc.id) && (
                <div className="divide-y divide-border">
                  {loc.encounters.map((enc, i) => {
                    const poke = getPokemon(enc.pokemonId);
                    if (!poke) return null;
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 bg-surface-primary">
                        <PokemonSprite id={enc.pokemonId} size={40} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-text-primary text-sm">{poke.name}</span>
                            <span className="text-text-secondary text-xs">#{String(poke.id).padStart(3, '0')}</span>
                            {enc.fireRedOnly && <span className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs px-1.5 py-0.5 rounded">FR</span>}
                            {enc.leafGreenOnly && <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1.5 py-0.5 rounded">LG</span>}
                          </div>
                          {enc.note && <p className="text-text-secondary text-xs">{enc.note}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-text-secondary">{METHOD_ICONS[enc.method]} {enc.method}</div>
                          <div className="text-xs text-text-secondary">Lv. {enc.levels}</div>
                          {enc.rarity && <div className="text-xs text-text-secondary">{enc.rarity}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {filteredLocations.length === 0 && (
            <p className="text-text-secondary text-sm text-center py-8">Keine Fundorte gefunden.</p>
          )}
        </div>
      )}

      {/* By Pokémon */}
      {viewMode === 'byPokemon' && (
        <div className="space-y-2">
          {filteredPokemon.map(poke => {
            const locs = pokemonLocationMap.get(poke.id) ?? [];
            return (
              <div key={poke.id} className="border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleExpand(`p-${poke.id}`)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-surface-secondary hover:bg-surface-secondary/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <PokemonSprite id={poke.id} size={36} />
                    <div>
                      <span className="font-semibold text-text-primary">{poke.name}</span>
                      <span className="text-text-secondary text-xs ml-2">#{String(poke.id).padStart(3, '0')}</span>
                      {poke.versionExclusive && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          poke.versionExclusive === 'FR'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>{poke.versionExclusive}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-text-secondary">{expanded.has(`p-${poke.id}`) ? '▲' : '▼'}</span>
                </button>
                {expanded.has(`p-${poke.id}`) && (
                  <div className="divide-y divide-border">
                    {locs.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 px-4 py-2 bg-surface-primary text-sm">
                        <span className="font-medium text-text-primary">{l.locationName}</span>
                        <span className="text-text-secondary text-xs">{METHOD_ICONS[l.method]} {l.method} · Lv. {l.levels}</span>
                        {l.note && <span className="text-text-secondary text-xs">({l.note})</span>}
                        {l.fireRedOnly && <span className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs px-1 rounded">FR</span>}
                        {l.leafGreenOnly && <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs px-1 rounded">LG</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredPokemon.length === 0 && (
            <p className="text-text-secondary text-sm text-center py-8">Kein Pokémon gefunden.</p>
          )}
        </div>
      )}
    </div>
  );
}
