import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RecipeForm } from '../components/RecipeForm';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { NotFound } from './NotFound';
import type { Recipe, RecipeInput } from '../types';

export function RecipeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user?.is_member) { setLoadingRecipe(false); return; }
    api<Recipe>(`/recipes/${id}`)
      .then(setRecipe)
      .finally(() => setLoadingRecipe(false));
  }, [id, user, loading]);

  async function handleSubmit(data: RecipeInput) {
    await api(`/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    navigate(`/rezepte/${id}`);
  }

  if (loading || loadingRecipe) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  if (!user?.is_member) return <NotFound />;
  if (!recipe) return <NotFound />;

  // Nur eigenes Rezept (oder Admin) bearbeiten
  const canEdit = user.is_admin || user.id === recipe.author_id;
  if (!canEdit) return <NotFound />;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-8">Rezept bearbeiten</h1>
        <RecipeForm initial={recipe} submitLabel="Änderungen speichern" onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
}
