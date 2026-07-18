import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '../components/Toast';
import { api } from '../lib/api';
import type { RecipeSummary } from '../types';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'member', label: 'Member' },
  { value: 'household', label: 'Household' },
  { value: 'admin', label: 'Admin' },
];

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function AdminNewsletter() {
  const { show } = useToast();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<number>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api<RecipeSummary[]>('/recipes'),
      api<AdminUser[]>('/admin/users'),
    ])
      .then(([r, u]) => {
        if (cancelled) return;
        setRecipes(r);
        setUsers(u);
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter(r => r.title.toLowerCase().includes(q));
  }, [recipes, recipeSearch]);

  const recipientCount = useMemo(
    () => users.filter(u => selectedRoles.has(u.role) || selectedUserIds.has(u.id)).length,
    [users, selectedRoles, selectedUserIds]
  );

  const canSend =
    subject.trim().length > 0 && body.trim().length > 0 && recipientCount > 0 && !sending;

  async function handleSend() {
    setSending(true);
    try {
      const result = await api<{ sent: number; failed: number }>('/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          body,
          recipe_ids: [...selectedRecipeIds],
          user_ids: [...selectedUserIds],
          roles: [...selectedRoles],
        }),
      });
      if (result.failed > 0) {
        show(`Newsletter versendet: ${result.sent} erfolgreich, ${result.failed} fehlgeschlagen`, 'error');
      } else {
        show(`Newsletter an ${result.sent} Empfänger versendet`, 'success');
      }
      setSubject('');
      setBody('');
      setSelectedRecipeIds(new Set());
      setSelectedRoles(new Set());
      setSelectedUserIds(new Set());
    } catch (err) {
      show(err instanceof Error ? err.message : 'Fehler beim Versand', 'error');
    } finally {
      setSending(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted";

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }
  if (error) {
    return <AdminLayout><p className="text-sm text-red-600">{error}</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Inhalt
        </h2>
        <label className="block text-sm text-text-primary mb-2" htmlFor="newsletter_subject">
          Betreff
        </label>
        <input
          id="newsletter_subject"
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={200}
          className={inputClass}
        />
        <label className="block text-sm text-text-primary mt-4 mb-2" htmlFor="newsletter_body">
          E-Mail-Text
        </label>
        <p className="text-xs text-text-hint mb-3">
          Zeilenumbrüche werden in der Mail übernommen.
        </p>
        <textarea
          id="newsletter_body"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          maxLength={10000}
          className={inputClass}
        />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Rezepte anhängen
        </h2>
        <input
          type="text"
          value={recipeSearch}
          onChange={e => setRecipeSearch(e.target.value)}
          placeholder="Rezepte durchsuchen..."
          className={`${inputClass} mb-3`}
        />
        {filteredRecipes.length === 0 ? (
          <p className="text-sm text-text-hint">Keine Rezepte gefunden.</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
            {filteredRecipes.map(r => (
              <li key={r.id}>
                <label className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-bg-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRecipeIds.has(r.id)}
                    onChange={() => setSelectedRecipeIds(prev => toggleInSet(prev, r.id))}
                    className="accent-accent shrink-0"
                  />
                  <span>{r.title}</span>
                  <span className="text-xs text-text-hint ml-auto shrink-0">
                    von {r.author_name}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {selectedRecipeIds.size > 0 && (
          <p className="text-xs text-text-hint mt-2">
            {selectedRecipeIds.size} {selectedRecipeIds.size === 1 ? 'Rezept' : 'Rezepte'} ausgewählt
          </p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Empfänger
        </h2>
        <p className="text-sm text-text-primary mb-2">Nutzergruppen</p>
        <div className="flex flex-wrap gap-4 mb-4">
          {ROLE_OPTIONS.map(role => (
            <label key={role.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRoles.has(role.value)}
                onChange={() => setSelectedRoles(prev => toggleInSet(prev, role.value))}
                className="accent-accent"
              />
              {role.label}
            </label>
          ))}
        </div>
        <p className="text-sm text-text-primary mb-2">Einzelne Nutzer</p>
        <ul className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
          {users.map(u => (
            <li key={u.id}>
              <label className="flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg hover:bg-bg-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(u.id) || selectedRoles.has(u.role)}
                  onChange={() => setSelectedUserIds(prev => toggleInSet(prev, u.id))}
                  disabled={selectedRoles.has(u.role)}
                  className="accent-accent shrink-0"
                />
                <span className={selectedRoles.has(u.role) ? 'text-text-hint' : ''}>
                  {u.name}
                </span>
                <span className="text-xs text-text-hint truncate">{u.email}</span>
                <span className="text-xs text-text-hint ml-auto shrink-0">{u.role}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="px-4 py-2 text-sm rounded-lg bg-accent text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Versende...' : 'Newsletter versenden'}
        </button>
        <span className="text-sm text-text-muted">
          → {recipientCount} Empfänger
        </span>
      </div>
    </AdminLayout>
  );
}
