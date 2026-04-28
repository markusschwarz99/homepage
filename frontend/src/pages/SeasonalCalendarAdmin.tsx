import { useEffect, useMemo, useState, useCallback } from 'react';
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
  MonthAvailability,
} from '../types';

const MONTH_NAMES = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_SHORT = ['Jän', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

const AVAILABILITY_OPTIONS: Array<{ value: SeasonalAvailability; label: string; color: string; hex: string }> = [
  { value: 'regional', label: 'Saison', color: 'bg-green-600', hex: '#16a34a' },
  { value: 'storage', label: 'Lager', color: 'bg-amber-500', hex: '#f59e0b' },
  { value: 'import', label: 'Import', color: 'bg-sky-600', hex: '#0284c7' },
];

const AVAILABILITY_HEX: Record<SeasonalAvailability, string> = {
  regional: '#16a34a',
  storage: '#f59e0b',
  import: '#0284c7',
};

const AVAILABILITY_ORDER: Record<SeasonalAvailability, number> = {
  regional: 0,
  storage: 1,
  import: 2,
};

type MonthsState = Record<number, SeasonalAvailability[]>;

const EMPTY_MONTHS: MonthsState = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [i + 1, []]),
) as MonthsState;

interface FormState {
  name: string;
  category: SeasonalCategory;
  monthsState: MonthsState;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  category: 'fruit',
  monthsState: EMPTY_MONTHS,
  notes: '',
};

function availabilitiesToMonthsState(av: MonthAvailability[]): MonthsState {
  const state: MonthsState = { ...EMPTY_MONTHS };
  for (const entry of av) {
    state[entry.month] = [...entry.types];
  }
  return state;
}

function monthsStateToAvailabilities(state: MonthsState): MonthAvailability[] {
  const out: MonthAvailability[] = [];
  for (let m = 1; m <= 12; m++) {
    const types = state[m] ?? [];
    if (types.length > 0) {
      out.push({
        month: m,
        types: [...types].sort((a, b) => AVAILABILITY_ORDER[a] - AVAILABILITY_ORDER[b]),
      });
    }
  }
  return out;
}

export function SeasonalCalendarAdmin() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<SeasonalItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      setItems(await listSeasonalItems());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !user?.is_admin) return;
    void reload();
  }, [user, loading, reload]);

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
      monthsState: availabilitiesToMonthsState(item.availabilities),
      notes: item.notes ?? '',
    });
    setFormError(null);
    setShowForm(true);
  }

  const cancel = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }, []);

  // Esc schließt Modal + Body-Scroll-Lock
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) cancel();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showForm, submitting, cancel]);

  function toggleType(month: number, type: SeasonalAvailability) {
    setForm((prev) => {
      const current = prev.monthsState[month] ?? [];
      const next = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, monthsState: { ...prev.monthsState, [month]: next } };
    });
  }

  function clearAllMonths() {
    setForm((prev) => ({ ...prev, monthsState: EMPTY_MONTHS }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Name ist erforderlich');
      return;
    }
    const availabilities = monthsStateToAvailabilities(form.monthsState);
    if (availabilities.length === 0) {
      setFormError('Mindestens ein Monat muss eine Verfügbarkeit haben');
      return;
    }

    setSubmitting(true);
    try {
      const payload: SeasonalItemInput = {
        name: form.name.trim(),
        category: form.category,
        availabilities,
        notes: form.notes,
      };
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

  const filledMonthsCount = useMemo(
    () => Object.values(form.monthsState).filter((types) => types.length > 0).length,
    [form.monthsState],
  );

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

      {loadingData && <p className="text-text-muted">Lädt…</p>}
      {error && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">Fehler: {error}</p>}

      {!loadingData && !error && (
        <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Kategorie</th>
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
                  <td className="px-4 py-3">
                    <AvailabilityStrip item={item} />
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

      {showForm && (
        <FormModal
          title={editingId === null ? 'Neues Item' : 'Item bearbeiten'}
          onClose={cancel}
          submitting={submitting}
        >
          <form onSubmit={handleSubmit} data-testid="seasonal-form">
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
                  autoFocus
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

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-text-muted">
                    Verfügbarkeit pro Monat
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">
                      {filledMonthsCount} von 12 Monaten gepflegt
                    </span>
                    <button
                      type="button"
                      onClick={clearAllMonths}
                      className="text-xs text-text-muted hover:text-text-primary underline"
                      data-testid="seasonal-form-clear-months"
                    >
                      Alle leeren
                    </button>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-tertiary">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-text-muted text-xs uppercase">Monat</th>
                        {AVAILABILITY_OPTIONS.map((opt) => (
                          <th key={opt.value} className="px-3 py-2 font-medium text-text-muted text-xs uppercase">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`inline-block w-3 h-3 rounded-sm ${opt.color}`} />
                              {opt.label}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {MONTH_NAMES.map((name, idx) => {
                        const month = idx + 1;
                        const types = form.monthsState[month] ?? [];
                        return (
                          <tr key={month} data-testid={`seasonal-form-row-${month}`}>
                            <td className="px-3 py-2 font-medium">{name}</td>
                            {AVAILABILITY_OPTIONS.map((opt) => {
                              const active = types.includes(opt.value);
                              return (
                                <td key={opt.value} className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleType(month, opt.value)}
                                    data-testid={`seasonal-form-toggle-${month}-${opt.value}`}
                                    aria-pressed={active}
                                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                                      active
                                        ? `${opt.color} text-white border-transparent`
                                        : 'bg-bg-primary text-text-muted border-border hover:bg-bg-tertiary'
                                    }`}
                                  >
                                    {active ? '✓' : '–'}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm text-text-muted mb-1">
                  Notizen (optional)
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
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

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={cancel} disabled={submitting}>
                Abbrechen
              </Button>
              <Button type="submit" variant="primary" disabled={submitting} data-testid="seasonal-form-submit">
                {submitting ? 'Speichere…' : 'Speichern'}
              </Button>
            </div>
          </form>
        </FormModal>
      )}
    </AdminLayout>
  );
}

function FormModal({
  title,
  onClose,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seasonal-form-title"
      data-testid="seasonal-form-modal"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={() => !submitting && onClose()}
        aria-label="Schließen"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />
      {/* Dialog */}
      <div className="relative bg-bg-secondary border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h3 id="seasonal-form-title" className="text-lg font-medium">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function AvailabilityStrip({ item }: { item: SeasonalItem }) {
  return (
    <div className="grid grid-cols-12 gap-0.5 max-w-[280px]">
      {MONTH_SHORT.map((name, idx) => {
        const month = idx + 1;
        const types = (item.availabilities.find((a) => a.month === month)?.types ?? [])
          .slice()
          .sort((a, b) => AVAILABILITY_ORDER[a] - AVAILABILITY_ORDER[b]);

        const style: React.CSSProperties = (() => {
          if (types.length === 0) return {};
          if (types.length === 1) return { backgroundColor: AVAILABILITY_HEX[types[0]] };
          const stops: string[] = [];
          const step = 100 / types.length;
          types.forEach((t, i) => {
            stops.push(`${AVAILABILITY_HEX[t]} ${i * step}% ${(i + 1) * step}%`);
          });
          return { background: `linear-gradient(180deg, ${stops.join(', ')})` };
        })();

        const tooltip =
          types.length === 0
            ? `${name}: -`
            : `${name}: ${types.join(' + ')}`;

        return (
          <div
            key={month}
            title={tooltip}
            style={style}
            className={`h-5 text-[9px] flex items-center justify-center rounded ${
              types.length === 0 ? 'bg-bg-tertiary text-text-hint' : 'text-white'
            }`}
          >
            {name.charAt(0)}
          </div>
        );
      })}
    </div>
  );
}
