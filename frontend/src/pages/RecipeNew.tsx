import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RecipeForm } from '../components/RecipeForm';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { NotFound } from './NotFound';
import type { RecipeInput } from '../types';

export function RecipeNew() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  async function handleSubmit(data: RecipeInput) {
    const res = await api<{ id: number }>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    navigate(`/rezepte/${res.id}`);
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  if (!user?.is_member) return <NotFound />;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-8">Neues Rezept</h1>
        <RecipeForm submitLabel="Rezept speichern" onSubmit={handleSubmit} />
      </div>
    </Layout>
  );
}
