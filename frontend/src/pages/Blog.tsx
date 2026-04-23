import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { htmlToExcerpt } from '../lib/excerpt';
import { NotFound } from './NotFound';
import type { BlogPost } from '../types';

export function Blog() {
  const { user, loading } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user?.is_admin) {
      setLoadingPosts(false);
      return;
    }
    api<BlogPost[]>('/blog/posts')
      .then(setPosts)
      .finally(() => setLoadingPosts(false));
  }, [user, loading]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  // Nicht-Admins (inkl. nicht eingeloggt) sehen 404
  if (!user?.is_admin) {
    return <NotFound />;
  }

  if (loadingPosts) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8 gap-3">
          <h1 className="text-2xl sm:text-3xl font-medium">Blog</h1>
          <Link to="/blog/neu" className="shrink-0">
            <Button>+ Neuer Post</Button>
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-text-hint py-12">Noch keine Beiträge vorhanden.</p>
        ) : (
          <div className="divide-y divide-border">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="block py-6 hover:opacity-70 transition-opacity"
              >
                <h2 className="text-xl font-medium mb-1">{post.title}</h2>
                <p className="text-xs text-text-hint mb-2">
                  {new Date(post.created_at).toLocaleDateString('de-DE')} · {post.author_name}
                </p>
                <p className="text-sm text-text-muted">
                  {htmlToExcerpt(post.content, 150)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
