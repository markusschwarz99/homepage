import { useEffect, useState } from 'react';
import type { RecipeComment, User } from '../types';
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from '../api/recipeComments';
import { Modal } from './Modal';

interface Props {
  recipeId: number;
  currentUser: User;
}

const MAX_LEN = 2000;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecipeComments({ recipeId, currentUser }: Props) {
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Neuer Top-Level-Kommentar
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reply-State (max. eine offene Reply-Form gleichzeitig)
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit-State (greift auf beide Levels: Top-Level + Replies)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete-Confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(recipeId)
      .then(data => { if (!cancelled) setComments(data); })
      .catch(err => { if (!cancelled) setError(err.message || 'Fehler beim Laden'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [recipeId]);

  // Tree-Update-Helper (flach, max. 1 Level Replies)

  function addTopLevel(created: RecipeComment) {
    setComments(prev => [...prev, created]);
  }

  function addReplyToTree(created: RecipeComment) {
    if (created.parent_id === null) return;
    setComments(prev => prev.map(c =>
      c.id === created.parent_id
        ? { ...c, replies: [created, ...(c.replies ?? [])] }
        : c,
    ));
  }

  function updateInTree(updated: RecipeComment) {
    setComments(prev => prev.map(c => {
      if (c.id === updated.id) {
        // Top-Level updated: replies-Array beibehalten
        return { ...updated, replies: c.replies };
      }
      if (c.replies?.some(r => r.id === updated.id)) {
        return {
          ...c,
          replies: c.replies.map(r => r.id === updated.id ? updated : r),
        };
      }
      return c;
    }));
  }

  function removeFromTree(id: number) {
    setComments(prev => prev
      .filter(c => c.id !== id)
      .map(c => c.replies
        ? { ...c, replies: c.replies.filter(r => r.id !== id) }
        : c,
      ),
    );
  }

  // Submit-Handler

  async function handleSubmitTopLevel(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newContent.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      const created = await createComment(recipeId, trimmed, null);
      addTopLevel(created);
      setNewContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden');
    } finally {
      setSubmitting(false);
    }
  }

  function startReply(parent: RecipeComment) {
    setReplyingToId(parent.id);
    // @-Mention nur als Display-Text vorausfüllen
    setReplyContent(`@${parent.user_name} `);
  }

  function cancelReply() {
    setReplyingToId(null);
    setReplyContent('');
  }

  async function submitReply(parentId: number) {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    setSubmittingReply(true);
    setError('');
    try {
      const created = await createComment(recipeId, trimmed, parentId);
      addReplyToTree(created);
      cancelReply();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden');
    } finally {
      setSubmittingReply(false);
    }
  }

  // Edit-Handler

  function startEdit(c: RecipeComment) {
    setEditingId(c.id);
    setEditContent(c.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function saveEdit(commentId: number) {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    setError('');
    try {
      const updated = await updateComment(recipeId, commentId, trimmed);
      updateInTree(updated);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete-Handler

  async function confirmDelete() {
    if (deletingId === null) return;
    setError('');
    try {
      await deleteComment(recipeId, deletingId);
      removeFromTree(deletingId);
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }

  function canModify(c: RecipeComment): boolean {
    return currentUser.is_admin || c.user_id === currentUser.id;
  }

  // Comment-Block-Renderer für Top-Level UND Replies (gleicher Aufbau)
  function renderCommentBlock(c: RecipeComment, isReply: boolean) {
    return (
      <div id={`comment-${c.id}`} className="border border-border rounded p-4 scroll-mt-24">
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <div className="text-sm">
            <span className="font-medium">{c.user_name}</span>
            <span className="text-text-hint ml-2">
              {formatDate(c.created_at)}
              {c.edited && ' · bearbeitet'}
            </span>
          </div>
          {editingId !== c.id && (
            <div className="flex gap-2 text-xs">
              {!isReply && (
                <button
                  type="button"
                  onClick={() => startReply(c)}
                  className="text-text-muted hover:text-accent"
                >
                  Antworten
                </button>
              )}
              {canModify(c) && (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="text-text-muted hover:text-accent"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(c.id)}
                    className="text-text-muted hover:text-red-600"
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {editingId === c.id ? (
          <div>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              maxLength={MAX_LEN}
              rows={3}
              className="w-full p-2 border border-border rounded text-sm resize-y bg-bg-primary"
              disabled={savingEdit}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={savingEdit}
                className="text-xs text-text-muted hover:text-text-primary px-3 py-1"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => saveEdit(c.id)}
                disabled={savingEdit || !editContent.trim()}
                className="text-xs bg-accent text-bg-primary px-3 py-1 rounded disabled:opacity-50"
              >
                {savingEdit ? 'Speichere …' : 'Speichern'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {c.content}
          </p>
        )}
      </div>
    );
  }

  // Total-Count inkl. Replies (matcht das Backend-comment_count-Feld)
  const totalCount = comments.reduce(
    (sum, c) => sum + 1 + (c.replies?.length ?? 0),
    0,
  );

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-4">
        Kommentare {totalCount > 0 && `(${totalCount})`}
      </h2>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-hint">Lade Kommentare …</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-text-hint mb-6">
          Noch keine Kommentare. Schreib den ersten!
        </p>
      ) : (
        <ul className="space-y-4 mb-8">
          {comments.map(c => (
            <li key={c.id}>
              {renderCommentBlock(c, false)}

              {/* Reply-Form direkt unter dem Parent, vor den Replies */}
              {replyingToId === c.id && (
                <div className="mt-3 ml-6 pl-4 border-l-2 border-border">
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    maxLength={MAX_LEN}
                    rows={3}
                    placeholder="Antwort schreiben …"
                    className="w-full p-2 border border-border rounded text-sm resize-y bg-bg-primary"
                    disabled={submittingReply}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text-hint">
                      {replyContent.length} / {MAX_LEN}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={cancelReply}
                        disabled={submittingReply}
                        className="text-xs text-text-muted hover:text-text-primary px-3 py-1"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={() => submitReply(c.id)}
                        disabled={submittingReply || !replyContent.trim()}
                        className="text-xs bg-accent text-bg-primary px-3 py-1 rounded disabled:opacity-50"
                      >
                        {submittingReply ? 'Sende …' : 'Antworten'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies — newest first, eingerückt mit linker Border */}
              {c.replies && c.replies.length > 0 && (
                <ul className="mt-3 ml-6 pl-4 border-l-2 border-border space-y-3">
                  {c.replies.map(r => (
                    <li key={r.id}>
                      {renderCommentBlock(r, true)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Top-Level-Eingabe */}
      <form onSubmit={handleSubmitTopLevel} className="space-y-2">
        <label htmlFor="new-comment" className="sr-only">
          Neuer Kommentar
        </label>
        <textarea
          id="new-comment"
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          maxLength={MAX_LEN}
          rows={3}
          placeholder="Kommentar schreiben …"
          className="w-full p-3 border border-border rounded text-sm resize-y bg-bg-primary"
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-hint">
            {newContent.length} / {MAX_LEN}
          </span>
          <button
            type="submit"
            disabled={submitting || !newContent.trim()}
            className="bg-accent text-bg-primary px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {submitting ? 'Sende …' : 'Kommentar senden'}
          </button>
        </div>
      </form>

      {deletingId !== null && (
        <Modal
          title="Kommentar löschen"
          onClose={() => setDeletingId(null)}
          onConfirm={confirmDelete}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du diesen Kommentar wirklich löschen?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </Modal>
      )}
    </div>
  );
}
