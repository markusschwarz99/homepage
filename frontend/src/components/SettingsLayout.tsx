import { type ReactNode, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Layout } from './Layout';
import { useAuth } from '../hooks/useAuth';

interface Props {
  children: ReactNode;
}

export function SettingsLayout({ children }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-accent text-bg-primary'
        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
    }`;

  if (loading || !user) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <p className="text-text-muted">Lade...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-medium mb-6">Einstellungen</h1>
        <div className="flex gap-2 mb-8 border-b border-border pb-4 overflow-x-auto">
          <NavLink to="/einstellungen/account" className={tabClass}>Mein Account</NavLink>
          {user.is_member && (
            <NavLink to="/einstellungen/improvements" className={tabClass}>Improvement erfassen</NavLink>
          )}
        </div>
        {children}
      </div>
    </Layout>
  );
}
