import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_verified: boolean;
  avatar_url: string;
  created_at: string;
  last_login: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  guest: 'bg-yellow-100 text-yellow-800',
  member: 'bg-green-100 text-green-800',
  household: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
};

function formatLastLogin(iso: string | null): string {
  if (!iso) return 'Noch nie';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  if (diffDays === 1) return 'gestern';
  if (diffDays < 7) return `vor ${diffDays} Tagen`;
  return date.toLocaleDateString('de-DE');
}

export function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deleteModal, setDeleteModal] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (!user?.is_admin) return;
    loadUsers();
  }, [user]);

  async function loadUsers() {
    try {
      const data = await api<AdminUser[]>('/admin/users');
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function updateRole(userId: number, role: string) {
    try {
      await api(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    try {
      await api(`/admin/users/${deleteModal.id}`, { method: 'DELETE' });
      setDeleteModal(null);
      await loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  if (loadingUsers) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }

  const pendingUsers = users.filter(u => u.role === 'guest' && u.is_verified);

  return (
    <AdminLayout>
      {pendingUsers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
            ⏳ Warten auf Freigabe ({pendingUsers.length})
          </h2>
          <div className="bg-bg-primary rounded-lg border border-yellow-300 divide-y divide-border overflow-hidden">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} avatarUrl={u.avatar_url} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-text-hint truncate">{u.email}</p>
                    <p className="text-xs text-text-hint">
                      Registriert: {new Date(u.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateRole(u.id, 'member')}
                    className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    ✓ Freigeben
                  </button>
                  <button
                    onClick={() => setDeleteModal(u)}
                    className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
          Alle Nutzer ({users.length})
        </h2>

        {/* Mobile: Card-Liste */}
        <div className="md:hidden bg-bg-primary rounded-lg border border-border divide-y divide-border overflow-hidden">
          {users.map(u => (
            <div key={u.id} className="p-4 space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={u.name} avatarUrl={u.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-text-muted break-all">{u.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${u.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {u.is_verified ? 'Verifiziert' : 'Unverifiziert'}
                </span>
                <span className="text-text-hint">
                  Registriert: {new Date(u.created_at).toLocaleDateString('de-DE')}
                </span>
                <span className="text-text-hint">
                  Letzter Login: {formatLastLogin(u.last_login)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={u.role}
                  onChange={e => updateRole(u.id, e.target.value)}
                  disabled={u.id === user?.id}
                  className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${ROLE_COLORS[u.role]}`}
                >
                  <option value="guest">Gast</option>
                  <option value="member">Mitglied</option>
                  <option value="household">Haushalt</option>
                  <option value="admin">Admin</option>
                </select>
                {u.id !== user?.id && (
                  <button
                    onClick={() => setDeleteModal(u)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Tabelle */}
        <div className="hidden md:block bg-bg-primary rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Nutzer</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Email</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Status</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Rolle</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Registriert</th>
                <th className="text-left p-4 text-xs text-text-muted font-medium">Letzter Login</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-bg-secondary transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} avatarUrl={u.avatar_url} size="sm" />
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-text-muted">{u.email}</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {u.is_verified ? 'Verifiziert' : 'Unverifiziert'}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                      disabled={u.id === user?.id}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${ROLE_COLORS[u.role]}`}
                    >
                      <option value="guest">Gast</option>
                      <option value="member">Mitglied</option>
                      <option value="household">Haushalt</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-xs text-text-hint">
                    {new Date(u.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="p-4 text-xs text-text-hint">
                    {formatLastLogin(u.last_login)}
                  </td>
                  <td className="p-4">
                    {u.id !== user?.id && (
                      <button
                        onClick={() => setDeleteModal(u)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Löschen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {deleteModal && (
        <Modal
          title="Nutzer löschen"
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDelete}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du den Nutzer <strong>{deleteModal.name}</strong> ({deleteModal.email}) wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </Modal>
      )}
    </AdminLayout>
  );
}
