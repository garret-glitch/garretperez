'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PageBlock, AnyBlockConfig, BlockLiveData } from '@/types/builder'
import BlockRenderer from '@/components/builder/BlockRenderer'

interface Props {
  block: PageBlock
  isSelected: boolean
  liveData: BlockLiveData
  onSelect: (id: string) => void
  onConfigChange: (id: string, config: AnyBlockConfig) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleVisible: (id: string) => void
}

export default function SortableBlock({
  block, isSelected, liveData,
  onSelect, onConfigChange, onDelete, onDuplicate, onToggleVisible,
}: Props) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: block.id })

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition,
    opacity: isDragging ? 0.45 : block.visible ? 1 : 0.4,
    zIndex: isDragging ? 100 : undefined,
    position: 'relative',
    gridColumn: block.colSpan === 3 ? '1 / -1' : `span ${block.colSpan}`,
  }

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      onClick={e => { e.stopPropagation(); onSelect(block.id) }}
    >
      {/* Selection ring */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: -3, zIndex: 10, pointerEvents: 'none',
          outline: '2px solid var(--gold)', outlineOffset: 2, borderRadius: 4,
        }} />
      )}

      {/* Drag handle + action bar — only shows on hover/select */}
      <div
        style={{
          position: 'absolute', top: -22, left: 0, zIndex: 20,
          display: 'flex', gap: 3, alignItems: 'center',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: isSelected ? 'auto' : 'none',
        }}
        className="block-action-bar"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      >
        <div
          {...attributes}
          {...listeners}
          style={{
            background: 'var(--gold)', color: '#000', borderRadius: '3px 3px 0 0',
            padding: '3px 7px', fontSize: 7, fontWeight: 700, cursor: 'grab',
            userSelect: 'none',
          }}>
          ⠿ {block.type}
        </div>
        {[
          { icon: '⧉', title: 'Duplicate', onClick: () => onDuplicate(block.id) },
          { icon: block.visible ? '👁' : '🚫', title: 'Toggle Visibility', onClick: () => onToggleVisible(block.id) },
          { icon: '🗑', title: 'Delete', onClick: () => { if (confirm('Delete this block?')) onDelete(block.id) } },
        ].map(btn => (
          <button key={btn.title} onClick={e => { e.stopPropagation(); btn.onClick() }} title={btn.title}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: '3px 3px 0 0', padding: '3px 6px', fontSize: 8,
              cursor: 'pointer', color: btn.icon === '🗑' ? '#df5d5d' : 'var(--text-2)',
            }}>
            {btn.icon}
          </button>
        ))}
      </div>

      <BlockRenderer
        block={block}
        isEditing={isSelected}
        liveData={liveData}
        onConfigChange={(config) => onConfigChange(block.id, config)}
      />
    </div>
  )
}
