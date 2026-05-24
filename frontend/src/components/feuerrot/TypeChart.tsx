import { useState } from 'react';
import { TYPE_NAMES, typeEffectiveness, TYPE_COLORS } from '../../data/feuerrot/types';
import type { TypeName } from '../../data/feuerrot/types';

type ViewMode = 'attacker' | 'defender' | 'full';

function TypeBadge({ type, onClick, active }: { type: TypeName; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-semibold transition-all ${TYPE_COLORS[type]} ${
        active ? 'ring-2 ring-offset-1 ring-white scale-105' : 'opacity-80 hover:opacity-100'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {type}
    </button>
  );
}

function EffCell({ value }: { value: number }) {
  const style =
    value === 2 ? 'bg-green-500 text-white font-bold'
    : value === 0.5 ? 'bg-red-400 text-white font-semibold'
    : value === 0 ? 'bg-gray-800 text-gray-300'
    : 'bg-surface-secondary text-text-secondary';
  const label = value === 2 ? '2×' : value === 0.5 ? '½×' : value === 0 ? '0×' : '1×';
  return (
    <td className={`text-center text-xs w-8 h-8 ${style}`}>{value !== 1 ? label : ''}</td>
  );
}

export function TypeChart() {
  const [mode, setMode] = useState<ViewMode>('attacker');
  const [selected, setSelected] = useState<TypeName | null>(null);

  const groupByEffect = (source: TypeName, isAttacker: boolean) => {
    const groups: Record<string, TypeName[]> = { '2×': [], '1×': [], '½×': [], '0×': [] };
    for (const target of TYPE_NAMES) {
      const val = isAttacker ? typeEffectiveness[source][target] : typeEffectiveness[target][source];
      if (val === 2) groups['2×'].push(target);
      else if (val === 0.5) groups['½×'].push(target);
      else if (val === 0) groups['0×'].push(target);
      else groups['1×'].push(target);
    }
    return groups;
  };

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap">
        {(['attacker', 'defender', 'full'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelected(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-accent-primary text-white'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-secondary/80'
            }`}
          >
            {m === 'attacker' ? 'Als Angreifer' : m === 'defender' ? 'Als Verteidiger' : 'Vollständige Tabelle'}
          </button>
        ))}
      </div>

      {/* Typ-Auswahl (attacker/defender modes) */}
      {mode !== 'full' && (
        <div>
          <p className="text-sm text-text-secondary mb-2">
            {mode === 'attacker' ? 'Wähle einen angreifenden Typ:' : 'Wähle einen verteidigenden Typ:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPE_NAMES.map(t => (
              <TypeBadge key={t} type={t} onClick={() => setSelected(t === selected ? null : t)} active={t === selected} />
            ))}
          </div>
        </div>
      )}

      {/* Ergebnis-Anzeige */}
      {mode !== 'full' && selected && (() => {
        const groups = groupByEffect(selected, mode === 'attacker');
        const labels: Record<string, string> =
          mode === 'attacker'
            ? { '2×': 'Trifft besonders effektiv (2×)', '½×': 'Nicht sehr effektiv (½×)', '0×': 'Trifft nicht (0×)', '1×': 'Normal (1×)' }
            : { '2×': 'Sehr effektiv gegen diesen Typ (2×)', '½×': 'Nicht sehr effektiv (½×)', '0×': 'Trifft diesen Typ nicht (0×)', '1×': 'Normal (1×)' };
        const orderedKeys = ['2×', '½×', '0×', '1×'];
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TypeBadge type={selected} />
              <span className="text-text-secondary text-sm">
                {mode === 'attacker' ? '→ Trifft verteidigende Typen:' : '← Wird getroffen von angreifenden Typen:'}
              </span>
            </div>
            {orderedKeys.filter(k => groups[k].length > 0).map(k => (
              <div key={k}>
                <p className={`text-sm font-semibold mb-1 ${
                  k === '2×' ? 'text-green-500' : k === '½×' ? 'text-red-400' : k === '0×' ? 'text-gray-500' : 'text-text-secondary'
                }`}>{labels[k]}</p>
                <div className="flex flex-wrap gap-2">
                  {groups[k].map(t => <TypeBadge key={t} type={t} />)}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Vollständige Tabelle */}
      {mode === 'full' && (
        <div className="overflow-x-auto">
          <p className="text-xs text-text-secondary mb-2">Zeile = Angreifer, Spalte = Verteidiger. Leere Zelle = 1×</p>
          <table className="border-collapse text-xs min-w-max">
            <thead>
              <tr>
                <th className="w-20 text-right pr-2 text-text-secondary text-xs pb-1">ANK \ DEF</th>
                {TYPE_NAMES.map(t => (
                  <th key={t} className="w-8 h-8 p-0">
                    <div className={`${TYPE_COLORS[t]} rounded text-[9px] font-semibold text-center leading-tight p-0.5`} style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)', width: '2rem', height: '4.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {t}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TYPE_NAMES.map(atk => (
                <tr key={atk}>
                  <td className="text-right pr-2 py-0.5">
                    <span className={`${TYPE_COLORS[atk]} rounded text-[9px] font-semibold px-1 py-0.5`}>{atk}</span>
                  </td>
                  {TYPE_NAMES.map(def => (
                    <EffCell key={def} value={typeEffectiveness[atk][def]} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="bg-green-500 text-white px-1.5 py-0.5 rounded">2×</span> Sehr effektiv</span>
            <span className="flex items-center gap-1"><span className="bg-red-400 text-white px-1.5 py-0.5 rounded">½×</span> Wenig effektiv</span>
            <span className="flex items-center gap-1"><span className="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">0×</span> Keine Wirkung</span>
          </div>
        </div>
      )}
    </div>
  );
}
