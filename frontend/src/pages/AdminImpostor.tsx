import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  adminListImpostorCategories,
  adminCreateImpostorCategory,
  adminUpdateImpostorCategory,
  adminDeleteImpostorCategory,
  adminListImpostorWords,
  adminCreateImpostorWords,
  adminDeleteImpostorWord,
} from '../api/impostor';
import type { ImpostorCategoryAdmin, ImpostorWord } from '../types';

type ModalKind =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'rename'; cat: ImpostorCategoryAdmin }
  | { kind: 'words'; cat: ImpostorCategoryAdmin };

export function AdminImpostor() {
  const [categories, setCategories] = useState<ImpostorCategoryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal-State
  const [modal, setModal] = useState<ModalKind>({ kind: 'none' });
  const [modalInput, setModalInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Words-Modal-spezifisch
  const [words, setWords] = useState<ImpostorWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [newWordsInput, setNewWordsInput] = useState('');
  const [addingWords, setAddingWords] = useState(false);

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';

  // ---------- Categories laden ----------

  useEffect(() => {
    let cancelled = false;
    adminListImpostorCategories()
      .then((data) => {
        if (cancelled) return;
        setCategories(data);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ---------- Words laden, sobald words-Modal aufgeht ----------

  useEffect(() => {
    if (modal.kind !== 'words') return;
    let cancelled = false;
    setLoadingWords(true);
    setModalError('');
    adminListImpostorWords(modal.cat.id)
      .then((data) => {
        if (!cancelled) setWords(data);
      })
      .catch((e) => {
        if (!cancelled) setModalError(e instanceof Error ? e.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoadingWords(false);
      });
    return () => { cancelled = true; };
  }, [modal]);

  // ---------- Modal-Helpers ----------

  const closeModal = useCallback(() => {
    if (submitting || addingWords) return;
    setModal({ kind: 'none' });
    setModalInput('');
    setModalError('');
    setNewWordsInput('');
    setWords([]);
  }, [submitting, addingWords]);

  // Esc + body-scroll-lock
  useEffect(() => {
    if (modal.kind === 'none') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modal.kind, closeModal]);

  function openCreate() {
    setModalInput('');
    setModalError('');
    setModal({ kind: 'create' });
  }

  function openRename(cat: ImpostorCategoryAdmin) {
    setModalInput(cat.name);
    setModalError('');
    setModal({ kind: 'rename', cat });
  }

  function openWords(cat: ImpostorCategoryAdmin) {
    setNewWordsInput('');
    setModalError('');
    setWords([]);
    setModal({ kind: 'words', cat });
  }

  // ---------- Submit-Handlers ----------

  async function submitCreate() {
    const name = modalInput.trim();
    if (!name) {
      setModalError('Name darf nicht leer sein');
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      const cat = await adminCreateImpostorCategory({
        name,
        sort_order: categories.length,
      });
      setCategories((prev) => [...prev, cat]);
      setModal({ kind: 'none' });
      setModalInput('');
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRename() {
    if (modal.kind !== 'rename') return;
    const newName = modalInput.trim();
    if (!newName) {
      setModalError('Name darf nicht leer sein');
      return;
    }
    if (newName === modal.cat.name) {
      closeModal();
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      const updated = await adminUpdateImpostorCategory(modal.cat.id, { name: newName });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setModal({ kind: 'none' });
      setModalInput('');
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSubmitting(false);
    }
  }

  // Wörter-Modal-Aktionen
  async function addNewWords() {
    if (modal.kind !== 'words') return;
    const list = newWordsInput
      .split(/[\n,]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
    if (list.length === 0) {
      setModalError('Bitte mindestens ein Wort eingeben');
      return;
    }
    setAddingWords(true);
    setModalError('');
    try {
      const created = await adminCreateImpostorWords(modal.cat.id, list);
      setWords((prev) =>
        [...prev, ...created].sort((a, b) => a.word.localeCompare(b.word, 'de')),
      );
      // Word-count auf der Karte aktualisieren
      setCategories((prev) =>
        prev.map((c) =>
          c.id === modal.cat.id ? { ...c, word_count: c.word_count + created.length } : c,
        ),
      );
      setNewWordsInput('');
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setAddingWords(false);
    }
  }

  async function removeWordInModal(word: ImpostorWord) {
    if (modal.kind !== 'words') return;
    if (!confirm(`Wort "${word.word}" löschen?`)) return;
    try {
      await adminDeleteImpostorWord(word.id);
      setWords((prev) => prev.filter((w) => w.id !== word.id));
      setCategories((prev) =>
        prev.map((c) =>
          c.id === modal.cat.id ? { ...c, word_count: Math.max(0, c.word_count - 1) } : c,
        ),
      );
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  // ---------- Direkt-Aktionen (kein Modal) ----------

  async function toggleActive(cat: ImpostorCategoryAdmin) {
    try {
      const updated = await adminUpdateImpostorCategory(cat.id, { is_active: !cat.is_active });
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? updated : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  async function deleteCategory(cat: ImpostorCategoryAdmin) {
    if (!confirm(`Kategorie "${cat.name}" wirklich löschen? Alle ${cat.word_count} Wörter werden mitgelöscht.`)) {
      return;
    }
    try {
      await adminDeleteImpostorCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">
          Impostor
        </h2>
        <Button variant="primary" onClick={openCreate}>
          + Neue Kategorie
        </Button>
      </div>

      {error && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{error}</p>}

      {/* ---------- Kategorien-Liste ---------- */}
      {categories.length === 0 ? (
        <p className="text-text-muted text-sm">Noch keine Kategorien angelegt.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-border bg-bg-secondary p-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openWords(cat)}
                  className="flex items-center gap-2 text-left flex-1 min-w-0 hover:text-text-primary"
                  title="Wörter bearbeiten"
                >
                  <span className="font-medium truncate">{cat.name}</span>
                  <span className="text-xs text-text-muted">({cat.word_count})</span>
                  {!cat.is_active && (
                    <span className="text-xs text-text-muted bg-bg-primary px-2 py-0.5 rounded border border-border">
                      inaktiv
                    </span>
                  )}
                </button>
                <div className="flex gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleActive(cat)}
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary"
                  >
                    {cat.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openRename(cat)}
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary"
                  >
                    Umbenennen
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat)}
                    className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =================================================================
          MODALS
          ================================================================= */}

      {modal.kind === 'create' && (
        <Modal
          title="Neue Kategorie"
          onClose={closeModal}
          onConfirm={submitCreate}
          confirmLabel={submitting ? 'Lege an...' : 'Anlegen'}
        >
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="z.B. Werkzeuge"
            maxLength={100}
            autoFocus
            disabled={submitting}
            onKeyDown={(e) => { if (e.key === 'Enter') submitCreate(); }}
            className={inputClass}
          />
          {modalError && <p className="text-red-600 text-sm mt-2">{modalError}</p>}
        </Modal>
      )}

      {modal.kind === 'rename' && (
        <Modal
          title="Kategorie umbenennen"
          onClose={closeModal}
          onConfirm={submitRename}
          confirmLabel={submitting ? 'Speichere...' : 'Speichern'}
        >
          <label className="block text-sm font-medium mb-2">Neuer Name</label>
          <input
            type="text"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            maxLength={100}
            autoFocus
            disabled={submitting}
            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); }}
            className={inputClass}
          />
          {modalError && <p className="text-red-600 text-sm mt-2">{modalError}</p>}
        </Modal>
      )}

      {modal.kind === 'words' && (
        <Modal title={`Wörter — ${modal.cat.name}`} onClose={closeModal}>
          <div className="space-y-4">
            {/* Bestehende Wörter */}
            <div>
              <p className="text-sm font-medium mb-2">
                Bestehende Wörter ({words.length})
              </p>
              {loadingWords ? (
                <p className="text-text-muted text-sm">Lade Wörter...</p>
              ) : words.length === 0 ? (
                <p className="text-text-muted text-sm">
                  Noch keine Wörter in dieser Kategorie.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1 -m-1">
                  {words.map((w) => (
                    <span
                      key={w.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm rounded border border-border bg-bg-secondary"
                    >
                      {w.word}
                      <button
                        type="button"
                        onClick={() => removeWordInModal(w)}
                        className="text-text-muted hover:text-red-600 ml-1 text-xs"
                        aria-label={`${w.word} löschen`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Neue Wörter hinzufügen */}
            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">
                Neue Wörter hinzufügen
              </label>
              <textarea
                value={newWordsInput}
                onChange={(e) => setNewWordsInput(e.target.value)}
                placeholder="Ein Wort pro Zeile oder durch Kommas getrennt"
                rows={3}
                disabled={addingWords}
                className={inputClass}
              />
              <p className="text-xs text-text-muted mt-1">
                Duplikate werden automatisch übersprungen.
              </p>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="primary"
                  onClick={addNewWords}
                  disabled={addingWords || !newWordsInput.trim()}
                >
                  {addingWords ? 'Füge hinzu...' : 'Hinzufügen'}
                </Button>
              </div>
            </div>

            {modalError && <p className="text-red-600 text-sm">{modalError}</p>}
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
