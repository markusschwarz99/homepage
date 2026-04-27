import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { getSetting, updateSetting } from '../api/settings';

export function AdminSettings() {
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSetting('homepage_intro')
      .then((s) => {
        if (cancelled) return;
        setValue(s.value);
        setOriginal(s.value);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function save() {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const updated = await updateSetting('homepage_intro', value);
      setOriginal(updated.value);
      setValue(updated.value);
      setSuccess('Gespeichert.');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setValue(original);
    setError('');
    setSuccess('');
  }

  const dirty = value !== original;
  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted";

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Startseite
        </h2>
        <label className="block text-sm text-text-primary mb-2" htmlFor="homepage_intro">
          Begrüßungstext
        </label>
        <p className="text-xs text-text-hint mb-3">
          Wird auf der Startseite unter der Begrüßung angezeigt. Zeilenumbrüche werden übernommen.
        </p>
        <textarea
          id="homepage_intro"
          value={value}
          onChange={e => setValue(e.target.value)}
          rows={5}
          maxLength={5000}
          className={inputClass}
        />
        <p className="text-xs text-text-hint mt-1">{value.length} / 5000 Zeichen</p>

        <div className="flex gap-2 mt-4 items-center">
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-bg-primary hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
          <button
            onClick={reset}
            disabled={!dirty || saving}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zurücksetzen
          </button>
          {success && <span className="text-sm text-green-600">{success}</span>}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </section>
    </AdminLayout>
  );
}
