import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Editor } from '../components/Editor';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { NotFound } from './NotFound';
import DOMPurify from 'dompurify';
import type { BlogPost as BlogPostType } from '../types';

export function BlogPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) {
      setLoading(false);
      return;
    }
    if (!id) return;
    api<BlogPostType>(`/blog/posts/${id}`)
      .then(p => {
        setPost(p);
        setEditTitle(p.title);
        setEditContent(p.content);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id, user, authLoading]);

  async function handleDelete() {
    try {
      await api(`/blog/posts/${id}`, { method: 'DELETE' });
      navigate('/blog');
    } catch {
      alert('Fehler beim Löschen');
    }
  }

  async function handleSave() {
    if (!editTitle.trim() || !editContent || editContent === '<p></p>') return;
    setSaving(true);
    try {
      await api(`/blog/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setPost(prev => prev ? { ...prev, title: editTitle, content: editContent } : null);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <Layout><div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12"><p className="text-text-muted">Lade...</p></div></Layout>;
  }

  if (!user?.is_admin) {
    return <NotFound />;
  }

  if (!post) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-center">
          <p className="text-text-muted mb-4">Beitrag nicht gefunden.</p>
          <Link to="/blog" className="text-text-primary underline">← Zurück zum Blog</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <Link to="/blog" className="text-sm text-text-muted hover:text-text-primary mb-8 inline-block">
          ← Zurück zum Blog
        </Link>

        {editing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-3xl font-medium px-0 py-2 border-b border-border bg-transparent focus:outline-none focus:border-text-primary"
            />
            <Editor content={editContent} onChange={setEditContent} />
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} className={saving ? 'opacity-50' : ''}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-4xl font-medium mb-2">{post.title}</h1>
            <p className="text-xs text-text-hint mb-8">
              {new Date(post.created_at).toLocaleDateString('de-DE')} · {post.author_name}
            </p>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />

            {user?.is_admin && (
              <div className="flex gap-3 mt-12 pt-8 border-t border-border">
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  Bearbeiten
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
                  Löschen
                </Button>
              </div>
            )}
          </>
        )}
      </article>

      {showDeleteModal && (
        <Modal
          title="Beitrag löschen"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du den Beitrag <strong>"{post.title}"</strong> wirklich löschen?
          </p>
        </Modal>
      )}
    </Layout>
  );
}
