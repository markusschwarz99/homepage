import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import {
  listSeasonalItems,
  createSeasonalItem,
  updateSeasonalItem,
  deleteSeasonalItem,
} from '../api/seasonal';
import type {
  SeasonalItem,
  SeasonalItemInput,
  SeasonalCategory,
  SeasonalAvailability,
} from '../types';

const MONTH_NAMES = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const EMPTY_FORM: SeasonalItemInput = {
  name: '',
  category: 'fruit',
  months: [],
  availability: 'regional',
  notes: '',
};

export function SeasonalCalendarAdmin() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<SeasonalItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SeasonalItemInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function reload() {
    setLoadingData(true);
    setError(null);
    try {
      setItems(await listSeasonalItems());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (loading || !user?.is_admin) return;
    void reload();
  }, [user, loading]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(item: SeasonalItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      months: item.months,
      availability: item.availability,
      notes: item.notes ?? '',
    });
    setFormError(null);
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function toggleMonth(month: number) {
    setForm((prev) => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter((m) => m !== month)
        : [...prev.months, month].sort((a, b) => a - b),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Name ist erforderlich');
      return;
    }
    if (form.months.length === 0) {
      setFormError('Mindestens ein Monat muss ausgewählt sein');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      if (editingId === null) {
        await createSeasonalItem(payload);
      } else {
        await updateSeasonalItem(editingId, payload);
      }
      await reload();
      cancel();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: SeasonalItem) {
    if (!confirm(`Item "${item.name}" wirklich löschen?`)) return;
    try {
      await deleteSeasonalItem(item.id);
      await reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Fehler beim Löschen');
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          Saisonkalender
        </h2>
        <Button variant="primary" onClick={startCreate} data-testid="seasonal-create-btn">
          + Neues Item
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-bg-secondary border border-border rounded-lg p-6 mb-6"
          data-testid="seasonal-form"
        >
          <h3 className="text-lg font-medium mb-4">
            {editingId === null ? 'Neues Item' : 'Item bearbeiten'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm text-text-muted mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg"
                data-testid="seasonal-form-name"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm text-text-muted mb-1">
                Kategorie
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as SeasonalCategory })}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg"
                data-testid="seasonal-form-category"
              >
                <option value="fruit">Obst</option>
                <option value="vegetable">Gemüse</option>
              </select>
            </div>

            <div>
              <label htmlFor="availability" className="block text-sm text-text-muted mb-1">
                Verfügbarkeit
              </label>
              <select
                id="availability"
                value={form.availability}
                onChange={(e) =>
                  setForm({ ...form, availability: e.target.value as SeasonalAvailability })
                }
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg"
                data-testid="seasonal-form-availability"
              >
                <option value="regional">Regional</option>
                <option value="storage">Lagerware</option>
                <option value="import">Import</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-text-muted mb-2">Verfügbar in Monaten</label>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {MONTH_NAMES.map((name, idx) => {
                  const month = idx + 1;
                  const active = form.months.includes(month);
                  return (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(month)}
                      data-testid={`seasonal-form-month-${month}`}
                      className={`px-2 py-2 text-sm font-medium rounded border transition-colors ${
                        active
                          ? 'bg-accent text-bg-primary border-accent'
                          : 'bg-bg-primary text-text-primary border-border hover:bg-bg-tertiary'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm text-text-muted mb-1">
                Notizen (optional)
              </label>
              <textarea
                id="notes"
                value={form.notes ?? ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 bg-bg-primary border border-border rounded-lg"
                rows={2}
                maxLength={2000}
              />
            </div>
          </div>

          {formError && (
            <p className="mt-4 text-red-600 bg-red-50 p-3 rounded">{formError}</p>
          )}

          <div className="mt-6 flex gap-2">
            <Button type="submit" variant="primary" disabled={submitting} data-testid="seasonal-form-submit">
              {submitting ? 'Speichere…' : 'Speichern'}
            </Button>
            <Button type="button" variant="secondary" onClick={cancel}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      {loadingData && <p className="text-text-muted">Lädt…</p>}
      {error && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">Fehler: {error}</p>}

      {!loadingData && !error && (
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Kategorie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Monate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Verfügbarkeit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} data-testid="seasonal-row" data-item-id={item.id}>
                  <td className="px-4 py-3 font-medium text-text-primary">{item.name}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.category === 'fruit' ? 'Obst' : 'Gemüse'}
                  </td>
                  <td className="px-4 py-3 text-text-muted text-sm">
                    {item.months.map((m) => MONTH_NAMES[m - 1]).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {item.availability === 'regional'
                      ? 'Regional'
                      : item.availability === 'storage'
                        ? 'Lager'
                        : 'Import'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-sm text-text-primary hover:text-accent"
                      data-testid="seasonal-edit-btn"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="text-sm text-red-600 hover:text-red-800"
                      data-testid="seasonal-delete-btn"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
