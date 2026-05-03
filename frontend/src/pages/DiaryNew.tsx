import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NotFound } from './NotFound';
import { Datepicker } from '../components/Datepicker';
import { useAuth } from '../hooks/useAuth';
import { createEntry } from '../api/diary';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function DiaryNew() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entryDate, setEntryDate] = useState<string>(todayISO());
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
          <p className="text-text-muted text-sm">Lade...</p>
        </div>
      </Layout>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <NotFound />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entryDate) {
      setError('Bitte ein Datum wählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createEntry({
        entry_date: entryDate,
        description: description.trim() || null,
      });
      // Direkt in die Edit-View springen, damit Bilder hochgeladen werden können
      navigate(`/diary/${created.id}/bearbeiten`);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Speichern');
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/diary"
            className="text-xs text-text-muted hover:text-text-primary"
          >
            ← Zurück zur Übersicht
          </Link>
          <h1 className="text-2xl font-medium text-text-primary mt-2">Neuer Eintrag</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Datum
            </label>
            <Datepicker value={entryDate} onChange={setEntryDate} />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-text-primary mb-1"
            >
              Beschreibung <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              maxLength={10000}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-text-muted resize-y"
              placeholder="Was war heute los?"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-text-primary text-bg-primary text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Speichern...' : 'Anlegen & Bilder hochladen'}
            </button>
            <Link
              to="/diary"
              className="text-sm text-text-muted hover:text-text-primary"
            >
              Abbrechen
            </Link>
          </div>

          <p className="text-xs text-text-muted">
            Nach dem Anlegen kommst du zur Bearbeitungsansicht, wo du Bilder hinzufügen kannst.
          </p>
        </form>
      </div>
    </Layout>
  );
}
