import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'

// Sortierbare Liste nach Repo-Konvention (dnd-kit, Griff ⋮⋮, touch-none).
// Jede Liste hat ihren eigenen DndContext, dadurch lassen sich Listen
// verschachteln (Unterseiten innerhalb einer Hauptseite).
export default function SortableList<T extends { id: number }>({
  items,
  onReorder,
  renderItem,
  className = 'space-y-2',
}: {
  items: T[]
  onReorder: (ids: number[]) => void
  renderItem: (item: T, handle: ReactNode) => ReactNode
  className?: string
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const ids = items.map(i => i.id)
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id}>
              {handle => renderItem(item, handle)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }: { id: number; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Verschieben"
      title="Zum Verschieben ziehen"
      className="cursor-grab touch-none select-none rounded px-2 py-1 text-lg leading-none text-alm-muted hover:bg-alm-sand hover:text-alm-stone active:cursor-grabbing"
    >
      ⋮⋮
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-80 shadow-lg' : undefined}
    >
      {children(handle)}
    </div>
  )
}
