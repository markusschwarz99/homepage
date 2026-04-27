import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { listSeasonalItems } from '../api/seasonal';
import { NotFound } from './NotFound';
import type { SeasonalItem, SeasonalCategory, SeasonalAvailability } from '../types';

const MONTH_NAMES = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const AVAILABILITY_LABEL: Record<SeasonalAvailability, string> = {
  regional: 'Regional',
  storage: 'Lagerware',
  import: 'Import',
};

type ViewMode = 'current' | 'month' | 'year';

export function SeasonalCalendar() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<SeasonalItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().getMonth() + 1;
  const [viewMode, setViewMode] = useState<ViewMode>('current');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<SeasonalCategory | 'all'>('all');

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
      if (viewMode === 'current' && !item.months.includes(currentMonth)) return false;
      if (viewMode === 'month' && !item.months.includes(selectedMonth)) return false;
      return true;
    });
  }, [items, categoryFilter, viewMode, selectedMonth, currentMonth]);

  const fruits = filteredItems.filter((i) => i.category === 'fruit');
  const vegetables = filteredItems.filter((i) => i.category === 'vegetable');

  if (loading) return null;
  if (!user?.is_member) return <NotFound />;

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
                  <CategorySection title="Obst" items={fruits} />
                )}
                {(categoryFilter === 'all' || categoryFilter === 'vegetable') && vegetables.length > 0 && (
                  <CategorySection title="Gemüse" items={vegetables} />
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

function CategorySection({ title, items }: { title: string; items: SeasonalItem[] }) {
  return (
    <section>
      <h2 className="text-xl font-medium text-text-primary mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ItemCard({ item }: { item: SeasonalItem }) {
  const currentMonth = new Date().getMonth() + 1;

  const colorForAvailability = (avail: SeasonalAvailability) =>
    avail === 'regional' ? 'bg-green-600' : avail === 'storage' ? 'bg-amber-500' : 'bg-text-muted';

  return (
    <article
      className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent transition-colors"
      data-testid="seasonal-item-card"
      data-item-name={item.name}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-text-primary">{item.name}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full text-white ${colorForAvailability(
            item.availability,
          )}`}
        >
          {AVAILABILITY_LABEL[item.availability]}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-0.5 mb-3" aria-label="Saisonale Monate">
        {MONTH_NAMES.map((name, idx) => {
          const month = idx + 1;
          const active = item.months.includes(month);
          const isCurrent = month === currentMonth;
          return (
            <div
              key={month}
              title={name}
              className={`h-6 text-[10px] flex items-center justify-center rounded ${
                active ? `${colorForAvailability(item.availability)} text-white` : 'bg-bg-tertiary text-text-hint'
              } ${isCurrent ? 'ring-2 ring-accent' : ''}`}
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
