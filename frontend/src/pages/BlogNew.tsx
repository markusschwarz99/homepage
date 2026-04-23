import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Editor } from '../components/Editor';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { NotFound } from './NotFound';

export function BlogNew() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!content || content === '<p></p>') {
      setError('Bitte schreibe einen Inhalt');
      return;
    }
    try {
      await api('/blog/posts', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      navigate('/blog');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
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

  if (!user?.is_admin) {
    return <NotFound />;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-8">Neuer Beitrag</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-2">Titel</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-2">Inhalt</label>
            <Editor content={content} onChange={setContent} />
          </div>
          <Button type="submit" className="w-full mt-4">Veröffentlichen</Button>
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </form>
      </div>
    </Layout>
  );
}
