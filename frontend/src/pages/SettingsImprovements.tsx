import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { SettingsLayout } from '../components/SettingsLayout';
import { Button } from '../components/Button';
import { useToast } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { createImprovement, type ImprovementCategory } from '../api/improvements';

const CATEGORY_OPTIONS: { value: ImprovementCategory; label: string }[] = [
  { value: 'idee', label: 'Idee' },
  { value: 'bug', label: 'Bug' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

export function SettingsImprovements() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ImprovementCategory>('idee');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Nur Mitglieder/Haushalt/Admin dürfen erfassen (Backend sperrt zusätzlich).
  useEffect(() => {
    if (!loading && user && !user.is_member) {
      navigate('/einstellungen/account');
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createImprovement({
        title: title.trim(),
        category,
        description: description.trim(),
      });
      show('Vorschlag gesendet – danke!', 'success');
      setTitle('');
      setCategory('idee');
      setDescription('');
    } catch (err) {
      show(err instanceof Error ? err.message : 'Fehler beim Senden', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted";

  return (
    <SettingsLayout>
      <div className="bg-bg-primary rounded-lg border border-border p-6">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-2">Improvement erfassen</h2>
        <p className="text-xs text-text-hint mb-6">
          Idee, Bug oder Wunsch? Schick mir deinen Vorschlag – ich schaue ihn mir an.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-2" htmlFor="imp_title">Titel</label>
            <input
              id="imp_title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-2" htmlFor="imp_category">Kategorie</label>
            <select
              id="imp_category"
              value={category}
              onChange={e => setCategory(e.target.value as ImprovementCategory)}
              className={inputClass}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-2" htmlFor="imp_description">Beschreibung</label>
            <textarea
              id="imp_description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={6}
              maxLength={5000}
              className={inputClass}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sende...' : 'Vorschlag senden'}
          </Button>
        </form>
      </div>
    </SettingsLayout>
  );
}
