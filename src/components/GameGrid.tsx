'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
  featured?: boolean
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

function FeaturedGameCard({
  game, isHidden, isBusy, isAdmin, onToggle,
  likeCount, isLiked, isLoggedIn, onLike, likeBusy,
}: {
  game: GameDef
  isHidden: boolean
  isBusy: boolean
  isAdmin: boolean
  onToggle: (href: string) => void
  likeCount: number
  isLiked: boolean
  isLoggedIn: boolean
  onLike: (href: string) => void
  likeBusy: boolean
}) {
  const cardContent = (
    <div className="flex flex-col sm:flex-row" style={{ position: 'relative', minHeight: 0 }}>

      {/* ── Visual panel ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center gap-2 border-b sm:border-b-0 sm:border-r"
        style={{
          borderColor: 'rgba(176,48,96,0.2)',
          padding: '20px 18px',
          background: 'linear-gradient(180deg, rgba(176,48,96,0.22) 0%, rgba(90,6,26,0.14) 60%, rgba(40,4,14,0.08) 100%)',
          position: 'relative',
          minHeight: 130,
          width: 190,
        }}
      >
        {/* Atmosphere bloom */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 85% at 50% 38%, rgba(200,40,90,0.13) 0%, transparent 68%)', pointerEvents: 'none' }} />
        {/* Top glimmer line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.4) 40%, rgba(200,155,60,0.4) 60%, transparent)', pointerEvents: 'none' }} />

        {/* Shelf 1 */}
        <div className="flex items-end gap-1 relative" style={{ zIndex: 1 }}>
          <span style={{ fontSize: 30, filter: 'drop-shadow(0 5px 12px rgba(176,48,96,0.9))' }}>🍷</span>
          <span style={{ fontSize: 40, filter: 'drop-shadow(0 5px 14px rgba(130,8,44,0.95))' }}>🍾</span>
          <span style={{ fontSize: 34, filter: 'drop-shadow(0 5px 12px rgba(176,48,96,0.85))' }}>🍷</span>
          <span style={{ fontSize: 26, filter: 'drop-shadow(0 4px 10px rgba(176,48,96,0.7))', opacity: 0.85 }}>🍾</span>
        </div>

        {/* Gold shelf plank 1 */}
        <div style={{
          width: '92%', height: 3, position: 'relative', zIndex: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.5) 12%, rgba(220,175,70,0.95) 50%, rgba(200,155,60,0.5) 88%, transparent)',
          borderRadius: 2, boxShadow: '0 2px 8px rgba(200,155,60,0.28)',
        }} />

        {/* Shelf 2 — desktop only */}
        <div className="hidden sm:flex items-end gap-1.5 relative" style={{ zIndex: 1 }}>
          <span style={{ fontSize: 26, filter: 'drop-shadow(0 4px 10px rgba(176,48,96,0.7))', opacity: 0.88 }}>🍾</span>
          <span style={{ fontSize: 32, filter: 'drop-shadow(0 4px 12px rgba(130,8,44,0.88))', opacity: 0.94 }}>🍷</span>
          <span style={{ fontSize: 24, filter: 'drop-shadow(0 4px 10px rgba(176,48,96,0.65))', opacity: 0.80 }}>🍾</span>
        </div>

        {/* Gold shelf plank 2 — desktop only */}
        <div className="hidden sm:block" style={{
          width: '82%', height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.4) 15%, rgba(200,155,60,0.75) 50%, rgba(200,155,60,0.4) 85%, transparent)',
          borderRadius: 1, position: 'relative', zIndex: 1,
        }} />

        {/* Manager peeking — desktop only */}
        <div className="hidden sm:flex items-center justify-center gap-2 relative" style={{ zIndex: 1, marginTop: 2 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}>😊</span>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 4.5, color: 'rgba(200,155,60,0.45)', letterSpacing: '0.12em' }}>MANAGER</span>
        </div>
      </div>

      {/* ── Content panel ────────────────────────────────── */}
      <div style={{ flex: 1, padding: '20px 22px 18px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>

        {/* Badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 5.5,
            color: '#c89b3c', letterSpacing: '0.14em',
            border: '1px solid rgba(200,155,60,0.38)', padding: '3px 8px',
            background: 'rgba(200,155,60,0.08)',
          }}>★ FEATURED</span>
          <span style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 5.5,
            color: 'rgba(110,220,130,0.9)', letterSpacing: '0.1em',
            border: '1px solid rgba(100,200,120,0.32)', padding: '3px 7px',
            background: 'rgba(100,210,120,0.07)',
          }}>● LIVE</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(20px, 3.8vw, 28px)', fontWeight: 700,
          color: '#f6f0e4', margin: 0,
          letterSpacing: '0.055em', lineHeight: 1.1,
          textShadow: '0 0 36px rgba(190,40,90,0.55), 0 1px 3px rgba(0,0,0,0.95)',
        }}>
          {game.title}
        </h2>

        {/* Description */}
        <p className="body-text" style={{ fontSize: 12.5, color: 'rgba(218,190,152,0.88)', margin: 0, lineHeight: 1.68 }}>
          {game.desc}
        </p>

        {/* Info chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { icon: '🍷', label: '6 wines' },
            { icon: '👔', label: 'Beat the boss' },
            { icon: '⚡', label: '5 power-ups' },
            { icon: '🏆', label: 'Leaderboard' },
          ].map(chip => (
            <div key={chip.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(176,48,96,0.1)', border: '1px solid rgba(176,48,96,0.22)',
              padding: '3px 9px', borderRadius: 20,
              fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(228,198,162,0.9)',
              letterSpacing: '0.01em',
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>{chip.icon}</span>
              {chip.label}
            </div>
          ))}
        </div>

        {/* Power-up preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5, color: 'rgba(200,155,60,0.42)', letterSpacing: '0.09em', whiteSpace: 'nowrap' }}>POWER-UPS</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['⚡','🏗','📦','⭐','💰'].map(em => (
              <span key={em} style={{ fontSize: 14, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.55))', opacity: 0.88, lineHeight: 1 }}>{em}</span>
            ))}
          </div>
        </div>

        {/* XP badge + play CTA */}
        <div className="flex flex-wrap items-center gap-3" style={{ paddingTop: 2 }}>
          <span style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 6.5,
            color: '#c0426a', background: 'rgba(176,48,96,0.13)',
            border: '1px solid rgba(176,48,96,0.3)', padding: '5px 10px',
            letterSpacing: '0.03em',
          }}>
            +25 XP · 400+ PTS
          </span>
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 800,
            color: '#faf0e6',
            background: 'linear-gradient(135deg, #b03060 0%, #7a1030 55%, #a02050 100%)',
            border: '1px solid rgba(210,80,120,0.55)',
            padding: '9px 22px',
            letterSpacing: '0.07em',
            boxShadow: '0 0 22px rgba(176,48,96,0.35), inset 0 1px 0 rgba(255,130,160,0.18)',
            textTransform: 'uppercase',
          }}>
            ▶ Start Shift
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', marginBottom: 16, opacity: isHidden ? 0.38 : 1, filter: isHidden ? 'grayscale(0.55)' : 'none' }}>

      {/* Admin visibility toggle */}
      {isAdmin && (
        <button
          onClick={() => onToggle(game.href)}
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 20,
            background: 'rgba(0,0,0,0.82)',
            border: `1px solid ${isHidden ? '#FF555566' : '#4CAF5066'}`,
            borderRadius: 5, cursor: isBusy ? 'wait' : 'pointer',
            fontSize: 13, padding: '3px 5px', lineHeight: 1,
            opacity: isBusy ? 0.5 : 1, color: isHidden ? '#FF5555' : '#4CAF50',
          }}
        >
          {isHidden ? '🚫' : '👁'}
        </button>
      )}

      {/* Card */}
      <Link
        href={game.href}
        className="block transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(145deg, #1e0d18 0%, #0f0609 45%, #1a0b14 100%)',
          border: '1px solid rgba(176,48,96,0.35)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 36px rgba(176,48,96,0.2), 0 2px 10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(200,155,60,0.08)',
          textDecoration: 'none',
          pointerEvents: isHidden && !isAdmin ? 'none' : 'auto',
          display: 'block',
        }}
      >
        {cardContent}
      </Link>

      {/* Like button */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isLoggedIn) onLike(game.href) }}
        title={isLoggedIn ? (isLiked ? 'Unlike' : 'Like') : 'Log in to like'}
        style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 10,
          background: 'rgba(0,0,0,0.72)',
          border: `1px solid ${isLiked ? 'rgba(176,48,96,0.65)' : '#2a282055'}`,
          borderRadius: 5,
          cursor: isLoggedIn ? (likeBusy ? 'wait' : 'pointer') : 'default',
          fontSize: 10, padding: '3px 7px', lineHeight: 1,
          color: isLiked ? '#c03068' : 'rgba(160,152,128,0.45)',
          display: 'flex', alignItems: 'center', gap: 3,
          opacity: likeBusy ? 0.6 : 1,
          transition: 'color 0.15s, border-color 0.15s',
        }}
      >
        <span style={{ fontSize: 12 }}>{isLiked ? '♥' : '♡'}</span>
        {likeCount > 0 && <span style={{ fontSize: 9 }}>{likeCount}</span>}
      </button>

      {/* Hidden badge */}
      {isAdmin && isHidden && (
        <div style={{ position: 'absolute', top: 14, left: 14, pointerEvents: 'none' }}>
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

function SortableGameCard({
  game, isHidden, isBusy, isAdmin, editMode, onToggle,
  likeCount, isLiked, isLoggedIn, onLike, likeBusy,
}: {
  game: GameDef
  isHidden: boolean
  isBusy: boolean
  isAdmin: boolean
  editMode: boolean
  onToggle: (href: string) => void
  likeCount: number
  isLiked: boolean
  isLoggedIn: boolean
  onLike: (href: string) => void
  likeBusy: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: game.href,
    disabled: !editMode,
  })

  const cardStyle: React.CSSProperties = {
    background: game.bg,
    border: `1px solid ${isHidden ? 'rgba(255,85,85,0.25)' : game.glow + '33'}`,
    boxShadow: `0 2px 12px ${game.glow}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
    opacity: isHidden ? 0.38 : 1,
    filter: isHidden ? 'grayscale(0.55)' : 'none',
    display: 'flex',
    outline: editMode ? `1px dashed ${game.glow}55` : 'none',
  }

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

  return (
    <div
      ref={setNodeRef}
      {...(editMode ? { ...attributes, ...listeners } : {})}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0 : 1,
        position: 'relative',
        zIndex: isDragging ? 50 : 1,
        touchAction: editMode ? 'none' : 'auto',
        cursor: editMode ? 'grab' : 'default',
      }}
    >
      {/* Drag handle — visual cue only */}
      {editMode && (
        <div style={{
          position: 'absolute', top: 7, left: 8, zIndex: 15,
          color: 'rgba(200,155,60,0.8)',
          fontSize: 13, lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          ⠿
        </div>
      )}

      {/* Visibility toggle */}
      {isAdmin && (
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onToggle(game.href)}
          title={isHidden ? 'Show for all users' : 'Hide from users'}
          style={{
            position: 'absolute', top: 7, right: 7, zIndex: 20,
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

      {/* Card body */}
      {editMode ? (
        <div className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl" style={cardStyle}>
          {inner}
        </div>
      ) : (
        <Link
          href={game.href}
          className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all duration-150 hover:scale-105 hover:brightness-110"
          style={{ ...cardStyle, pointerEvents: isHidden && !isAdmin ? 'none' : 'auto' }}
        >
          {inner}
        </Link>
      )}

      {/* Like button */}
      {!editMode && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isLoggedIn) onLike(game.href) }}
          title={isLoggedIn ? (isLiked ? 'Unlike' : 'Like') : 'Log in to like'}
          style={{
            position: 'absolute', bottom: 7, right: 7, zIndex: 10,
            background: 'rgba(0,0,0,0.72)',
            border: `1px solid ${isLiked ? game.glow + '88' : '#2a282055'}`,
            borderRadius: 5,
            cursor: isLoggedIn ? (likeBusy ? 'wait' : 'pointer') : 'default',
            fontSize: 10, padding: '2px 5px', lineHeight: 1,
            color: isLiked ? game.glow : 'rgba(160,152,128,0.45)',
            display: 'flex', alignItems: 'center', gap: 3,
            opacity: likeBusy ? 0.6 : 1,
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          <span style={{ fontSize: 11 }}>{isLiked ? '♥' : '♡'}</span>
          {likeCount > 0 && <span style={{ fontSize: 8 }}>{likeCount}</span>}
        </button>
      )}

      {/* HIDDEN badge */}
      {isAdmin && isHidden && (
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none',
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
  isLoggedIn,
  initialLikeCounts,
  initialUserLikes,
}: {
  games: GameDef[]
  initialHidden: string[]
  initialOrder: string[]
  isAdmin: boolean
  isLoggedIn: boolean
  initialLikeCounts: Record<string, number>
  initialUserLikes: string[]
}) {
  const [orderedGames, setOrderedGames] = useState<GameDef[]>(() => applyOrder(games, initialOrder))
  const savedRef = useRef<GameDef[]>(applyOrder(games, initialOrder))
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden))
  const [busy, setBusy] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(initialLikeCounts)
  const [likedHrefs, setLikedHrefs] = useState<Set<string>>(new Set(initialUserLikes))
  const [likeBusy, setLikeBusy] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  async function toggle(href: string) {
    if (busy) return
    setBusy(href)
    const willHide = !hidden.has(href)
    setHidden(prev => { const s = new Set(prev); if (willHide) s.add(href); else s.delete(href); return s })
    try {
      const res = await fetch('/api/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, hide: willHide }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setHidden(prev => { const s = new Set(prev); if (willHide) s.delete(href); else s.add(href); return s })
    }
    setBusy(null)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
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
    } catch { /* stay in edit mode */ }
    setSaving(false)
  }

  function cancelEdit() {
    setOrderedGames(savedRef.current)
    setEditMode(false)
  }

  async function handleLike(href: string) {
    if (likeBusy) return
    setLikeBusy(href)
    const wasLiked = likedHrefs.has(href)
    setLikedHrefs(prev => { const s = new Set(prev); if (wasLiked) s.delete(href); else s.add(href); return s })
    setLikeCounts(prev => ({ ...prev, [href]: Math.max(0, (prev[href] ?? 0) + (wasLiked ? -1 : 1)) }))
    try {
      const res = await fetch('/api/game-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLikeCounts(prev => ({ ...prev, [href]: data.count }))
    } catch {
      setLikedHrefs(prev => { const s = new Set(prev); if (wasLiked) s.add(href); else s.delete(href); return s })
      setLikeCounts(prev => ({ ...prev, [href]: Math.max(0, (prev[href] ?? 0) + (wasLiked ? 1 : -1)) }))
    }
    setLikeBusy(null)
  }

  const displayGames = isAdmin ? orderedGames : orderedGames.filter(g => !hidden.has(g.href))
  const featuredGames = displayGames.filter(g => g.featured)
  const regularGames = displayGames.filter(g => !g.featured)
  const activeGame = activeId ? orderedGames.find(g => g.href === activeId) : null

  return (
    <div>
      {/* ── Featured cards (rendered outside the drag grid) ── */}
      {featuredGames.map(g => (
        <FeaturedGameCard
          key={g.href}
          game={g}
          isHidden={hidden.has(g.href)}
          isBusy={busy === g.href}
          isAdmin={isAdmin}
          onToggle={toggle}
          likeCount={likeCounts[g.href] ?? 0}
          isLiked={likedHrefs.has(g.href)}
          isLoggedIn={isLoggedIn}
          onLike={handleLike}
          likeBusy={likeBusy === g.href}
        />
      ))}

      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 8, alignItems: 'center' }}>
          {editMode ? (
            <>
              <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#a09880', marginRight: 4 }}>
                drag to reorder
              </span>
              <button onClick={cancelEdit} style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 7, padding: '5px 10px',
                background: 'rgba(0,0,0,0.4)', color: '#a09880',
                border: '1px solid #2a2820', borderRadius: 5, cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={saveOrder} disabled={saving} style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 7, padding: '5px 10px',
                background: 'linear-gradient(135deg,#c89b3c,#a07830)', color: '#0d0d14',
                border: '1px solid #c89b3c', borderRadius: 5,
                cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Saving…' : '✓ Save Order'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 7, padding: '5px 10px',
              background: 'rgba(0,0,0,0.4)', color: '#a09880',
              border: '1px solid #2a2820', borderRadius: 5, cursor: 'pointer',
            }}>
              ⠿ Edit Order
            </button>
          )}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={regularGames.map(g => g.href)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {regularGames.map(g => (
              <SortableGameCard
                key={g.href}
                game={g}
                isHidden={hidden.has(g.href)}
                isBusy={busy === g.href}
                isAdmin={isAdmin}
                editMode={editMode}
                onToggle={toggle}
                likeCount={likeCounts[g.href] ?? 0}
                isLiked={likedHrefs.has(g.href)}
                isLoggedIn={isLoggedIn}
                onLike={handleLike}
                likeBusy={likeBusy === g.href}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeGame ? (
            <div
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl"
              style={{
                background: activeGame.bg,
                border: `1px solid ${activeGame.glow}66`,
                boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 24px ${activeGame.glow}44`,
                opacity: 0.95,
                cursor: 'grabbing',
                transform: 'rotate(2deg) scale(1.04)',
              }}
            >
              <span style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(0 0 8px ${activeGame.glow})` }}>
                {activeGame.icon}
              </span>
              <div className="text-center">
                <div className="text-[9px] font-bold mb-0.5" style={{ color: '#e8e4d8' }}>{activeGame.title}</div>
                <div className="text-[6px] body-text" style={{ color: 'rgba(160,152,128,0.7)' }}>{activeGame.desc}</div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
