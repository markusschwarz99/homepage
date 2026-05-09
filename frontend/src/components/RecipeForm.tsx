import { useEffect, useState, type FormEvent } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from './Button';
import { api, getToken } from '../lib/api';
import type { Recipe, RecipeInput, TagCategory } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

const COMMON_UNITS = ['', 'g', 'kg', 'ml', 'l', 'EL', 'TL', 'Stk', 'Prise'];

interface Props {
  initial?: Recipe;
  submitLabel: string;
  onSubmit: (data: RecipeInput) => Promise<void>;
}

interface IngredientRow {
  _uid: string;
  amount: string;
  unit: string;
  name: string;
}

interface StepRow {
  _uid: string;
  content: string;
}

interface ImageRow {
  url: string;
}

function newUid(): string {
  return crypto.randomUUID();
}

const inputClass =
  'w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-bg-primary focus:outline-none focus:border-text-muted';

// ---------- Sortable-Items ----------

function SortableIngredient(props: {
  row: IngredientRow;
  onChange: (field: 'amount' | 'unit' | 'name', value: string) => void;
  onRemove: () => void;
}) {
  const { row, onChange, onRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._uid });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_5rem_6rem_1fr_auto] gap-2 items-start"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label="Zutat verschieben"
      >
        ⋮⋮
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={row.amount}
        onChange={e => onChange('amount', e.target.value)}
        placeholder="Menge"
        className={`${inputClass} min-w-0`}
      />
      <input
        list="recipe-units"
        value={row.unit}
        onChange={e => onChange('unit', e.target.value)}
        placeholder="Einheit"
        className={`${inputClass} min-w-0`}
      />
      <input
        type="text"
        value={row.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Zutat"
        className={`${inputClass} min-w-0`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-red-500 hover:text-red-700 shrink-0"
        aria-label="entfernen"
      >
        ×
      </button>
    </div>
  );
}

function SortableStep(props: {
  row: StepRow;
  index: number;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const { row, index, onChange, onRemove } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row._uid });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1.5 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing touch-none select-none mt-1"
        aria-label="Schritt verschieben"
      >
        ⋮⋮
      </button>
      <span className="shrink-0 w-8 h-8 rounded-full bg-bg-secondary text-sm font-medium flex items-center justify-center mt-1">
        {index + 1}
      </span>
      <textarea
        value={row.content}
        onChange={e => onChange(e.target.value)}
        rows={3}
        placeholder="Schritt beschreiben..."
        className={`${inputClass} flex-1 resize-y`}
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-red-500 hover:text-red-700 shrink-0"
        aria-label="entfernen"
      >
        ×
      </button>
    </div>
  );
}

// ---------- Hauptkomponente ----------

export function RecipeForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [servings, setServings] = useState(initial?.servings ?? 4);
  const [servingsUnit, setServingsUnit] = useState(initial?.servings_unit ?? 'Portionen');

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.map(i => ({
      _uid: newUid(),
      amount: i.amount != null ? String(i.amount).replace('.', ',') : '',
      unit: i.unit,
      name: i.name,
    })) ?? [{ _uid: newUid(), amount: '', unit: '', name: '' }]
  );

  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps.map(s => ({ _uid: newUid(), content: s.content })) ??
      [{ _uid: newUid(), content: '' }]
  );

  const [images, setImages] = useState<ImageRow[]>(
    initial?.images.map(i => ({ url: i.url })) ?? []
  );

  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(
    new Set(initial?.tags.map(t => t.id) ?? [])
  );

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    api<TagCategory[]>('/tags').then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- Zutaten ---
  function updateIngredient(uid: string, field: 'amount' | 'unit' | 'name', value: string) {
    setIngredients(prev =>
      prev.map(i => (i._uid === uid ? { ...i, [field]: value } : i))
    );
  }
  function addIngredient() {
    setIngredients(prev => [...prev, { _uid: newUid(), amount: '', unit: '', name: '' }]);
  }
  function removeIngredient(uid: string) {
    setIngredients(prev => prev.filter(i => i._uid !== uid));
  }
  function handleIngredientDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setIngredients(prev => {
      const oldIndex = prev.findIndex(i => i._uid === active.id);
      const newIndex = prev.findIndex(i => i._uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // --- Schritte ---
  function updateStep(uid: string, value: string) {
    setSteps(prev => prev.map(s => (s._uid === uid ? { ...s, content: value } : s)));
  }
  function addStep() {
    setSteps(prev => [...prev, { _uid: newUid(), content: '' }]);
  }
  function removeStep(uid: string) {
    setSteps(prev => prev.filter(s => s._uid !== uid));
  }
  function handleStepDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps(prev => {
      const oldIndex = prev.findIndex(s => s._uid === active.id);
      const newIndex = prev.findIndex(s => s._uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  // --- Bilder (unverändert, Index-basiert) ---
  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: ImageRow[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/recipes/upload-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail ?? 'Upload fehlgeschlagen');
        }
        const data = await res.json();
        uploaded.push({ url: data.url });
      }
      setImages(prev => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Upload');
    } finally {
      setUploading(false);
    }
  }
  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, k) => k !== idx));
  }
  function moveImage(idx: number, dir: -1 | 1) {
    setImages(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  // --- Tags ---
  function toggleTag(id: number) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // --- Submit ---
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Bitte gib einen Titel ein.');
      return;
    }

    const cleanIngredients = ingredients
      .filter(i => i.name.trim())
      .map(i => {
        const raw = i.amount.replace(',', '.').trim();
        const amount = raw === '' ? null : parseFloat(raw);
        if (raw !== '' && (isNaN(amount!) || amount! < 0)) {
          throw new Error(`Ungültige Menge bei "${i.name}"`);
        }
        return { amount, unit: i.unit.trim(), name: i.name.trim() };
      });

    const cleanSteps = steps
      .filter(s => s.content.trim())
      .map(s => ({ content: s.content.trim() }));

    const payload: RecipeInput = {
      title: title.trim(),
      servings,
      servings_unit: servingsUnit.trim() || 'Portionen',
      ingredients: cleanIngredients,
      steps: cleanSteps,
      images: images.map(i => ({ url: i.url })),
      tag_ids: [...selectedTags],
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Titel */}
      <div>
        <label htmlFor="recipe-title" className="block text-xs text-text-muted mb-2">
          Titel
        </label>
        <input
          id="recipe-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          autoFocus
          className={inputClass}
        />
      </div>

      {/* Portionen */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="recipe-servings" className="block text-xs text-text-muted mb-2">
            Anzahl
          </label>
          <input
            id="recipe-servings"
            type="number"
            min={1}
            value={servings}
            onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="recipe-servings-unit" className="block text-xs text-text-muted mb-2">
            Einheit
          </label>
          <input
            id="recipe-servings-unit"
            type="text"
            value={servingsUnit}
            onChange={e => setServingsUnit(e.target.value)}
            placeholder="Portionen"
            className={inputClass}
          />
        </div>
      </div>

      {/* Bilder */}
      <div>
        <label className="block text-xs text-text-muted mb-2">
          Bilder{' '}
          {images.length > 0 && (
            <span className="text-text-hint">(erstes = Titelbild)</span>
          )}
        </label>
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative group aspect-square rounded-lg overflow-hidden border border-border"
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded bg-white/90 text-black text-sm disabled:opacity-30"
                    aria-label="nach links"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(idx, 1)}
                    disabled={idx === images.length - 1}
                    className="w-7 h-7 rounded bg-white/90 text-black text-sm disabled:opacity-30"
                    aria-label="nach rechts"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="w-7 h-7 rounded bg-red-500 text-white text-sm"
                    aria-label="entfernen"
                  >
                    ×
                  </button>
                </div>
                {idx === 0 && (
                  <span className="absolute top-1 left-1 text-[10px] bg-accent text-bg-primary px-1.5 py-0.5 rounded">
                    Titel
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <label className="inline-block cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleImageUpload(e.target.files)}
            disabled={uploading}
            className="hidden"
          />
          <span className="inline-block text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-primary hover:bg-bg-secondary transition-colors">
            {uploading ? 'Lade hoch...' : '+ Bilder hinzufügen'}
          </span>
        </label>
      </div>

      {/* Zutaten */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Zutaten</label>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleIngredientDragEnd}
        >
          <SortableContext
            items={ingredients.map(i => i._uid)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {ingredients.map(ing => (
                <SortableIngredient
                  key={ing._uid}
                  row={ing}
                  onChange={(field, value) => updateIngredient(ing._uid, field, value)}
                  onRemove={() => removeIngredient(ing._uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <datalist id="recipe-units">
          {COMMON_UNITS.filter(u => u).map(u => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-xs text-text-muted hover:text-text-primary"
        >
          + Zutat hinzufügen
        </button>
      </div>

      {/* Schritte */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Zubereitung</label>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleStepDragEnd}
        >
          <SortableContext
            items={steps.map(s => s._uid)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <SortableStep
                  key={step._uid}
                  row={step}
                  index={idx}
                  onChange={value => updateStep(step._uid, value)}
                  onRemove={() => removeStep(step._uid)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={addStep}
          className="mt-2 text-xs text-text-muted hover:text-text-primary"
        >
          + Schritt hinzufügen
        </button>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-text-muted mb-2">Tags</label>
        {categories.length === 0 ? (
          <p className="text-xs text-text-hint p-4 bg-bg-secondary rounded-lg">
            Noch keine Tag-Kategorien vorhanden. Ein Admin muss zuerst im Admin-Bereich
            Kategorien und Tags anlegen.
          </p>
        ) : categories.every(c => c.tags.length === 0) ? (
          <p className="text-xs text-text-hint p-4 bg-bg-secondary rounded-lg">
            Es gibt bereits Kategorien ({categories.map(c => c.name).join(', ')}), aber
            noch keine Tags darin. Ein Admin muss im Admin-Bereich in diese Kategorien
            Tags hinzufügen.
          </p>
        ) : (
          <div className="space-y-3 p-4 bg-bg-secondary rounded-lg">
            {categories.map(
              cat =>
                cat.tags.length > 0 && (
                  <div key={cat.id}>
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">
                      {cat.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cat.tags.map(tag => {
                        const active = selectedTags.has(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                              active
                                ? 'bg-accent text-bg-primary'
                                : 'bg-bg-primary border border-border text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting || uploading}>
        {submitting ? 'Speichere...' : submitLabel}
      </Button>
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
    </form>
  );
}
