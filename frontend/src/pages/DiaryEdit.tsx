import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layout } from '../components/Layout';
import { NotFound } from './NotFound';
import { Datepicker } from '../components/Datepicker';
import { Lightbox } from '../components/Lightbox';
import { useAuth } from '../hooks/useAuth';
import {
  getEntry,
  updateEntry,
  deleteEntry,
  uploadImages,
  updateImage,
  deleteImage,
  reorderImages,
  imageUrl,
} from '../api/diary';
import type { DiaryEntry, DiaryImage } from '../types';

// ---------- Sortable Image Card ----------

interface SortableImageProps {
  image: DiaryImage;
  onClick: () => void;
  onCaptionChange: (caption: string) => void;
  onCaptionSave: () => void;
  onDelete: () => void;
  draftCaption: string;
  isDirty: boolean;
}

function SortableImage(props: SortableImageProps) {
  const {
    image, onClick, onCaptionChange, onCaptionSave, onDelete, draftCaption, isDirty,
  } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-border rounded-lg bg-bg-secondary overflow-hidden"
    >
      <div className="relative aspect-square group">
        {/* Drag-Handle: oben mittig, sichtbar */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 z-10 p-1.5 bg-black/60 text-white rounded cursor-grab active:cursor-grabbing"
          aria-label="Verschieben"
          title="Zum Sortieren ziehen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" />
            <circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" />
          </svg>
        </button>

        {/* Delete-Button rechts oben */}
        <button
          type="button"
          onClick={onDelete}
          className="absolute top-1 right-1 z-10 p-1.5 bg-black/60 text-white rounded hover:bg-red-600/80 transition-colors"
          aria-label="Bild löschen"
          title="Bild löschen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Bild — Klick öffnet Lightbox */}
        <button
          type="button"
          onClick={onClick}
          className="block w-full h-full"
        >
          <img
            src={imageUrl(image.thumb_url)}
            alt={image.caption || ''}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Caption-Editor */}
      <div className="p-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={draftCaption}
            onChange={e => onCaptionChange(e.target.value)}
            placeholder="Bildunterschrift (optional)"
            maxLength={500}
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-border rounded bg-bg-primary text-text-primary focus:outline-none focus:border-text-muted"
          />
          {isDirty && (
            <button
              type="button"
              onClick={onCaptionSave}
              className="px-2 text-xs rounded bg-text-primary text-bg-primary hover:opacity-90"
              title="Bildunterschrift speichern"
            >
              ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------

export function DiaryEdit() {
  const { id } = useParams<{ id: string }>();
  const entryId = Number(id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit-State für Eintrag
  const [entryDate, setEntryDate] = useState('');
  const [description, setDescription] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryDirty, setEntryDirty] = useState(false);

  // Caption-Drafts pro Bild-ID
  const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});

  // Upload-State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (authLoading || !user?.is_admin || !entryId) return;
    getEntry(entryId)
      .then(e => {
        setEntry(e);
        setEntryDate(e.entry_date);
        setDescription(e.description || '');
        const drafts: Record<number, string> = {};
        for (const img of e.images) drafts[img.id] = img.caption || '';
        setCaptionDrafts(drafts);
      })
      .catch(e => setLoadError(e.message || 'Fehler beim Laden'));
  }, [authLoading, user?.is_admin, entryId]);

  if (authLoading) {
    return <Layout><div className="max-w-3xl mx-auto px-4 sm:px-8 py-8"><p className="text-text-muted text-sm">Lade...</p></div></Layout>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <NotFound />;

  if (loadError) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          <p className="text-red-700 text-sm">{loadError}</p>
          <Link to="/diary" className="text-sm text-text-muted underline mt-4 inline-block">← Zurück zur Übersicht</Link>
        </div>
      </Layout>
    );
  }
  if (!entry) {
    return <Layout><div className="max-w-3xl mx-auto px-4 sm:px-8 py-8"><p className="text-text-muted text-sm">Lade Eintrag...</p></div></Layout>;
  }

  // ---------- Handlers ----------

  function markEntryDirty<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setEntryDirty(true);
  }

  async function saveEntryMeta() {
    if (!entry) return;
    setSavingEntry(true);
    setActionError(null);
    try {
      const updated = await updateEntry(entry.id, {
        entry_date: entryDate,
        description: description.trim() || null,
      });
      setEntry(updated);
      setEntryDirty(false);
    } catch (e: any) {
      setActionError(e.message || 'Fehler beim Speichern');
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleDeleteEntry() {
    if (!entry) return;
    if (!confirm(`Eintrag vom ${entry.entry_date} wirklich löschen? Alle Bilder werden mit gelöscht.`)) return;
    try {
      await deleteEntry(entry.id);
      navigate('/diary');
    } catch (e: any) {
      setActionError(e.message || 'Fehler beim Löschen');
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!entry) return;
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploading(true);
    setActionError(null);
    try {
      const newImgs = await uploadImages(entry.id, files);
      // Refetch für konsistenten State (Reihenfolge etc.)
      const refreshed = await getEntry(entry.id);
      setEntry(refreshed);
      const drafts: Record<number, string> = { ...captionDrafts };
      for (const img of newImgs) drafts[img.id] = '';
      setCaptionDrafts(drafts);
    } catch (e: any) {
      setActionError(e.message || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleCaptionSave(imageId: number) {
    if (!entry) return;
    setActionError(null);
    try {
      const draft = captionDrafts[imageId] ?? '';
      const updated = await updateImage(imageId, {
        caption: draft.trim() ? draft : null,
      });
      setEntry({
        ...entry,
        images: entry.images.map(img => img.id === imageId ? { ...img, caption: updated.caption } : img),
      });
    } catch (e: any) {
      setActionError(e.message || 'Caption-Update fehlgeschlagen');
    }
  }

  async function handleDeleteImage(imageId: number) {
    if (!entry) return;
    if (!confirm('Bild wirklich löschen?')) return;
    setActionError(null);
    try {
      await deleteImage(imageId);
      setEntry({
        ...entry,
        images: entry.images.filter(img => img.id !== imageId),
      });
      const { [imageId]: _, ...rest } = captionDrafts;
      setCaptionDrafts(rest);
    } catch (e: any) {
      setActionError(e.message || 'Löschen fehlgeschlagen');
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!entry) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = entry.images.findIndex(img => img.id === active.id);
    const newIndex = entry.images.findIndex(img => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistisches Update
    const reordered = arrayMove(entry.images, oldIndex, newIndex);
    setEntry({ ...entry, images: reordered });

    setActionError(null);
    try {
      const updated = await reorderImages(entry.id, reordered.map(img => img.id));
      setEntry({ ...entry, images: updated });
    } catch (e: any) {
      setActionError(e.message || 'Reorder fehlgeschlagen');
      // Refetch für konsistenten State
      try {
        const refreshed = await getEntry(entry.id);
        setEntry(refreshed);
      } catch { /* ignore */ }
    }
  }

  // ---------- Render ----------

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <Link to="/diary" className="text-xs text-text-muted hover:text-text-primary">
              ← Zurück zur Übersicht
            </Link>
            <h1 className="text-2xl font-medium text-text-primary mt-2">Eintrag bearbeiten</h1>
          </div>
          <button
            type="button"
            onClick={handleDeleteEntry}
            className="text-xs text-red-700 hover:text-red-900 underline"
          >
            Eintrag löschen
          </button>
        </div>

        {actionError && (
          <div className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
            {actionError}
          </div>
        )}

        {/* Eintrag-Meta */}
        <section className="mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Datum</label>
            <Datepicker value={entryDate} onChange={(v) => markEntryDirty(setEntryDate, v)} />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary mb-1">
              Beschreibung <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => markEntryDirty(setDescription, e.target.value)}
              rows={5}
              maxLength={10000}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-text-muted resize-y"
            />
          </div>

          {entryDirty && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveEntryMeta}
                disabled={savingEntry}
                className="px-4 py-2 rounded-lg bg-text-primary text-bg-primary text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingEntry ? 'Speichern...' : 'Änderungen speichern'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryDate(entry.entry_date);
                  setDescription(entry.description || '');
                  setEntryDirty(false);
                }}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                Verwerfen
              </button>
            </div>
          )}
        </section>

        {/* Bilder */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-text-primary">
              Bilder <span className="text-sm text-text-muted font-normal">({entry.images.length})</span>
            </h2>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="inline-block px-3 py-1.5 text-sm rounded-lg bg-text-primary text-bg-primary hover:opacity-90 transition-opacity">
                {uploading ? 'Lade hoch...' : '+ Bilder hinzufügen'}
              </span>
            </label>
          </div>

          {entry.images.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center border border-dashed border-border rounded-lg">
              Noch keine Bilder. Lade welche hoch über den Button oben rechts.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={entry.images.map(img => img.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entry.images.map((img, idx) => {
                    const draft = captionDrafts[img.id] ?? '';
                    const isDirty = draft.trim() !== (img.caption || '').trim();
                    return (
                      <SortableImage
                        key={img.id}
                        image={img}
                        onClick={() => setLightboxIndex(idx)}
                        onCaptionChange={(v) => setCaptionDrafts({ ...captionDrafts, [img.id]: v })}
                        onCaptionSave={() => handleCaptionSave(img.id)}
                        onDelete={() => handleDeleteImage(img.id)}
                        draftCaption={draft}
                        isDirty={isDirty}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {entry.images.length > 0 && (
            <p className="mt-3 text-xs text-text-muted">
              Tipp: Bilder mit dem Griff (oben links) per Drag & Drop sortieren.
            </p>
          )}
        </section>
      </div>

      {lightboxIndex !== null && entry.images.length > 0 && (
        <Lightbox
          images={entry.images.map(img => ({
            url: imageUrl(img.url),
            caption: img.caption,
          }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </Layout>
  );
}
