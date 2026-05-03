import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { listSeasonalItems } from '../api/seasonal';
import { NotFound } from './NotFound';
import type {
  SeasonalItem,
  SeasonalCategory,
  SeasonalAvailability,

} from '../types';

const MONTH_NAMES = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const AVAILABILITY_LABEL: Record<SeasonalAvailability, string> = {
  regional: 'Saison',
  storage: 'Lagerware',
};

const AVAILABILITY_COLOR: Record<SeasonalAvailability, string> = {
  regional: 'bg-green-600',
  storage: 'bg-amber-500',
};

// Hex-Werte für inline gradient backgrounds (entsprechen den Tailwind-Farben oben)
const AVAILABILITY_HEX: Record<SeasonalAvailability, string> = {
  regional: '#16a34a',
  storage: '#f59e0b',
};

const AVAILABILITY_ORDER: Record<SeasonalAvailability, number> = {
  regional: 0,
  storage: 1,
};

type ViewMode = 'current' | 'month' | 'year';
type AvailabilityFilter = 'all' | SeasonalAvailability;

function getAvailabilityForMonth(item: SeasonalItem, month: number): SeasonalAvailability[] {
  return item.availabilities.find((a) => a.month === month)?.types ?? [];
}

function hasAvailability(item: SeasonalItem, month: number): boolean {
  return getAvailabilityForMonth(item, month).length > 0;
}

function hasAvailabilityType(item: SeasonalItem, month: number, type: SeasonalAvailability): boolean {
  return getAvailabilityForMonth(item, month).includes(type);
}

function sortTypes(types: SeasonalAvailability[]): SeasonalAvailability[] {
  return [...types].sort((a, b) => AVAILABILITY_ORDER[a] - AVAILABILITY_ORDER[b]);
}

export function SeasonalCalendar() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<SeasonalItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<SeasonalCategory | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');

  useEffect(() => {
    if (loading || !user?.is_member) return;
    setLoadingData(true);
    setError(null);
    listSeasonalItems()
      .then(setItems)
      .catch((e) => setError(e.message ?? 'Fehler beim Laden'))
      .finally(() => setLoadingData(false));
  }, [user, loading]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;

      // Monat-Filter (außer im Year-Modus)
      const monthToCheck = viewMode === 'current' ? currentMonth : viewMode === 'month' ? selectedMonth : null;

      if (monthToCheck !== null) {
        if (availabilityFilter === 'all') {
          if (!hasAvailability(item, monthToCheck)) return false;
        } else {
          if (!hasAvailabilityType(item, monthToCheck, availabilityFilter)) return false;
        }
      } else {
        // Year-Modus: filter auf availabilityFilter über alle Monate
        if (availabilityFilter !== 'all') {
          const matches = item.availabilities.some((a) => a.types.includes(availabilityFilter));
          if (!matches) return false;
        }
      }

      return true;
    });
  }, [items, categoryFilter, viewMode, selectedMonth, currentMonth, availabilityFilter]);

  const fruits = filteredItems.filter((i) => i.category === 'fruit');
  const vegetables = filteredItems.filter((i) => i.category === 'vegetable');

  if (loading) return null;
  if (!user?.is_member) return <NotFound />;

  const referenceMonth = viewMode === 'year' ? null : viewMode === 'current' ? currentMonth : selectedMonth;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-medium text-text-primary">Saisonkalender</h1>
            <p className="text-text-muted mt-1">
              Welches Obst und Gemüse hat gerade in unserer Region Saison.
            </p>
          </div>
          {user.is_admin && (
            <Link to="/admin/saisonkalender" data-testid="seasonal-admin-link">
              <Button variant="secondary">Verwalten</Button>
            </Link>
          )}
        </div>

        <div className="bg-bg-secondary border border-border rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-6">
            <div>
              <label className="block text-sm text-text-muted mb-2">Ansicht</label>
              <div className="inline-flex rounded-lg overflow-hidden border border-border">
                <ViewBtn active={viewMode === 'current'} onClick={() => setViewMode('current')} testid="view-current">
                  Aktueller Monat
                </ViewBtn>
                <ViewBtn active={viewMode === 'month'} onClick={() => setViewMode('month')} testid="view-month">
                  Monat wählen
                </ViewBtn>
                <ViewBtn active={viewMode === 'year'} onClick={() => setViewMode('year')} testid="view-year">
                  Ganzes Jahr
                </ViewBtn>
              </div>
            </div>

            {viewMode === 'month' && (
              <div>
                <label htmlFor="month-select" className="block text-sm text-text-muted mb-2">
                  Monat
                </label>
                <select
                  id="month-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-sm"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm text-text-muted mb-2">Kategorie</label>
              <div className="inline-flex rounded-lg overflow-hidden border border-border">
                <ViewBtn active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
                  Alle
                </ViewBtn>
                <ViewBtn active={categoryFilter === 'fruit'} onClick={() => setCategoryFilter('fruit')}>
                  Obst
                </ViewBtn>
                <ViewBtn active={categoryFilter === 'vegetable'} onClick={() => setCategoryFilter('vegetable')}>
                  Gemüse
                </ViewBtn>
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Verfügbarkeit</label>
              <div className="inline-flex rounded-lg overflow-hidden border border-border">
                <ViewBtn
                  active={availabilityFilter === 'all'}
                  onClick={() => setAvailabilityFilter('all')}
                  testid="avail-all"
                >
                  Alle
                </ViewBtn>
                <ViewBtn
                  active={availabilityFilter === 'regional'}
                  onClick={() => setAvailabilityFilter('regional')}
                  testid="avail-regional"
                >
                  Saison
                </ViewBtn>
                <ViewBtn
                  active={availabilityFilter === 'storage'}
                  onClick={() => setAvailabilityFilter('storage')}
                  testid="avail-storage"
                >
                  Lager
                </ViewBtn>
              </div>
            </div>
          </div>

          {/* Legende */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
            <LegendDot type="regional" /> <LegendDot type="storage" />
          </div>
        </div>

        {loadingData && <p className="text-text-muted">Lädt…</p>}
        {error && <p className="text-red-600 bg-red-50 p-4 rounded">Fehler: {error}</p>}

        {!loadingData && !error && (
          <>
            {filteredItems.length === 0 ? (
              <p className="text-text-muted italic">Keine Items für diese Auswahl.</p>
            ) : (
              <div className="space-y-8">
                {(categoryFilter === 'all' || categoryFilter === 'fruit') && fruits.length > 0 && (
                  <CategorySection title="Obst" items={fruits} referenceMonth={referenceMonth} />
                )}
                {(categoryFilter === 'all' || categoryFilter === 'vegetable') && vegetables.length > 0 && (
                  <CategorySection title="Gemüse" items={vegetables} referenceMonth={referenceMonth} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function ViewBtn({
  active,
  onClick,
  children,
  testid,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-accent text-bg-primary'
          : 'bg-transparent text-text-primary hover:bg-bg-tertiary'
      }`}
    >
      {children}
    </button>
  );
}

function LegendDot({ type }: { type: SeasonalAvailability }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm ${AVAILABILITY_COLOR[type]}`} />
      {AVAILABILITY_LABEL[type]}
    </span>
  );
}

function CategorySection({
  title,
  items,
  referenceMonth,
}: {
  title: string;
  items: SeasonalItem[];
  referenceMonth: number | null;
}) {
  return (
    <section>
      <h2 className="text-xl font-medium text-text-primary mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} referenceMonth={referenceMonth} />
        ))}
      </div>
    </section>
  );
}

function ItemCard({ item, referenceMonth }: { item: SeasonalItem; referenceMonth: number | null }) {
  const currentMonth = new Date().getMonth() + 1;
  // Im Year-Modus zeigen wir den aktuellen Monat als "current", aber kein Badge
  const badgeMonth = referenceMonth;
  const badgeTypes = badgeMonth !== null ? sortTypes(getAvailabilityForMonth(item, badgeMonth)) : [];

  return (
    <article
      className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent transition-colors"
      data-testid="seasonal-item-card"
      data-item-name={item.name}
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <h3 className="font-medium text-text-primary">{item.name}</h3>
        {badgeTypes.length > 0 && (
          <div className="flex gap-1 flex-wrap justify-end">
            {badgeTypes.map((t) => (
              <span
                key={t}
                className={`text-[10px] px-2 py-0.5 rounded-full text-white whitespace-nowrap ${AVAILABILITY_COLOR[t]}`}
              >
                {AVAILABILITY_LABEL[t]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-0.5 mb-3" aria-label="Saisonale Monate">
        {MONTH_NAMES.map((name, idx) => {
          const month = idx + 1;
          const types = sortTypes(getAvailabilityForMonth(item, month));
          const isCurrent = month === currentMonth;
          const isReference = referenceMonth !== null && month === referenceMonth;

          // Hintergrund: gradient bei mehreren Types, solid bei einem, neutral bei keinem
          const backgroundStyle: React.CSSProperties = (() => {
            if (types.length === 0) return {};
            if (types.length === 1) return { backgroundColor: AVAILABILITY_HEX[types[0]] };
            // Vertikale Streifen via linear-gradient
            const stops: string[] = [];
            const step = 100 / types.length;
            types.forEach((t, i) => {
              const start = i * step;
              const end = (i + 1) * step;
              stops.push(`${AVAILABILITY_HEX[t]} ${start}% ${end}%`);
            });
            return { background: `linear-gradient(180deg, ${stops.join(', ')})` };
          })();

          const tooltip =
            types.length === 0
              ? `${name}: nicht verfügbar`
              : `${name}: ${types.map((t) => AVAILABILITY_LABEL[t]).join(' + ')}`;

          return (
            <div
              key={month}
              title={tooltip}
              data-month={month}
              data-types={types.join(',')}
              style={backgroundStyle}
              className={`h-6 text-[10px] flex items-center justify-center rounded ${
                types.length === 0 ? 'bg-bg-tertiary text-text-hint' : 'text-white'
              } ${isCurrent ? 'ring-2 ring-accent' : ''} ${isReference && !isCurrent ? 'ring-1 ring-accent/60' : ''}`}
            >
              {name.charAt(0)}
            </div>
          );
        })}
      </div>

      {item.notes && <p className="text-sm text-text-muted mt-2">{item.notes}</p>}
    </article>
  );
}
