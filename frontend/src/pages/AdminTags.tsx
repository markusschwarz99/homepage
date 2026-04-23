import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Modal } from '../components/Modal';
import { api } from '../lib/api';
import type { TagCategory, Tag } from '../types';

export function AdminTags() {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTagInputs, setNewTagInputs] = useState<Record<number, string>>({});
  const [editingCategory, setEditingCategory] = useState<TagCategory | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<TagCategory | null>(null);
  const [deleteTagModal, setDeleteTagModal] = useState<Tag | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await api<TagCategory[]>('/tags');
      setCategories(data);
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setError('');
    try {
      await api('/tags/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewCategoryName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function saveCategory() {
    if (!editingCategory) return;
    const name = editingCategoryName.trim();
    if (!name) return;
    try {
      await api(`/tags/categories/${editingCategory.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      setEditingCategory(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function deleteCategory() {
    if (!deleteCategoryModal) return;
    try {
      await api(`/tags/categories/${deleteCategoryModal.id}`, { method: 'DELETE' });
      setDeleteCategoryModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function addTag(categoryId: number) {
    const name = (newTagInputs[categoryId] ?? '').trim();
    if (!name) return;
    try {
      await api('/tags/tags', {
        method: 'POST',
        body: JSON.stringify({ category_id: categoryId, name }),
      });
      setNewTagInputs(prev => ({ ...prev, [categoryId]: '' }));
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function saveTag() {
    if (!editingTag) return;
    const name = editingTagName.trim();
    if (!name) return;
    try {
      await api(`/tags/tags/${editingTag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      setEditingTag(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  async function deleteTag() {
    if (!deleteTagModal) return;
    try {
      await api(`/tags/tags/${deleteTagModal.id}`, { method: 'DELETE' });
      setDeleteTagModal(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler');
    }
  }

  const inputClass = "px-3 py-2 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted";

  if (loading) {
    return <AdminLayout><p className="text-text-muted">Lade...</p></AdminLayout>;
  }

  return (
    <AdminLayout>
      {/* Neue Kategorie */}
      <section className="mb-8">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted mb-3">
          Neue Kategorie
        </h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="z.B. Küche, Gang, Art"
            className={`${inputClass} flex-1`}
          />
          <button
            onClick={addCategory}
            className="px-4 py-2 text-sm rounded-lg bg-accent text-bg-primary hover:bg-accent-hover transition-colors"
          >
            + Hinzufügen
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      {/* Kategorien-Liste */}
      {categories.length === 0 ? (
        <p className="text-text-hint py-8 text-center">
          Noch keine Kategorien angelegt. Lege eine Kategorie an, um Tags hinzuzufügen.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => (
            <section key={cat.id} className="bg-bg-primary border border-border rounded-lg p-4">
              {/* Kategorie-Header */}
              <div className="flex items-center justify-between mb-3 gap-3">
                {editingCategory?.id === cat.id ? (
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={e => setEditingCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveCategory();
                        if (e.key === 'Escape') setEditingCategory(null);
                      }}
                      autoFocus
                      className={`${inputClass} flex-1`}
                    />
                    <button onClick={saveCategory} className="text-xs px-3 py-1.5 rounded-lg bg-accent text-bg-primary">
                      Speichern
                    </button>
                    <button onClick={() => setEditingCategory(null)} className="text-xs px-3 py-1.5 rounded-lg border border-border">
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-medium">{cat.name}</h3>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditingCategoryName(cat.name);
                        }}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        Umbenennen
                      </button>
                      <button
                        onClick={() => setDeleteCategoryModal(cat)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Löschen
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Tag-Liste */}
              <div className="flex flex-wrap gap-2 mb-3">
                {cat.tags.length === 0 ? (
                  <p className="text-xs text-text-hint">Noch keine Tags in dieser Kategorie.</p>
                ) : (
                  cat.tags.map(tag => (
                    <div
                      key={tag.id}
                      className="group inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-secondary"
                    >
                      {editingTag?.id === tag.id ? (
                        <input
                          type="text"
                          value={editingTagName}
                          onChange={e => setEditingTagName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveTag();
                            if (e.key === 'Escape') setEditingTag(null);
                          }}
                          onBlur={saveTag}
                          autoFocus
                          className="px-1 py-0.5 text-xs bg-bg-primary rounded border border-border focus:outline-none w-32"
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingTag(tag);
                              setEditingTagName(tag.name);
                            }}
                            className="text-text-primary hover:text-text-muted"
                          >
                            {tag.name}
                          </button>
                          <button
                            onClick={() => setDeleteTagModal(tag)}
                            className="text-text-hint hover:text-red-500 ml-1"
                            aria-label="Tag löschen"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Neuer Tag */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInputs[cat.id] ?? ''}
                  onChange={e => setNewTagInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addTag(cat.id)}
                  placeholder="Neuer Tag..."
                  className={`${inputClass} flex-1`}
                />
                <button
                  onClick={() => addTag(cat.id)}
                  className="text-xs px-3 py-2 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary transition-colors"
                >
                  + Tag
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      {deleteCategoryModal && (
        <Modal
          title="Kategorie löschen"
          onClose={() => setDeleteCategoryModal(null)}
          onConfirm={deleteCategory}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du die Kategorie <strong>{deleteCategoryModal.name}</strong> wirklich löschen?
            Alle {deleteCategoryModal.tags.length} Tag{deleteCategoryModal.tags.length === 1 ? '' : 's'} in dieser
            Kategorie werden ebenfalls gelöscht und von allen Rezepten entfernt.
          </p>
        </Modal>
      )}

      {deleteTagModal && (
        <Modal
          title="Tag löschen"
          onClose={() => setDeleteTagModal(null)}
          onConfirm={deleteTag}
          confirmLabel="Löschen"
          confirmVariant="danger"
        >
          <p className="text-sm text-text-muted">
            Möchtest du den Tag <strong>{deleteTagModal.name}</strong> wirklich löschen?
            Er wird von allen Rezepten entfernt.
          </p>
        </Modal>
      )}
    </AdminLayout>
  );
}
