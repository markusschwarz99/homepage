import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

interface Props {
  children: ReactNode;
}

export function AdminLayout({ children }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user?.is_admin) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm rounded-lg transition-colors ${
      isActive
        ? 'bg-accent text-bg-primary'
        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
    }`;

  if (loading || !user?.is_admin) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-6">Admin Dashboard</h1>
        <div className="flex gap-2 mb-8 border-b border-border pb-4 overflow-x-auto">
          <NavLink to="/admin/users" className={tabClass}>Nutzer</NavLink>
          <NavLink to="/admin/tags" className={tabClass}>Tags</NavLink>
        </div>
        {children}
      </div>
    </Layout>
  );
}
