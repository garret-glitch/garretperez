'use client'
import { useState, useEffect, useRef } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { PageBlock, AboutBlockConfig, AboutBubble } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing: boolean
  onConfigChange?: (config: AboutBlockConfig) => void
}

// Normalise old bio1/bio2/bio3 format or missing bubbles array
function normalizeCfg(raw: AboutBlockConfig): AboutBlockConfig {
  if (raw.bubbles && raw.bubbles.length > 0) return raw
  const legacy = [raw.bio1, raw.bio2, raw.bio3].filter(Boolean)
  return {
    ...raw,
    bubbles: legacy.length
      ? legacy.map((c, i) => ({ id: `legacy-${i}`, content: c! }))
      : [{ id: 'b0', content: '' }],
  }
}

function uid() {
  return `b-${Math.random().toString(36).slice(2, 9)}`
}

// ── Single draggable bubble row ─────────────────────────────────────────────
interface BubbleRowProps {
  bubble: AboutBubble
  index: number
  total: number
  bPx: number
  isFocused: boolean
  onChange: (id: string, content: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  setRef: (id: string, el: HTMLTextAreaElement | null) => void
}

function BubbleRow({
  bubble, index, total, bPx, isFocused,
  onChange, onDuplicate, onDelete, onMoveUp, onMoveDown, setRef,
}: BubbleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bubble.id })

  const isOnly = total === 1

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform) ?? undefined,
        transition,
        opacity: isDragging ? 0.45 : 1,
        display: 'flex',
        gap: 6,
        alignItems: 'flex-start',
        background: isDragging ? 'rgba(200,155,60,0.12)' : 'transparent',
        borderRadius: 6,
        padding: '3px 0',
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
        style={{
          cursor: 'grab', color: 'rgba(58,30,6,0.4)', fontSize: 14,
          paddingTop: 10, paddingLeft: 2, userSelect: 'none', flexShrink: 0,
        }}
      >
        ⠿
      </div>

      {/* Textarea */}
      <textarea
        ref={el => setRef(bubble.id, el)}
        value={bubble.content}
        autoFocus={isFocused}
        onChange={e => onChange(bubble.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        placeholder="Write something here…"
        rows={3}
        style={{
          flex: 1,
          background: 'rgba(200,155,60,0.08)',
          border: '1px solid rgba(200,155,60,0.35)',
          borderRadius: 4,
          padding: '6px 8px',
          color: '#3a2810',
          fontSize: bPx,
          fontFamily: 'Inter, system-ui',
          resize: 'vertical',
          minHeight: 54,
          outline: 'none',
        }}
      />

      {/* Action column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
        <Btn onClick={() => onMoveUp(bubble.id)} disabled={index === 0} title="Move up">↑</Btn>
        <Btn onClick={() => onMoveDown(bubble.id)} disabled={index === total - 1} title="Move down">↓</Btn>
        <Btn onClick={() => onDuplicate(bubble.id)} title="Duplicate">⧉</Btn>
        <Btn
          onClick={() => {
            if (isOnly) return
            if (confirm('Delete this bubble?')) onDelete(bubble.id)
          }}
          disabled={isOnly}
          title={isOnly ? 'Cannot delete the last bubble' : 'Delete bubble'}
          danger
        >🗑</Btn>
      </div>
    </div>
  )
}

// ── Tiny button helper ──────────────────────────────────────────────────────
function Btn({ children, onClick, disabled, title, danger }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
}) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      disabled={disabled}
      title={title}
      style={{
        background: 'rgba(200,155,60,0.12)',
        border: '1px solid rgba(200,155,60,0.28)',
        borderRadius: 3,
        padding: '3px 0',
        width: 26,
        fontSize: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: danger ? (disabled ? '#aaa' : '#df5d5d') : '#3a2810',
        fontWeight: 600,
        opacity: disabled ? 0.38 : 1,
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AboutBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = normalizeCfg(block.config as AboutBlockConfig)
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 12
  const hFont = block.styles.headingFont ?? undefined
  const hColor = block.styles.headingColor ?? '#3a1e06'
  const bColor = block.styles.textColor ?? '#3a2810'

  const [focusId, setFocusId] = useState<string | null>(null)
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})

  useEffect(() => {
    if (focusId && textareaRefs.current[focusId]) {
      textareaRefs.current[focusId]!.focus()
      setFocusId(null)
    }
  }, [focusId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const update = (bubbles: AboutBubble[]) =>
    onConfigChange?.({ ...cfg, bubbles })

  const handleChange = (id: string, content: string) =>
    update(cfg.bubbles.map(b => b.id === id ? { ...b, content } : b))

  const handleAdd = () => {
    const id = uid()
    update([...cfg.bubbles, { id, content: '' }])
    setFocusId(id)
  }

  const handleDuplicate = (id: string) => {
    const src = cfg.bubbles.find(b => b.id === id)
    if (!src) return
    const clone = { id: uid(), content: src.content }
    const idx = cfg.bubbles.findIndex(b => b.id === id)
    const next = [...cfg.bubbles]
    next.splice(idx + 1, 0, clone)
    update(next)
    setFocusId(clone.id)
  }

  const handleDelete = (id: string) => {
    if (cfg.bubbles.length <= 1) return
    update(cfg.bubbles.filter(b => b.id !== id))
  }

  const handleMoveUp = (id: string) => {
    const idx = cfg.bubbles.findIndex(b => b.id === id)
    if (idx <= 0) return
    update(arrayMove(cfg.bubbles, idx, idx - 1))
  }

  const handleMoveDown = (id: string) => {
    const idx = cfg.bubbles.findIndex(b => b.id === id)
    if (idx >= cfg.bubbles.length - 1) return
    update(arrayMove(cfg.bubbles, idx, idx + 1))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = cfg.bubbles.findIndex(b => b.id === active.id)
    const to = cfg.bubbles.findIndex(b => b.id === over.id)
    update(arrayMove(cfg.bubbles, from, to))
  }

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={{ ...style }}>

        {/* Heading */}
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <input
              value={cfg.headingIcon}
              onChange={e => onConfigChange?.({ ...cfg, headingIcon: e.target.value })}
              onClick={e => e.stopPropagation()}
              style={{ width: 36, textAlign: 'center', background: 'rgba(200,155,60,0.08)',
                border: '1px solid rgba(200,155,60,0.3)', borderRadius: 4, padding: '4px',
                fontSize: 16 }}
            />
            <input
              value={cfg.headingText}
              onChange={e => onConfigChange?.({ ...cfg, headingText: e.target.value })}
              onClick={e => e.stopPropagation()}
              style={{ flex: 1, background: 'rgba(200,155,60,0.08)',
                border: '1px solid rgba(200,155,60,0.3)', borderRadius: 4,
                padding: '4px 8px', color: '#3a1e06', fontSize: hPx, fontWeight: 700 }}
            />
          </div>
        ) : (
          <h2 className="mb-3 flex items-center gap-2"
            style={{ fontSize: hPx, color: hColor, fontFamily: hFont }}>
            <span>{cfg.headingIcon}</span> {cfg.headingText}
          </h2>
        )}

        {/* Bubbles */}
        <div className="body-text">
          {isEditing ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={cfg.bubbles.map(b => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cfg.bubbles.map((bubble, i) => (
                      <BubbleRow
                        key={bubble.id}
                        bubble={bubble}
                        index={i}
                        total={cfg.bubbles.length}
                        bPx={bPx}
                        isFocused={focusId === bubble.id}
                        onChange={handleChange}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        setRef={(id, el) => { textareaRefs.current[id] = el }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add bubble button */}
              <button
                onClick={e => { e.stopPropagation(); handleAdd() }}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '6px 0',
                  background: 'rgba(200,155,60,0.1)',
                  border: '1px dashed rgba(200,155,60,0.5)',
                  borderRadius: 5,
                  color: '#8a5c18',
                  fontSize: 8,
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  fontWeight: 700,
                }}
              >
                + Add Bubble
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cfg.bubbles.map(b => b.content
                ? <p key={b.id} style={{ fontSize: bPx, color: bColor, margin: 0 }}>{b.content}</p>
                : null
              )}
            </div>
          )}
        </div>

      </div>
      <div className="scroll-roll" />
    </>
  )
}
