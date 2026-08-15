import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '../components/Toast';
import {
  listImprovements,
  updateImprovementStatus,
  deleteImprovement,
  type Improvement,
  type ImprovementCategory,
  type ImprovementStatus,
} from '../api/improvements';

const CATEGORY_LABELS: Record<ImprovementCategory, string> = {
  bug: 'Bug',
  idee: 'Idee',
  sonstiges: 'Sonstiges',
};

const STATUS_OPTIONS: { value: ImprovementStatus; label: string }[] = [
  { value: 'offen', label: 'Offen' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'erledigt', label: 'Erledigt' },
  { value: 'abgelehnt', label: 'Abgelehnt' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function AdminImprovements() {
  const { show } = useToast();
  const [items, setItems] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listImprovements()
      .then(data => { if (!cancelled) setItems(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleStatusChange(id: number, status: ImprovementStatus) {
    try {
      const updated = await updateImprovementStatus(id, status);
      setItems(prev => prev.map(i => (i.id === id ? updated : i)));
    } catch (err) {
      show(err instanceof Error ? err.message : 'Fehler beim Aktualisieren', 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Diesen Vorschlag wirklich löschen?')) return;
    try {
      await deleteImprovement(id);
      setItems(prev => prev.filter(i => i.id !== id));
      show('Vorschlag gelöscht', 'success');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Fehler beim Löschen', 'error');
    }
  }

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }
  if (error) {
    return <AdminLayout><p className="text-sm text-red-600">{error}</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
        Improvements ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-text-hint">Noch keine Vorschläge eingegangen.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(imp => (
            <li key={imp.id} className="bg-bg-primary border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-muted">
                      {CATEGORY_LABELS[imp.category]}
                    </span>
                    <h3 className="text-sm font-medium text-text-primary">{imp.title}</h3>
                  </div>
                  <p className="text-xs text-text-hint mt-1">
                    {imp.submitter_name ?? 'Gelöschter Nutzer'}
                    {imp.submitter_email ? ` · ${imp.submitter_email}` : ''}
                    {imp.created_at ? ` · ${formatDate(imp.created_at)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(imp.id)}
                  className="text-xs text-red-600 hover:underline shrink-0"
                >
                  Löschen
                </button>
              </div>
              <p className="text-sm text-text-primary whitespace-pre-wrap mb-3">{imp.description}</p>
              <label className="text-xs text-text-muted mr-2">Status:</label>
              <select
                value={imp.status}
                onChange={e => handleStatusChange(imp.id, e.target.value as ImprovementStatus)}
                className="px-2 py-1 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
}
