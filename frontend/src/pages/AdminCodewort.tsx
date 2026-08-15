import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  adminListCodewortPacks,
  adminCreateCodewortPack,
  adminUpdateCodewortPack,
  adminDeleteCodewortPack,
  adminListCodewortWords,
  adminCreateCodewortWords,
  adminDeleteCodewortWord,
} from '../api/codewort';
import type { CodewortPackAdmin, CodewortWord } from '../types';

/** Ein Paket braucht mindestens so viele Wörter für eine Auslage. */
const MIN_PLAYABLE = 25;

type ModalKind =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'rename'; pack: CodewortPackAdmin }
  | { kind: 'words'; pack: CodewortPackAdmin };

export function AdminCodewort() {
  const [packs, setPacks] = useState<CodewortPackAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState<ModalKind>({ kind: 'none' });
  const [modalInput, setModalInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [words, setWords] = useState<CodewortWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [newWordsInput, setNewWordsInput] = useState('');
  const [addingWords, setAddingWords] = useState(false);

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';

  // ---------- Pakete laden ----------

  useEffect(() => {
    let cancelled = false;
    adminListCodewortPacks()
      .then((data) => {
        if (!cancelled) setPacks(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Wörter laden, sobald das Wörter-Modal aufgeht ----------

  useEffect(() => {
    if (modal.kind !== 'words') return;
    let cancelled = false;
    setLoadingWords(true);
    setModalError('');
    adminListCodewortWords(modal.pack.id)
      .then((data) => {
        if (!cancelled) setWords(data);
      })
      .catch((e) => {
        if (!cancelled) setModalError(e instanceof Error ? e.message : 'Fehler beim Laden');
      })
      .finally(() => {
        if (!cancelled) setLoadingWords(false);
      });
    return () => {
      cancelled = true;
    };
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

  function openRename(pack: CodewortPackAdmin) {
    setModalInput(pack.name);
    setModalError('');
    setModal({ kind: 'rename', pack });
  }

  function openWords(pack: CodewortPackAdmin) {
    setNewWordsInput('');
    setModalError('');
    setWords([]);
    setModal({ kind: 'words', pack });
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
      const pack = await adminCreateCodewortPack({ name, sort_order: packs.length });
      setPacks((prev) => [...prev, pack]);
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
    if (newName === modal.pack.name) {
      closeModal();
      return;
    }
    setSubmitting(true);
    setModalError('');
    try {
      const updated = await adminUpdateCodewortPack(modal.pack.id, { name: newName });
      setPacks((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setModal({ kind: 'none' });
      setModalInput('');
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSubmitting(false);
    }
  }

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
      const created = await adminCreateCodewortWords(modal.pack.id, list);
      setWords((prev) => [...prev, ...created].sort((a, b) => a.word.localeCompare(b.word, 'de')));
      setPacks((prev) =>
        prev.map((p) =>
          p.id === modal.pack.id ? { ...p, word_count: p.word_count + created.length } : p,
        ),
      );
      setNewWordsInput('');
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setAddingWords(false);
    }
  }

  async function removeWordInModal(word: CodewortWord) {
    if (modal.kind !== 'words') return;
    if (!confirm(`Wort "${word.word}" löschen?`)) return;
    try {
      await adminDeleteCodewortWord(word.id);
      setWords((prev) => prev.filter((w) => w.id !== word.id));
      setPacks((prev) =>
        prev.map((p) =>
          p.id === modal.pack.id ? { ...p, word_count: Math.max(0, p.word_count - 1) } : p,
        ),
      );
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  // ---------- Direkt-Aktionen ----------

  async function toggleActive(pack: CodewortPackAdmin) {
    try {
      const updated = await adminUpdateCodewortPack(pack.id, { is_active: !pack.is_active });
      setPacks((prev) => prev.map((p) => (p.id === pack.id ? updated : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  async function deletePack(pack: CodewortPackAdmin) {
    if (
      !confirm(
        `Paket "${pack.name}" wirklich löschen? Alle ${pack.word_count} Wörter werden mitgelöscht.`,
      )
    ) {
      return;
    }
    try {
      await adminDeleteCodewortPack(pack.id);
      setPacks((prev) => prev.filter((p) => p.id !== pack.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <p className="text-text-muted">Lade...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Codewort</h2>
        <Button variant="primary" onClick={openCreate}>
          + Neues Paket
        </Button>
      </div>

      {error && <p className="text-red-600 bg-red-50 p-4 rounded mb-4">{error}</p>}

      {packs.length === 0 ? (
        <p className="text-text-muted text-sm">Noch keine Wortpakete angelegt.</p>
      ) : (
        <div className="space-y-2">
          {packs.map((pack) => {
            const playable = pack.word_count >= MIN_PLAYABLE;
            return (
              <div key={pack.id} className="rounded-lg border border-border bg-bg-secondary p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openWords(pack)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0 hover:text-text-primary"
                    title="Wörter bearbeiten"
                  >
                    <span className="font-medium truncate">{pack.name}</span>
                    <span className="text-xs text-text-muted">({pack.word_count})</span>
                    {!playable && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        &lt; {MIN_PLAYABLE}
                      </span>
                    )}
                    {!pack.is_active && (
                      <span className="text-xs text-text-muted bg-bg-primary px-2 py-0.5 rounded border border-border">
                        inaktiv
                      </span>
                    )}
                  </button>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleActive(pack)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary"
                    >
                      {pack.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRename(pack)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-bg-primary"
                    >
                      Umbenennen
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePack(pack)}
                      className="text-xs px-2 py-1 rounded border border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODALS ================= */}

      {modal.kind === 'create' && (
        <Modal
          title="Neues Paket"
          onClose={closeModal}
          onConfirm={submitCreate}
          confirmLabel={submitting ? 'Lege an...' : 'Anlegen'}
        >
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={modalInput}
            onChange={(e) => setModalInput(e.target.value)}
            placeholder="z.B. IT & Technik"
            maxLength={100}
            autoFocus
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitCreate();
            }}
            className={inputClass}
          />
          {modalError && <p className="text-red-600 text-sm mt-2">{modalError}</p>}
        </Modal>
      )}

      {modal.kind === 'rename' && (
        <Modal
          title="Paket umbenennen"
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename();
            }}
            className={inputClass}
          />
          {modalError && <p className="text-red-600 text-sm mt-2">{modalError}</p>}
        </Modal>
      )}

      {modal.kind === 'words' && (
        <Modal title={`Wörter — ${modal.pack.name}`} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Bestehende Wörter ({words.length})</p>
              {loadingWords ? (
                <p className="text-text-muted text-sm">Lade Wörter...</p>
              ) : words.length === 0 ? (
                <p className="text-text-muted text-sm">Noch keine Wörter in diesem Paket.</p>
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

            <div className="border-t border-border pt-4">
              <label className="block text-sm font-medium mb-2">Neue Wörter hinzufügen</label>
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
