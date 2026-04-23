import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { formatAmount, scaleAmount } from '../lib/recipe';
import { NotFound } from './NotFound';
import type { Recipe } from '../types';

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(true);
  const [error, setError] = useState('');

  const [servings, setServings] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user?.is_member) { setLoadingRecipe(false); return; }
    api<Recipe>(`/recipes/${id}`)
      .then(r => {
        setRecipe(r);
        setServings(r.servings);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Fehler'))
      .finally(() => setLoadingRecipe(false));
  }, [id, user, loading]);

  async function handleDelete() {
    try {
      await api(`/recipes/${id}`, { method: 'DELETE' });
      navigate('/rezepte');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  if (loading || loadingRecipe) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  if (!user?.is_member) return <NotFound />;
  if (error || !recipe) return <NotFound />;

  const factor = servings / recipe.servings;
  const canEdit = user.is_admin || user.id === recipe.author_id;
  const canDelete = user.is_admin;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Zurück-Link */}
        <Link to="/rezepte" className="inline-block text-sm text-text-muted hover:text-text-primary mb-4">
          ← Zurück zu Rezepten
        </Link>

        {/* Titel + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl sm:text-3xl font-medium">{recipe.title}</h1>
          {(canEdit || canDelete) && (
            <div className="flex gap-2 shrink-0">
              {canEdit && (
                <Link to={`/rezepte/${recipe.id}/bearbeiten`}>
                  <button className="text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary transition-colors">
                    Bearbeiten
                  </button>
                </Link>
              )}
              {canDelete && (
                <button
                  onClick={() => setDeleteModal(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                >
                  Löschen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        <p className="text-xs text-text-hint mb-6">
          Von {recipe.author_name} · {new Date(recipe.created_at).toLocaleDateString('de-DE')}
        </p>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {recipe.tags.map(t => (
              <span
                key={t.id}
                className="text-xs px-2 py-1 rounded-full bg-bg-secondary text-text-muted"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {/* Bilder */}
        {recipe.images.length > 0 && (
          <div className="mb-8">
            <div className="aspect-[16/9] bg-bg-secondary rounded-lg overflow-hidden mb-2">
              <img
                src={recipe.images[activeImage]?.url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
            {recipe.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {recipe.images.map((img, idx) => (
                  <button
                    key={img.id ?? idx}
                    onClick={() => setActiveImage(idx)}
                    className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImage === idx ? 'border-accent' : 'border-transparent'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Portions-Regler */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-bg-secondary rounded-lg">
          <span className="text-sm text-text-muted">Portionen:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServings(s => Math.max(1, s - 1))}
              className="w-8 h-8 rounded-full border border-border bg-bg-primary hover:bg-bg-secondary text-lg leading-none flex items-center justify-center"
              aria-label="weniger"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-base font-medium">
              {servings}
            </span>
            <button
              onClick={() => setServings(s => s + 1)}
              className="w-8 h-8 rounded-full border border-border bg-bg-primary hover:bg-bg-secondary text-lg leading-none flex items-center justify-center"
              aria-label="mehr"
            >
              +
            </button>
          </div>
          <span className="text-sm text-text-muted">{recipe.servings_unit}</span>
          {servings !== recipe.servings && (
            <button
              onClick={() => setServings(recipe.servings)}
              className="ml-auto text-xs text-text-muted hover:text-text-primary underline"
            >
              Zurücksetzen
            </button>
          )}
        </div>

        {/* Zutaten + Schritte */}
        <div className="grid md:grid-cols-[1fr_2fr] gap-8">
          {/* Zutaten */}
          <div className="md:sticky md:top-20 self-start">
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
              Zutaten
            </h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-sm text-text-hint">Keine Zutaten angegeben.</p>
            ) : (
              <ul className="space-y-2">
                {recipe.ingredients.map(ing => {
                  const scaled = scaleAmount(ing.amount, factor);
                  return (
                    <li key={ing.id} className="flex gap-2 text-sm">
                      <span className="text-text-muted min-w-[4rem] shrink-0">
                        {scaled != null && formatAmount(scaled)} {ing.unit}
                      </span>
                      <span>{ing.name}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Zubereitung */}
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
              Zubereitung
            </h2>
            {recipe.steps.length === 0 ? (
              <p className="text-sm text-text-hint">Keine Schritte angegeben.</p>
            ) : (
              <ol className="space-y-6">
                {recipe.steps.map((step, idx) => (
                  <li key={step.id} className="flex gap-4">
                    <span className="shrink-0 w-8 h-8 rounded-full bg-accent text-bg-primary text-sm font-medium flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap pt-1">
                      {step.content}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {deleteModal && (
        <Modal
          title="Rezept löschen"
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du das Rezept <strong>{recipe.title}</strong> wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </Modal>
      )}
    </Layout>
  );
}
