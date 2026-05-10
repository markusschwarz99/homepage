import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { CVDocument } from '../components/CVDocument';
import { useAuth } from '../hooks/useAuth';
import {
  getCVProfile,
  updateCVProfile,
  listCVExperiences,
  createCVExperience,
  updateCVExperience,
  deleteCVExperience,
  listCVLanguages,
  createCVLanguage,
  updateCVLanguage,
  deleteCVLanguage,
  listCVCertificates,
  createCVCertificate,
  updateCVCertificate,
  deleteCVCertificate,
  listCVEducations,
  createCVEducation,
  updateCVEducation,
  deleteCVEducation,
} from '../api/cv';
import {
  adminListProjektreferenzen,
  adminCreateProjektreferenz,
  adminUpdateProjektreferenz,
  adminDeleteProjektreferenz,
} from '../api/projektreferenzen';
import type {
  CVProfile,
  CVExperience,
  CVLanguage,
  CVCertificate,
  CVEducation,
  ProjectReference,
  ProjectReferenceInput,
} from '../types';

type CVTab = 'personal' | 'experience' | 'skills' | 'education' | 'projects' | 'overview';

const TAB_LABELS: Record<CVTab, string> = {
  personal: 'Persönliches',
  experience: 'Berufliche Tätigkeiten',
  skills: 'Fähigkeiten & Zertifikate',
  education: 'Ausbildung & Studium',
  projects: 'Projektreferenzen',
  overview: 'Übersicht & Export',
};

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';
const labelClass = 'block text-sm font-medium mb-1';

function formatDate(iso: string | null): string {
  if (!iso) return 'aktuell';
  const [y, m] = iso.split('-');
  return `${m}/${y}`;
}

// ────────────────────── Persönliches ──────────────────────

function PersonalTab() {
  const [form, setForm] = useState({ vorname: '', nachname: '', geburtsdatum: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCVProfile().then((p) => {
      if (p) {
        setForm({
          vorname: p.vorname ?? '',
          nachname: p.nachname ?? '',
          geburtsdatum: p.geburtsdatum ?? '',
        });
      }
    });
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateCVProfile({
        vorname: form.vorname.trim() || null,
        nachname: form.nachname.trim() || null,
        geburtsdatum: form.geburtsdatum || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Vorname</label>
          <input
            type="text"
            value={form.vorname}
            onChange={(e) => setForm((f) => ({ ...f, vorname: e.target.value }))}
            maxLength={100}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Nachname</label>
          <input
            type="text"
            value={form.nachname}
            onChange={(e) => setForm((f) => ({ ...f, nachname: e.target.value }))}
            maxLength={100}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Geburtsdatum</label>
        <input
          type="date"
          value={form.geburtsdatum}
          onChange={(e) => setForm((f) => ({ ...f, geburtsdatum: e.target.value }))}
          className={inputClass}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Speichere...' : 'Speichern'}
        </Button>
        {saved && <span className="text-sm text-green-600">Gespeichert</span>}
      </div>
    </div>
  );
}

// ────────────────────── Berufliche Tätigkeiten ──────────────────────

type ExpForm = { date_from: string; date_to: string; rolle: string; beschreibung: string };
const EMPTY_EXP: ExpForm = { date_from: '', date_to: '', rolle: '', beschreibung: '' };

function ExperienceTab() {
  const [items, setItems] = useState<CVExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpForm>(EMPTY_EXP);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listCVExperiences()
      .then(setItems)
      .catch((e) => setListError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm(EMPTY_EXP);
    setFormError('');
    setEditingId(null);
    setMode('create');
  }

  function openEdit(item: CVExperience) {
    setForm({ date_from: item.date_from, date_to: item.date_to ?? '', rolle: item.rolle, beschreibung: item.beschreibung });
    setFormError('');
    setEditingId(item.id);
    setMode('edit');
  }

  function closeForm() {
    setMode('none');
    setEditingId(null);
    setForm(EMPTY_EXP);
    setFormError('');
  }

  async function submit() {
    if (!form.date_from) { setFormError('Von-Datum ist erforderlich'); return; }
    if (!form.rolle.trim()) { setFormError('Rolle ist erforderlich'); return; }
    if (!form.beschreibung.trim()) { setFormError('Beschreibung ist erforderlich'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        date_from: form.date_from,
        date_to: form.date_to || null,
        rolle: form.rolle.trim(),
        beschreibung: form.beschreibung.trim(),
        sort_order: 0,
      };
      if (mode === 'create') {
        await createCVExperience(payload);
      } else if (mode === 'edit' && editingId !== null) {
        await updateCVExperience(editingId, payload);
      }
      closeForm();
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem(item: CVExperience) {
    if (!confirm(`Eintrag "${item.rolle}" wirklich löschen?`)) return;
    try {
      await deleteCVExperience(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    }
  }

  if (loading) return <p className="text-text-muted">Lade...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          {mode === 'none' ? 'Berufliche Tätigkeiten' : mode === 'create' ? 'Neue Tätigkeit' : 'Tätigkeit bearbeiten'}
        </h2>
        {mode === 'none' ? (
          <Button variant="primary" onClick={openCreate}>+ Neue Tätigkeit</Button>
        ) : (
          <button type="button" onClick={closeForm} disabled={submitting} className="text-sm text-text-muted hover:text-text-primary">
            Abbrechen
          </button>
        )}
      </div>

      {listError && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{listError}</p>}

      {mode !== 'none' && (
        <div className="rounded-lg border border-border bg-bg-secondary p-5 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Von *</label>
              <input type="date" value={form.date_from} onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))} disabled={submitting} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bis</label>
              <input type="date" value={form.date_to} onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))} disabled={submitting} className={inputClass} />
              <p className="text-xs text-text-muted mt-1">Leer lassen wenn laufend</p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Rolle *</label>
            <input type="text" value={form.rolle} onChange={(e) => setForm((f) => ({ ...f, rolle: e.target.value }))} maxLength={200} disabled={submitting} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Beschreibung *</label>
            <textarea value={form.beschreibung} onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))} rows={5} disabled={submitting} placeholder="Eine Aufgabe/Leistung pro Zeile" className={inputClass} />
            <p className="text-xs text-text-muted mt-1">Jede Zeile wird als Aufzählungspunkt angezeigt.</p>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Speichere...' : mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      {mode === 'none' && (
        items.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Einträge.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.rolle}</p>
                    <p className="text-sm text-text-muted mt-0.5">
                      {formatDate(item.date_from)} – {formatDate(item.date_to)}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary">Bearbeiten</button>
                    <button type="button" onClick={() => deleteItem(item)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50">Löschen</button>
                  </div>
                </div>
                {item.beschreibung && (
                  <ul className="mt-3 space-y-0.5 pl-4 list-disc text-sm text-text-muted">
                    {item.beschreibung.split('\n').map((l) => l.trim()).filter((l) => l).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ────────────────────── Fähigkeiten & Zertifikate ──────────────────────

function SkillsTab() {
  const [languages, setLanguages] = useState<CVLanguage[]>([]);
  const [certs, setCerts] = useState<CVCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Sprachen-Form
  const [langMode, setLangMode] = useState<'none' | 'create' | 'edit'>('none');
  const [langEditId, setLangEditId] = useState<number | null>(null);
  const [langForm, setLangForm] = useState({ sprache: '', niveau: '' });
  const [langError, setLangError] = useState('');
  const [langSubmitting, setLangSubmitting] = useState(false);

  // Zertifikate-Form
  const [certMode, setCertMode] = useState<'none' | 'create' | 'edit'>('none');
  const [certEditId, setCertEditId] = useState<number | null>(null);
  const [certForm, setCertForm] = useState({ name: '', jahr: String(new Date().getFullYear()) });
  const [certError, setCertError] = useState('');
  const [certSubmitting, setCertSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listCVLanguages(), listCVCertificates()])
      .then(([langs, cs]) => { setLanguages(langs); setCerts(cs); })
      .catch((e) => setListError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Sprachen ──
  async function submitLang() {
    if (!langForm.sprache.trim()) { setLangError('Sprache ist erforderlich'); return; }
    if (!langForm.niveau.trim()) { setLangError('Niveau ist erforderlich'); return; }
    setLangError('');
    setLangSubmitting(true);
    try {
      const payload = { sprache: langForm.sprache.trim(), niveau: langForm.niveau.trim(), sort_order: 0 };
      if (langMode === 'create') {
        const created = await createCVLanguage(payload);
        setLanguages((prev) => [...prev, created]);
      } else if (langMode === 'edit' && langEditId !== null) {
        const updated = await updateCVLanguage(langEditId, payload);
        setLanguages((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      }
      setLangMode('none');
      setLangEditId(null);
      setLangForm({ sprache: '', niveau: '' });
    } catch (e) {
      setLangError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setLangSubmitting(false);
    }
  }

  async function deleteLang(item: CVLanguage) {
    if (!confirm(`Sprache "${item.sprache}" löschen?`)) return;
    try {
      await deleteCVLanguage(item.id);
      setLanguages((prev) => prev.filter((l) => l.id !== item.id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  function openEditLang(item: CVLanguage) {
    setLangForm({ sprache: item.sprache, niveau: item.niveau });
    setLangError('');
    setLangEditId(item.id);
    setLangMode('edit');
  }

  // ── Zertifikate ──
  async function submitCert() {
    if (!certForm.name.trim()) { setCertError('Name ist erforderlich'); return; }
    const jahr = parseInt(certForm.jahr, 10);
    if (isNaN(jahr) || jahr < 1900 || jahr > 2100) { setCertError('Jahr ungültig'); return; }
    setCertError('');
    setCertSubmitting(true);
    try {
      const payload = { name: certForm.name.trim(), jahr, sort_order: 0 };
      if (certMode === 'create') {
        await createCVCertificate(payload);
      } else if (certMode === 'edit' && certEditId !== null) {
        await updateCVCertificate(certEditId, payload);
      }
      setCertMode('none');
      setCertEditId(null);
      setCertForm({ name: '', jahr: String(new Date().getFullYear()) });
      load();
    } catch (e) {
      setCertError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setCertSubmitting(false);
    }
  }

  async function deleteCert(item: CVCertificate) {
    if (!confirm(`Zertifikat "${item.name}" löschen?`)) return;
    try {
      await deleteCVCertificate(item.id);
      setCerts((prev) => prev.filter((c) => c.id !== item.id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  function openEditCert(item: CVCertificate) {
    setCertForm({ name: item.name, jahr: String(item.jahr) });
    setCertError('');
    setCertEditId(item.id);
    setCertMode('edit');
  }

  if (loading) return <p className="text-text-muted">Lade...</p>;

  return (
    <div className="space-y-10">
      {listError && <p className="text-red-600 bg-red-50 p-4 rounded">{listError}</p>}

      {/* Sprachen */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Sprachen</h2>
          {langMode === 'none' && (
            <Button variant="primary" onClick={() => { setLangForm({ sprache: '', niveau: '' }); setLangError(''); setLangMode('create'); }}>
              + Sprache
            </Button>
          )}
          {langMode !== 'none' && (
            <button type="button" onClick={() => { setLangMode('none'); setLangEditId(null); }} disabled={langSubmitting} className="text-sm text-text-muted hover:text-text-primary">
              Abbrechen
            </button>
          )}
        </div>

        {langMode !== 'none' && (
          <div className="rounded-lg border border-border bg-bg-secondary p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Sprache *</label>
                <input type="text" value={langForm.sprache} onChange={(e) => setLangForm((f) => ({ ...f, sprache: e.target.value }))} maxLength={100} disabled={langSubmitting} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Niveau *</label>
                <input type="text" value={langForm.niveau} onChange={(e) => setLangForm((f) => ({ ...f, niveau: e.target.value }))} maxLength={100} placeholder="z.B. C2, Muttersprache" disabled={langSubmitting} className={inputClass} />
              </div>
            </div>
            {langError && <p className="text-red-600 text-sm">{langError}</p>}
            <div className="flex justify-end">
              <Button variant="primary" onClick={submitLang} disabled={langSubmitting}>
                {langSubmitting ? 'Speichere...' : langMode === 'create' ? 'Hinzufügen' : 'Speichern'}
              </Button>
            </div>
          </div>
        )}

        {languages.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Sprachen.</p>
        ) : (
          <div className="space-y-2">
            {languages.map((lang) => (
              <div key={lang.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-4 py-3">
                <div>
                  <span className="font-medium text-sm">{lang.sprache}</span>
                  <span className="text-text-muted text-sm ml-3">{lang.niveau}</span>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditLang(lang)} className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary">Bearbeiten</button>
                  <button type="button" onClick={() => deleteLang(lang)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50">Löschen</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Zertifikate */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Zertifikate</h2>
          {certMode === 'none' && (
            <Button variant="primary" onClick={() => { setCertForm({ name: '', jahr: String(new Date().getFullYear()) }); setCertError(''); setCertMode('create'); }}>
              + Zertifikat
            </Button>
          )}
          {certMode !== 'none' && (
            <button type="button" onClick={() => { setCertMode('none'); setCertEditId(null); }} disabled={certSubmitting} className="text-sm text-text-muted hover:text-text-primary">
              Abbrechen
            </button>
          )}
        </div>

        {certMode !== 'none' && (
          <div className="rounded-lg border border-border bg-bg-secondary p-4 mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Bezeichnung *</label>
                <input type="text" value={certForm.name} onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))} maxLength={200} disabled={certSubmitting} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Jahr *</label>
                <input type="number" value={certForm.jahr} onChange={(e) => setCertForm((f) => ({ ...f, jahr: e.target.value }))} min={1900} max={2100} disabled={certSubmitting} className={inputClass} />
              </div>
            </div>
            {certError && <p className="text-red-600 text-sm">{certError}</p>}
            <div className="flex justify-end">
              <Button variant="primary" onClick={submitCert} disabled={certSubmitting}>
                {certSubmitting ? 'Speichere...' : certMode === 'create' ? 'Hinzufügen' : 'Speichern'}
              </Button>
            </div>
          </div>
        )}

        {certs.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Zertifikate.</p>
        ) : (
          <div className="space-y-2">
            {certs.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary px-4 py-3">
                <div>
                  <span className="font-medium text-sm">{cert.name}</span>
                  <span className="text-text-muted text-sm ml-3">{cert.jahr}</span>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditCert(cert)} className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary">Bearbeiten</button>
                  <button type="button" onClick={() => deleteCert(cert)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50">Löschen</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ────────────────────── Ausbildung & Studium ──────────────────────

type EduForm = { date_from: string; date_to: string; beschreibung: string };
const EMPTY_EDU: EduForm = { date_from: '', date_to: '', beschreibung: '' };

function EducationTab() {
  const [items, setItems] = useState<CVEducation[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EduForm>(EMPTY_EDU);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listCVEducations()
      .then(setItems)
      .catch((e) => setListError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(EMPTY_EDU); setFormError(''); setEditingId(null); setMode('create'); }
  function openEdit(item: CVEducation) {
    setForm({ date_from: item.date_from, date_to: item.date_to ?? '', beschreibung: item.beschreibung });
    setFormError('');
    setEditingId(item.id);
    setMode('edit');
  }
  function closeForm() { setMode('none'); setEditingId(null); setForm(EMPTY_EDU); setFormError(''); }

  async function submit() {
    if (!form.date_from) { setFormError('Von-Datum ist erforderlich'); return; }
    if (!form.beschreibung.trim()) { setFormError('Beschreibung ist erforderlich'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      const payload = { date_from: form.date_from, date_to: form.date_to || null, beschreibung: form.beschreibung.trim(), sort_order: 0 };
      if (mode === 'create') {
        await createCVEducation(payload);
      } else if (mode === 'edit' && editingId !== null) {
        await updateCVEducation(editingId, payload);
      }
      closeForm();
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem(item: CVEducation) {
    if (!confirm('Eintrag wirklich löschen?')) return;
    try {
      await deleteCVEducation(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    }
  }

  if (loading) return <p className="text-text-muted">Lade...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          {mode === 'none' ? 'Ausbildung & Studium' : mode === 'create' ? 'Neuer Eintrag' : 'Eintrag bearbeiten'}
        </h2>
        {mode === 'none' ? (
          <Button variant="primary" onClick={openCreate}>+ Neuer Eintrag</Button>
        ) : (
          <button type="button" onClick={closeForm} disabled={submitting} className="text-sm text-text-muted hover:text-text-primary">Abbrechen</button>
        )}
      </div>

      {listError && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{listError}</p>}

      {mode !== 'none' && (
        <div className="rounded-lg border border-border bg-bg-secondary p-5 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Von *</label>
              <input type="date" value={form.date_from} onChange={(e) => setForm((f) => ({ ...f, date_from: e.target.value }))} disabled={submitting} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Bis</label>
              <input type="date" value={form.date_to} onChange={(e) => setForm((f) => ({ ...f, date_to: e.target.value }))} disabled={submitting} className={inputClass} />
              <p className="text-xs text-text-muted mt-1">Leer lassen wenn laufend</p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Beschreibung *</label>
            <textarea value={form.beschreibung} onChange={(e) => setForm((f) => ({ ...f, beschreibung: e.target.value }))} rows={4} disabled={submitting} placeholder="Ausbildung, Studiengang, Abschluss..." className={inputClass} />
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Speichere...' : mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      {mode === 'none' && (
        items.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Einträge.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-muted">{formatDate(item.date_from)} – {formatDate(item.date_to)}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{item.beschreibung}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => openEdit(item)} className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary">Bearbeiten</button>
                    <button type="button" onClick={() => deleteItem(item)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50">Löschen</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ────────────────────── Projektreferenzen ──────────────────────

const EMPTY_REF = {
  title: '', date_from: '', date_to: '', industry: '', contact: '', fte: '', topic: '', roles: '', responsibilities: '',
};
type RefFormState = typeof EMPTY_REF;

function ProjectsTab() {
  const [refs, setRefs] = useState<ProjectReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [mode, setMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RefFormState>(EMPTY_REF);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminListProjektreferenzen()
      .then(setRefs)
      .catch((e) => setListError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function refToForm(ref: ProjectReference): RefFormState {
    return { title: ref.title, date_from: ref.date_from, date_to: ref.date_to ?? '', industry: ref.industry, contact: ref.contact, fte: String(ref.fte), topic: ref.topic, roles: ref.roles, responsibilities: ref.responsibilities };
  }

  function openCreate() { setForm(EMPTY_REF); setFormError(''); setEditingId(null); setMode('create'); }
  function openEdit(ref: ProjectReference) { setForm(refToForm(ref)); setFormError(''); setEditingId(ref.id); setMode('edit'); }
  function closeForm() { setMode('none'); setEditingId(null); setForm(EMPTY_REF); setFormError(''); }
  function setField(field: keyof RefFormState, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }

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
    return { title: form.title.trim(), date_from: form.date_from, date_to: form.date_to || null, industry: form.industry.trim(), contact: form.contact.trim(), fte, topic: form.topic.trim(), roles: form.roles.trim(), responsibilities: form.responsibilities.trim() };
  }

  async function submit() {
    setFormError('');
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await adminCreateProjektreferenz(payload);
      } else if (mode === 'edit' && editingId !== null) {
        await adminUpdateProjektreferenz(editingId, payload);
      }
      closeForm();
      load();
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

  if (loading) return <p className="text-text-muted">Lade...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          {mode === 'none' ? 'Projektreferenzen' : mode === 'create' ? 'Neue Referenz' : 'Referenz bearbeiten'}
        </h2>
        {mode === 'none' ? (
          <Button variant="primary" onClick={openCreate}>+ Neue Referenz</Button>
        ) : (
          <button type="button" onClick={closeForm} disabled={submitting} className="text-sm text-text-muted hover:text-text-primary">Abbrechen</button>
        )}
      </div>

      {listError && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{listError}</p>}

      {mode !== 'none' && (
        <div className="rounded-lg border border-border bg-bg-secondary p-5 mb-8 space-y-4">
          <div>
            <label className={labelClass}>Titel *</label>
            <input type="text" value={form.title} onChange={(e) => setField('title', e.target.value)} maxLength={200} disabled={submitting} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Zeitraum von *</label>
              <input type="date" value={form.date_from} onChange={(e) => setField('date_from', e.target.value)} disabled={submitting} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Zeitraum bis</label>
              <input type="date" value={form.date_to} onChange={(e) => setField('date_to', e.target.value)} disabled={submitting} className={inputClass} />
              <p className="text-xs text-text-muted mt-1">Leer lassen wenn laufend</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Branche *</label>
              <input type="text" value={form.industry} onChange={(e) => setField('industry', e.target.value)} maxLength={200} disabled={submitting} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Ansprechpartner *</label>
              <input type="text" value={form.contact} onChange={(e) => setField('contact', e.target.value)} maxLength={200} disabled={submitting} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Umfang (FTE) *</label>
              <input type="number" value={form.fte} onChange={(e) => setField('fte', e.target.value)} step="0.1" min="0.1" disabled={submitting} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Thema *</label>
            <input type="text" value={form.topic} onChange={(e) => setField('topic', e.target.value)} disabled={submitting} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rolle(n) *</label>
            <input type="text" value={form.roles} onChange={(e) => setField('roles', e.target.value)} disabled={submitting} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Verantwortlichkeiten *</label>
            <textarea value={form.responsibilities} onChange={(e) => setField('responsibilities', e.target.value)} rows={4} disabled={submitting} placeholder="Eine Verantwortlichkeit pro Zeile" className={inputClass} />
            <p className="text-xs text-text-muted mt-1">Jede Zeile wird als Aufzählungspunkt angezeigt.</p>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? 'Speichere...' : mode === 'create' ? 'Anlegen' : 'Speichern'}
            </Button>
          </div>
        </div>
      )}

      {mode === 'none' && (
        refs.length === 0 ? (
          <p className="text-text-muted text-sm">Noch keine Projektreferenzen angelegt.</p>
        ) : (
          <div className="space-y-3">
            {refs.map((ref) => (
              <div key={ref.id} className="rounded-lg border border-border bg-bg-secondary p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ref.title}</p>
                    <p className="text-sm text-text-muted mt-0.5">
                      {formatDate(ref.date_from)} – {formatDate(ref.date_to)}
                      {' · '}{ref.industry}
                      {' · '}{ref.fte} FTE
                    </p>
                    <p className="text-sm text-text-muted">{ref.topic}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button type="button" onClick={() => openEdit(ref)} className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary">Bearbeiten</button>
                    <button type="button" onClick={() => deleteRef(ref)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50">Löschen</button>
                  </div>
                </div>
                {ref.responsibilities && (
                  <ul className="mt-3 space-y-0.5 pl-4 list-disc text-sm text-text-muted">
                    {ref.responsibilities.split('\n').map((l) => l.trim()).filter((l) => l).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ────────────────────── Übersicht & Export ──────────────────────

function formatBirthdate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function OverviewTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<CVProfile | null>(null);
  const [experiences, setExperiences] = useState<CVExperience[]>([]);
  const [languages, setLanguages] = useState<CVLanguage[]>([]);
  const [certs, setCerts] = useState<CVCertificate[]>([]);
  const [educations, setEducations] = useState<CVEducation[]>([]);
  const [projects, setProjects] = useState<ProjectReference[]>([]);

  useEffect(() => {
    Promise.all([
      getCVProfile(),
      listCVExperiences(),
      listCVLanguages(),
      listCVCertificates(),
      listCVEducations(),
      adminListProjektreferenzen(),
    ])
      .then(([p, exps, langs, cs, edus, projs]) => {
        setProfile(p);
        setExperiences(exps);
        setLanguages(langs);
        setCerts(cs);
        setEducations(edus);
        setProjects(projs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-text-muted">Lade...</p>;
  if (error) return <p className="text-red-600 bg-red-50 p-4 rounded">{error}</p>;

  const hasPersonal = profile && (profile.vorname || profile.nachname || profile.geburtsdatum);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Übersicht</h2>
        <PDFDownloadLink
          document={
            <CVDocument
              profile={profile}
              experiences={experiences}
              languages={languages}
              certs={certs}
              educations={educations}
              projects={projects}
            />
          }
          fileName="lebenslauf.pdf"
        >
          {({ loading }) => (
            <Button variant="primary" disabled={loading}>
              {loading ? 'Generiere PDF…' : 'Als PDF herunterladen'}
            </Button>
          )}
        </PDFDownloadLink>
      </div>

      <div>
        {hasPersonal && (
          <div className="mb-8">
            {(profile.vorname || profile.nachname) && (
              <h1 className="text-2xl font-semibold">
                {[profile.vorname, profile.nachname].filter(Boolean).join(' ')}
              </h1>
            )}
            {profile.geburtsdatum && (
              <p className="text-sm text-text-muted mt-1">* {formatBirthdate(profile.geburtsdatum)}</p>
            )}
          </div>
        )}

        {experiences.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-4">
              Berufliche Tätigkeiten
            </h2>
            <div className="space-y-4">
              {experiences.map((exp) => (
                <div key={exp.id}>
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <span className="font-medium">{exp.rolle}</span>
                    <span className="text-sm text-text-muted whitespace-nowrap">
                      {formatDate(exp.date_from)} – {formatDate(exp.date_to)}
                    </span>
                  </div>
                  {exp.beschreibung && (
                    <ul className="mt-1 pl-4 list-disc text-sm text-text-muted space-y-0.5">
                      {exp.beschreibung.split('\n').map((l) => l.trim()).filter((l) => l).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(languages.length > 0 || certs.length > 0) && (
          <section className="mb-8 grid grid-cols-2 gap-8">
            {languages.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-4">
                  Sprachen
                </h2>
                <div className="space-y-1">
                  {languages.map((lang) => (
                    <div key={lang.id} className="flex justify-between text-sm">
                      <span>{lang.sprache}</span>
                      <span className="text-text-muted">{lang.niveau}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {certs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-4">
                  Zertifikate
                </h2>
                <div className="space-y-1">
                  {certs.map((cert) => (
                    <div key={cert.id} className="flex justify-between text-sm">
                      <span>{cert.name}</span>
                      <span className="text-text-muted">{cert.jahr}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {educations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-4">
              Ausbildung & Studium
            </h2>
            <div className="space-y-3">
              {educations.map((edu) => (
                <div key={edu.id} className="flex gap-6 text-sm">
                  <span className="text-text-muted whitespace-nowrap">
                    {formatDate(edu.date_from)} – {formatDate(edu.date_to)}
                  </span>
                  <span className="whitespace-pre-wrap">{edu.beschreibung}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-1 mb-4">
              Projektreferenzen
            </h2>
            <div className="space-y-6">
              {projects.map((ref) => (
                <div key={ref.id}>
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <span className="font-medium">{ref.title}</span>
                    <span className="text-sm text-text-muted whitespace-nowrap">
                      {formatDate(ref.date_from)} – {formatDate(ref.date_to)}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted mt-0.5">
                    {ref.industry} · {ref.fte} FTE · {ref.roles}
                  </p>
                  <p className="text-sm mt-0.5">{ref.topic}</p>
                  {ref.responsibilities && (
                    <ul className="mt-1 pl-4 list-disc text-sm text-text-muted space-y-0.5">
                      {ref.responsibilities.split('\n').map((l) => l.trim()).filter((l) => l).map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ────────────────────── CV (Hauptseite) ──────────────────────

export function CV() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CVTab>('personal');

  useEffect(() => {
    if (!authLoading && !user?.is_admin) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const tabClass = (tab: CVTab) =>
    `px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
      activeTab === tab
        ? 'bg-accent text-bg-primary'
        : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
    }`;

  if (authLoading || !user?.is_admin) {
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
        <h1 className="text-2xl sm:text-3xl font-medium mb-6">CV</h1>
        <div className="flex gap-2 mb-8 border-b border-border pb-4 overflow-x-auto">
          {(Object.keys(TAB_LABELS) as CVTab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={tabClass(tab)}>
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
        {activeTab === 'personal' && <PersonalTab />}
        {activeTab === 'experience' && <ExperienceTab />}
        {activeTab === 'skills' && <SkillsTab />}
        {activeTab === 'education' && <EducationTab />}
        {activeTab === 'projects' && <ProjectsTab />}
        {activeTab === 'overview' && <OverviewTab />}
      </div>
    </Layout>
  );
}
