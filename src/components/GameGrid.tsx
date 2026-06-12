'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface GameDef {
  icon: string
  title: string
  desc: string
  href: string
  xp: string
  bg: string
  glow: string
}

function applyOrder(defs: GameDef[], order: string[]): GameDef[] {
  if (!order.length) return defs
  const map = new Map(defs.map(g => [g.href, g]))
  const result: GameDef[] = []
  order.forEach(href => { const g = map.get(href); if (g) result.push(g) })
  const inOrder = new Set(order)
  defs.forEach(g => { if (!inOrder.has(g.href)) result.push(g) })
  return result
}

function CardContent({ game, isHidden, isAdmin, editMode }: {
  game: GameDef
  isHidden: boolean
  isAdmin: boolean
  editMode: boolean
}) {
  const inner = (
    <>
      <span style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(0 0 6px ${game.glow}99)` }}>
        {game.icon}
      </span>
      <div className="text-center">
        <div className="text-[9px] font-bold mb-0.5" style={{ color: '#e8e4d8' }}>{game.title}</div>
        <div className="text-[6px] mb-1 body-text" style={{ color: 'rgba(160,152,128,0.7)' }}>{game.desc}</div>
        <div className="text-[6px] font-bold" style={{ color: game.glow }}>{game.xp}</div>
      </div>
    </>
  )

  const sharedStyle: React.CSSProperties = {
    background: game.bg,
    border: `1px solid ${isHidden ? 'rgba(255,85,85,0.25)' : game.glow + '33'}`,
    boxShadow: `0 2px 12px ${game.glow}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
    opacity: isHidden ? 0.38 : 1,
    filter: isHidden ? 'grayscale(0.55)' : 'none',
    display: 'flex',
    outline: editMode ? `1px dashed ${game.glow}55` : 'none',
  }

  if (editMode) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl"
        style={{ ...sharedStyle, cursor: 'grab' }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={game.href}
      className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all duration-150 hover:scale-105 hover:brightness-110"
      style={{
        ...sharedStyle,
        pointerEvents: isHidden && !isAdmin ? 'none' : 'auto',
      }}
    >
      {inner}
    </Link>
  )
}

function SortableGameCard({
  game, isHidden, isBusy, isAdmin, editMode, onToggle,
}: {
  game: GameDef
  isHidden: boolean
  isBusy: boolean
  isAdmin: boolean
  editMode: boolean
  onToggle: (href: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.href,
    disabled: !editMode,
  })

  return (
    <div
      ref={setNodeRef}
      {...(editMode ? attributes : {})}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 50 : 1,
      }}
    >
      {/* Drag handle — edit mode only */}
      {editMode && (
        <div
          {...listeners}
          title="Drag to reorder"
          style={{
            position: 'absolute', top: 7, left: 8, zIndex: 15,
            color: 'rgba(200,155,60,0.75)',
            fontSize: 13, lineHeight: 1,
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          ⠿
        </div>
      )}

      {/* Visibility toggle — always shown to admin */}
      {isAdmin && (
        <button
          onClick={() => onToggle(game.href)}
          title={isHidden ? 'Show for all users' : 'Hide from users'}
          style={{
            position: 'absolute', top: 7, right: 7, zIndex: 10,
            background: 'rgba(0,0,0,0.82)',
            border: `1px solid ${isHidden ? '#FF555566' : '#4CAF5066'}`,
            borderRadius: 5, cursor: isBusy ? 'wait' : 'pointer',
            fontSize: 13, padding: '3px 5px', lineHeight: 1,
            opacity: isBusy ? 0.5 : 1,
            color: isHidden ? '#FF5555' : '#4CAF50',
          }}
        >
          {isHidden ? '🚫' : '👁'}
        </button>
      )}

      <CardContent game={game} isHidden={isHidden} isAdmin={isAdmin} editMode={editMode} />

      {/* HIDDEN badge overlay */}
      {isAdmin && isHidden && (
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 6,
            color: '#FF6666', background: 'rgba(0,0,0,0.8)',
            padding: '2px 6px', borderRadius: 3,
            border: '1px solid rgba(255,85,85,0.4)',
          }}>
            HIDDEN
          </span>
        </div>
      )}
    </div>
  )
}

export default function GameGrid({
  games,
  initialHidden,
  initialOrder,
  isAdmin,
}: {
  games: GameDef[]
  initialHidden: string[]
  initialOrder: string[]
  isAdmin: boolean
}) {
  const [orderedGames, setOrderedGames] = useState<GameDef[]>(() => applyOrder(games, initialOrder))
  const savedRef = useRef<GameDef[]>(applyOrder(games, initialOrder))
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden))
  const [busy, setBusy] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  async function toggle(href: string) {
    if (busy) return
    setBusy(href)
    const willHide = !hidden.has(href)
    setHidden(prev => {
      const next = new Set(prev)
      willHide ? next.add(href) : next.delete(href)
      return next
    })
    try {
      const res = await fetch('/api/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, hide: willHide }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setHidden(prev => {
        const next = new Set(prev)
        willHide ? next.delete(href) : next.add(href)
        return next
      })
    }
    setBusy(null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setOrderedGames(prev => {
      const from = prev.findIndex(g => g.href === active.id)
      const to = prev.findIndex(g => g.href === over.id)
      return arrayMove(prev, from, to)
    })
  }

  async function saveOrder() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/game-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderedGames.map(g => g.href) }),
      })
      if (!res.ok) throw new Error()
      savedRef.current = orderedGames
      setEditMode(false)
    } catch { /* stay in edit mode on failure */ }
    setSaving(false)
  }

  function cancelEdit() {
    setOrderedGames(savedRef.current)
    setEditMode(false)
  }

  const displayGames = isAdmin ? orderedGames : orderedGames.filter(g => !hidden.has(g.href))

  return (
    <div>
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8, alignItems: 'center' }}>
          {editMode ? (
            <>
              <span style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 6,
                color: '#a09880', marginRight: 4,
              }}>
                drag to reorder
              </span>
              <button onClick={cancelEdit} style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 7,
                padding: '5px 10px',
                background: 'rgba(0,0,0,0.4)', color: '#a09880',
                border: '1px solid #2a2820', borderRadius: 5, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={saveOrder} disabled={saving} style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 7,
                padding: '5px 10px',
                background: 'linear-gradient(135deg,#c89b3c,#a07830)', color: '#0d0d14',
                border: '1px solid #c89b3c', borderRadius: 5,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Saving…' : '✓ Save Order'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 7,
              padding: '5px 10px',
              background: 'rgba(0,0,0,0.4)', color: '#a09880',
              border: '1px solid #2a2820', borderRadius: 5, cursor: 'pointer',
            }}>
              ⠿ Edit Order
            </button>
          )}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayGames.map(g => g.href)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayGames.map(g => (
              <SortableGameCard
                key={g.href}
                game={g}
                isHidden={hidden.has(g.href)}
                isBusy={busy === g.href}
                isAdmin={isAdmin}
                editMode={editMode}
                onToggle={toggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
