import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/Button';
import {
  adminListProjektreferenzen,
  adminCreateProjektreferenz,
  adminUpdateProjektreferenz,
  adminDeleteProjektreferenz,
} from '../api/projektreferenzen';
import type { ProjectReference } from '../types';

const EMPTY_FORM = {
  title: '',
  date_from: '',
  date_to: '',
  industry: '',
  contact: '',
  fte: '',
  topic: '',
  roles: '',
  responsibilities: '',
};

type FormState = typeof EMPTY_FORM;
type FormMode = 'none' | 'create' | 'edit';

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';
const labelClass = 'block text-sm font-medium mb-1';

function formatDate(iso: string | null): string {
  if (!iso) return 'aktuell';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function formatFte(fte: number): string {
  return fte % 1 === 0 ? `${fte}` : `${fte}`;
}

function refToForm(ref: ProjectReference): FormState {
  return {
    title: ref.title,
    date_from: ref.date_from,
    date_to: ref.date_to ?? '',
    industry: ref.industry,
    contact: ref.contact,
    fte: String(ref.fte),
    topic: ref.topic,
    roles: ref.roles,
    responsibilities: ref.responsibilities,
  };
}

export function AdminProjektreferenzen() {
  const [refs, setRefs] = useState<ProjectReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [mode, setMode] = useState<FormMode>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminListProjektreferenzen()
      .then(setRefs)
      .catch((e) => setListError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError('');
    setEditingId(null);
    setMode('create');
  }

  function openEdit(ref: ProjectReference) {
    setForm(refToForm(ref));
    setFormError('');
    setEditingId(ref.id);
    setMode('edit');
  }

  function closeForm() {
    setMode('none');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function buildPayload(): ProjectReferenceInput | null {
    const fte = parseFloat(form.fte);
    if (!form.title.trim()) { setFormError('Titel ist erforderlich'); return null; }
    if (!form.date_from) { setFormError('Von-Datum ist erforderlich'); return null; }
    if (!form.industry.trim()) { setFormError('Branche ist erforderlich'); return null; }
    if (!form.contact.trim()) { setFormError('Ansprechpartner ist erforderlich'); return null; }
    if (!form.fte || isNaN(fte) || fte <= 0) { setFormError('Umfang (FTE) muss > 0 sein'); return null; }
    if (!form.topic.trim()) { setFormError('Thema ist erforderlich'); return null; }
    if (!form.roles.trim()) { setFormError('Rolle(n) ist erforderlich'); return null; }
    if (!form.responsibilities.trim()) { setFormError('Verantwortlichkeiten sind erforderlich'); return null; }
    return {
      title: form.title.trim(),
      date_from: form.date_from,
      date_to: form.date_to || null,
      industry: form.industry.trim(),
      contact: form.contact.trim(),
      fte,
      topic: form.topic.trim(),
      roles: form.roles.trim(),
      responsibilities: form.responsibilities.trim(),
    };
  }

  async function submit() {
    setFormError('');
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const created = await adminCreateProjektreferenz(payload);
        setRefs((prev) => [created, ...prev]);
      } else if (mode === 'edit' && editingId !== null) {
        const updated = await adminUpdateProjektreferenz(editingId, payload);
        setRefs((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }
      closeForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteRef(ref: ProjectReference) {
    if (!confirm(`Projektreferenz "${ref.title}" wirklich löschen?`)) return;
    try {
      await adminDeleteProjektreferenz(ref.id);
      setRefs((prev) => prev.filter((r) => r.id !== ref.id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    }
  }

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          {mode === 'none'
            ? 'Projektreferenzen'
            : mode === 'create'
            ? 'Neue Referenz'
            : 'Referenz bearbeiten'}
        </h2>
        {mode === 'none' ? (
          <Button variant="primary" onClick={openCreate}>
            + Neue Referenz
          </Button>
        ) : (
          <button
            type="button"
            onClick={closeForm}
            disabled={submitting}
            className="text-sm text-text-muted hover:text-text-primary"
          >
            Abbrechen
          </button>
        )}
      </div>

      {listError && (
        <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{listError}</p>
      )}

      {/* ---------- Formular ---------- */}
      {mode !== 'none' && (
        <div className="rounded-lg border border-border bg-bg-secondary p-5 mb-8 space-y-4">
          <div>
            <label className={labelClass}>Titel *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              maxLength={200}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Zeitraum von *</label>
              <input
                type="date"
                value={form.date_from}
                onChange={(e) => set('date_from', e.target.value)}
                disabled={submitting}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Zeitraum bis</label>
              <input
                type="date"
                value={form.date_to}
                onChange={(e) => set('date_to', e.target.value)}
                disabled={submitting}
                className={inputClass}
              />
              <p className="text-xs text-text-muted mt-1">Leer lassen wenn laufend</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Branche *</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                maxLength={200}
                disabled={submitting}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner *</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => set('contact', e.target.value)}
                maxLength={200}
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Umfang (FTE) *</label>
              <input
                type="number"
                value={form.fte}
                onChange={(e) => set('fte', e.target.value)}
                step="0.1"
                min="0.1"
                disabled={submitting}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Thema *</label>
            <input
              type="text"
              value={form.topic}
              onChange={(e) => set('topic', e.target.value)}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Rolle(n) *</label>
            <input
              type="text"
              value={form.roles}
              onChange={(e) => set('roles', e.target.value)}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Verantwortlichkeiten *</label>
            <textarea
              value={form.responsibilities}
              onChange={(e) => set('responsibilities', e.target.value)}
              rows={4}
              disabled={submitting}
              placeholder="Eine Verantwortlichkeit pro Zeile"
              className={inputClass}
            />
            <p className="text-xs text-text-muted mt-1">
              Jede Zeile wird als Aufzählungspunkt angezeigt.
            </p>
          </div>

          {formError && <p className="text-red-600 text-sm">{formError}</p>}

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Speichere...' : mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Liste ---------- */}
      {mode === 'none' && (
        refs.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Projektreferenzen angelegt.</p>
        ) : (
          <div className="space-y-3">
            {refs.map((ref) => (
              <div
                key={ref.id}
                className="rounded-lg border border-border bg-bg-secondary p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ref.title}</p>
                    <p className="text-sm text-text-muted mt-0.5">
                      {formatDate(ref.date_from)} – {formatDate(ref.date_to)}
                      {' · '}
                      {ref.industry}
                      {' · '}
                      {formatFte(ref.fte)} FTE
                    </p>
                    <p className="text-sm text-text-muted">{ref.topic}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(ref)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRef(ref)}
                      className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>

                {/* Verantwortlichkeiten als Aufzählung */}
                {ref.responsibilities && (
                  <ul className="mt-3 space-y-0.5 pl-4 list-disc text-sm text-text-muted">
                    {ref.responsibilities
                      .split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
                      .map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </AdminLayout>
  );
}
