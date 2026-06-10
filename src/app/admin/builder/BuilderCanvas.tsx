'use client'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { arrayMove } from '@dnd-kit/sortable'
import type { PageBlock, BlockLiveData, BuilderAction, BlockType } from '@/types/builder'
import SortableBlock from './SortableBlock'

interface Props {
  blocks: PageBlock[]
  selectedId: string | null
  liveData: BlockLiveData
  dispatch: React.Dispatch<BuilderAction>
  onInsertAfter: (afterId: string, type: BlockType) => void
}

export default function BuilderCanvas({ blocks, selectedId, liveData, dispatch, onInsertAfter }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = blocks.findIndex(b => b.id === active.id)
    const to   = blocks.findIndex(b => b.id === over.id)
    dispatch({ type: 'REORDER', payload: arrayMove(blocks, from, to) })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={rectSortingStrategy}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            alignItems: 'start',
          }}
          onClick={() => dispatch({ type: 'SELECT', payload: null })}
        >
          {blocks.map(block => (
            <SortableBlock
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              liveData={liveData}
              onSelect={id => dispatch({ type: 'SELECT', payload: id })}
              onConfigChange={(id, config) => dispatch({ type: 'UPDATE_CONFIG', payload: { id, config } })}
              onDelete={id => dispatch({ type: 'DELETE_BLOCK', payload: id })}
              onDuplicate={id => dispatch({ type: 'DUPLICATE_BLOCK', payload: id })}
              onToggleVisible={id => dispatch({ type: 'TOGGLE_VISIBLE', payload: id })}
              onInsertAfter={onInsertAfter}
            />
          ))}

          {blocks.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px',
              border: '2px dashed rgba(200,155,60,0.25)', borderRadius: 12,
              color: 'var(--text-3)',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧱</div>
              <div style={{ fontSize: 9 }}>Click &ldquo;+ Add Block&rdquo; in the toolbar to get started</div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
