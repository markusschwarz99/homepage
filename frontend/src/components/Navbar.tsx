import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';

export function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const linkClass = "text-sm text-text-muted hover:text-text-primary transition-colors";
  const mobileLinkClass = "block py-3 text-lg text-text-primary border-b border-border";

  return (
    <>
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 bg-bg-secondary border-b border-border sticky top-0 z-50">
        <Link to="/" className="text-base font-medium text-text-primary whitespace-nowrap">
          Markus Schwarz
        </Link>

        <div className="hidden md:flex gap-6">
          <Link to="/impostor" className={linkClass}>Impostor</Link>
          {user && (
            <>
              {user.is_member && (
                <Link to="/rezepte" className={linkClass}>Rezepte</Link>
              )}
              {user.is_member && (
                <Link to="/saisonkalender" className={linkClass}>Saisonkalender</Link>
              )}
              {user.is_household && (
                <Link to="/einkaufsliste" className={linkClass}>Einkaufsliste</Link>
              )}
              {user.is_admin && (
                <Link to="/admin" className={linkClass}>Admin</Link>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              to="/account"
              className="hidden md:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-bg-primary transition-colors"
            >
              <span className="text-sm text-text-primary">{user.name}</span>
              <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden md:inline-block text-xs px-3.5 py-1.5 rounded-lg border border-border bg-transparent text-text-primary hover:bg-bg-primary transition-colors"
            >
              Login
            </Link>
          )}

          {user && (
            <Link to="/account" className="md:hidden">
              <Avatar name={user.name} avatarUrl={user.avatar_url} size="sm" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={open}
            className="md:hidden p-2 -mr-2 text-text-primary"
          >
            {open ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="md:hidden fixed inset-0 top-[57px] z-40 bg-bg-primary overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div className="px-6 py-4" onClick={e => e.stopPropagation()}>
            <Link to="/impostor" className={mobileLinkClass}>Impostor</Link>
            {user ? (
              <>
                {user.is_member && (
                  <Link to="/rezepte" className={mobileLinkClass}>Rezepte</Link>
                )}
                {user.is_member && (
                  <Link to="/saisonkalender" className={mobileLinkClass}>Saisonkalender</Link>
                )}
                {user.is_household && (
                  <Link to="/einkaufsliste" className={mobileLinkClass}>Einkaufsliste</Link>
                )}
                {user.is_admin && (
                  <Link to="/admin" className={mobileLinkClass}>Admin</Link>
                )}
                <Link to="/account" className={mobileLinkClass}>Mein Account</Link>
              </>
            ) : (
              <>
                <Link to="/login" className={mobileLinkClass}>Anmelden</Link>
                <Link to="/register" className={mobileLinkClass}>Registrieren</Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
