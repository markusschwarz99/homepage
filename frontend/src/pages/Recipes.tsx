import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { NotFound } from './NotFound';
import type { RecipeSummary, TagCategory } from '../types';

export function Recipes() {
  const { user, loading } = useAuth();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);

  // Initiales Laden von Tag-Kategorien
  useEffect(() => {
    if (loading || !user?.is_member) return;
    api<TagCategory[]>('/tags')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [user, loading]);

  // Rezepte laden (bei Änderung von Suche/Tags)
  useEffect(() => {
    if (loading || !user?.is_member) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (selectedTags.size > 0) {
      params.set('tag_ids', [...selectedTags].join(','));
    }
    setLoadingData(true);
    const qs = params.toString();
    api<RecipeSummary[]>(`/recipes${qs ? '?' + qs : ''}`)
      .then(setRecipes)
      .finally(() => setLoadingData(false));
  }, [search, selectedTags, user, loading]);

  function toggleTag(id: number) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setSelectedTags(new Set());
    setSearch('');
  }

  const activeCount = selectedTags.size + (search.trim() ? 1 : 0);
  const hasAnyTags = useMemo(
    () => categories.some(c => c.tags.length > 0),
    [categories]
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  if (!user?.is_member) {
    return <NotFound />;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl sm:text-3xl font-medium">Rezepte</h1>
          <Link to="/rezepte/neu" className="shrink-0">
            <Button>+ Neues Rezept</Button>
          </Link>
        </div>

        {/* Suche */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen (Titel oder Zutat)..."
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
          />
          {hasAnyTags && (
            <button
              onClick={() => setFilterOpen(o => !o)}
              className="px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary transition-colors whitespace-nowrap"
            >
              Filter {activeCount > 0 && <span className="ml-1 text-xs bg-accent text-bg-primary px-1.5 py-0.5 rounded-full">{activeCount}</span>}
            </button>
          )}
        </div>

        {/* Filter-Panel */}
        {filterOpen && hasAnyTags && (
          <div className="mb-6 p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
            {categories.map(cat => cat.tags.length > 0 && (
              <div key={cat.id}>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                  {cat.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.tags.map(tag => {
                    const active = selectedTags.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                          active
                            ? 'bg-accent text-bg-primary'
                            : 'bg-bg-primary border border-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {activeCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-text-muted hover:text-text-primary underline"
              >
                Alle Filter zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Rezept-Grid */}
        {loadingData ? (
          <p className="text-text-muted">Lade Rezepte...</p>
        ) : recipes.length === 0 ? (
          <p className="text-center text-text-hint py-12">
            {activeCount > 0 ? 'Keine Rezepte gefunden.' : 'Noch keine Rezepte vorhanden.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {recipes.map(r => (
              <Link
                key={r.id}
                to={`/rezepte/${r.id}`}
                className="group bg-bg-primary border border-border rounded-lg overflow-hidden hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] bg-bg-secondary overflow-hidden">
                  {r.cover_image ? (
                    <img
                      src={r.cover_image}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text-hint text-4xl">
                      🍽
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-base font-medium mb-2 line-clamp-2">{r.title}</h2>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {r.tags.slice(0, 3).map(t => (
                        <span
                          key={t.id}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-muted"
                        >
                          {t.name}
                        </span>
                      ))}
                      {r.tags.length > 3 && (
                        <span className="text-[10px] text-text-hint">+{r.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-text-hint">
                    {r.servings} {r.servings_unit} · {r.author_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
