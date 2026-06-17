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

// Downscale an uploaded image to a small base64 data URL (keeps DB rows tiny, preserves transparency).
function fileToDataUrl(file: File, max = 440): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('no canvas')); return }
        ctx.drawImage(img, 0, 0, w, h)
        try { resolve(canvas.toDataURL('image/webp', 0.85)) }
        catch { resolve(canvas.toDataURL('image/png')) }
      }
      img.onerror = () => reject(new Error('bad image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

// Admin-only button cluster: upload a card image (and remove it).
function AdminImageBtn({ href, hasImage, busy, onUpload, onRemove, pos }: {
  href: string; hasImage: boolean; busy: boolean
  onUpload: (href: string, file: File) => void
  onRemove: (href: string) => void
  pos: React.CSSProperties
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div style={{ position: 'absolute', zIndex: 25, display: 'flex', gap: 4, ...pos }}>
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.preventDefault(); e.stopPropagation(); inputRef.current?.click() }}
        title="Upload card image"
        style={{ background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(200,155,60,0.5)', borderRadius: 5, cursor: busy ? 'wait' : 'pointer', fontSize: 12, padding: '3px 5px', lineHeight: 1, color: '#c89b3c', opacity: busy ? 0.5 : 1 }}
      >🖼</button>
      {hasImage && (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(href) }}
          title="Remove image"
          style={{ background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,85,85,0.5)', borderRadius: 5, cursor: 'pointer', fontSize: 12, padding: '3px 5px', lineHeight: 1, color: '#FF6666' }}
        >✕</button>
      )}
      <input
        ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(href, f); e.currentTarget.value = '' }}
      />
    </div>
  )
}

// Framed icon tile — border + subtle radial fill so a transparent/non-square
// image (or emoji) sits in a filled frame instead of floating in dead space.
function GameIcon({ image, icon, glow, alt = '' }: { image?: string; icon: string; glow: string; alt?: string }) {
  const size = 58
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 13,
      border: `1px solid ${glow}55`,
      background: `radial-gradient(circle at 50% 32%, ${glow}29, ${glow}0f 66%, rgba(0,0,0,0.22) 100%)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 0 10px ${glow}33`,
    }}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={alt} style={{ width: size - 16, height: size - 16, objectFit: 'contain', filter: `drop-shadow(0 0 5px ${glow}aa)` }} />
      ) : (
        <span style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(0 0 6px ${glow}99)` }}>{icon}</span>
      )}
    </div>
  )
}

function FeaturedGameCard({
  game, isHidden, isBusy, isAdmin, onToggle,
  likeCount, isLiked, isLoggedIn, onLike, likeBusy,
  image, imgBusy, onUploadImage, onRemoveImage,
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
  image?: string
  imgBusy: boolean
  onUploadImage: (href: string, file: File) => void
  onRemoveImage: (href: string) => void
}) {
  const isWine = game.href.includes('wine-stocker')
  const isLumina = game.href === '/game'
  const g = game.glow
  const customImg = image

  const chips = isWine
    ? [{ icon: '🍷', label: '6 wines' }, { icon: '⚡', label: '5 power-ups' }, { icon: '🏆', label: 'Leaderboard' }]
    : isLumina
      ? [{ icon: '✦', label: 'Flow puzzle' }, { icon: '🎯', label: 'Endless play' }, { icon: '🧩', label: 'Brain training' }, { icon: '🏆', label: 'Leaderboard' }]
      : [{ icon: game.icon, label: game.xp }]

  const cardBg = isWine
    ? 'linear-gradient(145deg, #1e0d18 0%, #0f0609 45%, #1a0b14 100%)'
    : isLumina
      ? 'linear-gradient(145deg, #1a102e 0%, #0e0820 50%, #160e28 100%)'
      : 'linear-gradient(145deg, #16121e, #0e0b18)'

  const cardContent = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* ── Visual panel ─────────────────────────────── */}
      <div style={{ height: 158, background: game.bg, position: 'relative', overflow: 'hidden' }}>

        {customImg && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customImg} alt={game.title} style={{ maxWidth: '82%', maxHeight: 142, objectFit: 'contain', filter: `drop-shadow(0 4px 18px ${g}99) drop-shadow(0 0 28px ${g}55)` }} />
          </div>
        )}

        {!customImg && isWine && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 90% 90% at 50% 50%, rgba(176,48,96,0.22) 0%, rgba(60,4,14,0.15) 60%, transparent 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.45) 40%, rgba(200,155,60,0.45) 60%, transparent)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/wine-rush-icon.svg"
                alt="Wine Rush"
                style={{ width: 136, height: 136, display: 'block', filter: 'drop-shadow(0 4px 18px rgba(176,48,96,0.65)) drop-shadow(0 0 32px rgba(140,20,40,0.4))' }}
              />
            </div>
          </>
        )}

        {!customImg && isLumina && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 60% 40%, rgba(144,96,255,0.28) 0%, rgba(80,30,180,0.1) 55%, transparent 85%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 20%, rgba(144,96,255,0.32) 0%, transparent 22%), radial-gradient(circle at 66% 52%, rgba(144,96,255,0.38) 0%, transparent 25%), radial-gradient(circle at 52% 12%, rgba(144,96,255,0.22) 0%, transparent 16%)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(144,96,255,0.5) 40%, rgba(144,96,255,0.5) 60%, transparent)' }} />
            {([
              { s: '✦', x: '18%', y: '20%', sz: 26, op: 0.95 },
              { s: '✦', x: '52%', y: '12%', sz: 18, op: 0.65 },
              { s: '✦', x: '82%', y: '24%', sz: 22, op: 0.82 },
              { s: '◆', x: '32%', y: '50%', sz: 13, op: 0.55 },
              { s: '✦', x: '66%', y: '52%', sz: 30, op: 1.0 },
              { s: '◆', x: '12%', y: '70%', sz: 11, op: 0.48 },
              { s: '✦', x: '44%', y: '78%', sz: 16, op: 0.72 },
              { s: '◆', x: '84%', y: '74%', sz: 14, op: 0.6 },
            ] as { s: string; x: string; y: string; sz: number; op: number }[]).map((sym, i) => (
              <div key={i} style={{
                position: 'absolute', left: sym.x, top: sym.y,
                transform: 'translate(-50%, -50%)',
                fontSize: sym.sz, opacity: sym.op, color: '#c0a0ff',
                filter: `drop-shadow(0 0 ${Math.round(sym.sz * 0.3)}px rgba(144,96,255,0.9)) drop-shadow(0 0 ${Math.round(sym.sz * 0.6)}px rgba(100,60,220,0.5))`,
                lineHeight: 1, userSelect: 'none' as const,
              }}>{sym.s}</div>
            ))}
          </>
        )}

        {!customImg && !isWine && !isLumina && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <span style={{ fontSize: 64, filter: `drop-shadow(0 0 24px ${g})` }}>{game.icon}</span>
          </div>
        )}
      </div>

      {/* ── Content panel ────────────────────────────── */}
      <div style={{ padding: '15px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5.5, color: '#c89b3c', letterSpacing: '0.14em', border: '1px solid rgba(200,155,60,0.38)', padding: '3px 8px', background: 'rgba(200,155,60,0.08)' }}>★ FEATURED</span>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 5.5, color: 'rgba(110,220,130,0.9)', letterSpacing: '0.1em', border: '1px solid rgba(100,200,120,0.32)', padding: '3px 7px', background: 'rgba(100,210,120,0.07)' }}>● LIVE</span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 700,
          color: '#f6f0e4', margin: 0,
          letterSpacing: '0.055em', lineHeight: 1.1,
          textShadow: `0 0 28px ${g}88, 0 1px 3px rgba(0,0,0,0.95)`,
        }}>{game.title}</h2>

        {/* Description */}
        <p className="body-text" style={{ fontSize: 12, color: 'rgba(218,190,152,0.88)', margin: 0, lineHeight: 1.65 }}>{game.desc}</p>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {chips.map(chip => (
            <div key={chip.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: `${g}18`, border: `1px solid ${g}30`,
              padding: '3px 8px', borderRadius: 18,
              fontFamily: 'Inter, sans-serif', fontSize: 10.5, color: 'rgba(228,198,162,0.92)',
            }}>
              <span style={{ fontSize: 10, lineHeight: 1 }}>{chip.icon}</span>
              {chip.label}
            </div>
          ))}
        </div>

        {/* Wine Rush power-ups row */}
        {isWine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 4.5, color: 'rgba(200,155,60,0.4)', letterSpacing: '0.09em' }}>POWER-UPS</span>
            {['⚡','🏗','📦','⭐','💰'].map(em => (
              <span key={em} style={{ fontSize: 13, opacity: 0.88, lineHeight: 1 }}>{em}</span>
            ))}
          </div>
        )}

        {/* XP badge + play CTA */}
        <div className="flex flex-wrap items-center gap-2" style={{ paddingTop: 2, marginTop: 'auto' }}>
          {game.xp !== 'Endless' && (
            <span style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 6,
              color: isWine ? '#c0426a' : g,
              background: `${g}15`, border: `1px solid ${g}2e`,
              padding: '4px 9px', letterSpacing: '0.03em',
            }}>+25 XP · 400+ PTS</span>
          )}
          <span style={{
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 800,
            color: '#faf0e6',
            background: isWine
              ? 'linear-gradient(135deg, #b03060 0%, #7a1030 55%, #a02050 100%)'
              : `linear-gradient(135deg, ${g}cc, ${g}77)`,
            border: `1px solid ${isWine ? 'rgba(210,80,120,0.55)' : g + '88'}`,
            padding: '8px 16px',
            letterSpacing: '0.07em',
            boxShadow: `0 0 16px ${g}38`,
            textTransform: 'uppercase' as const,
          }}>
            ▶ {isWine ? 'Start Shift' : 'Play Now'}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', opacity: isHidden ? 0.38 : 1, filter: isHidden ? 'grayscale(0.55)' : 'none', display: 'flex', flexDirection: 'column' }}>

      {/* Admin image upload */}
      {isAdmin && (
        <AdminImageBtn href={game.href} hasImage={!!customImg} busy={imgBusy} onUpload={onUploadImage} onRemove={onRemoveImage} pos={{ top: 10, left: 10 }} />
      )}

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
        className="transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          background: cardBg,
          border: `1px solid ${g}38`,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: `0 8px 32px ${g}22, 0 2px 10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(200,155,60,0.06)`,
          textDecoration: 'none',
          pointerEvents: isHidden && !isAdmin ? 'none' : 'auto',
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
          border: `1px solid ${isLiked ? g + '65' : '#2a282055'}`,
          borderRadius: 5,
          cursor: isLoggedIn ? (likeBusy ? 'wait' : 'pointer') : 'default',
          fontSize: 10, padding: '3px 7px', lineHeight: 1,
          color: isLiked ? g : 'rgba(160,152,128,0.45)',
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
  image, imgBusy, onUploadImage, onRemoveImage,
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
  image?: string
  imgBusy: boolean
  onUploadImage: (href: string, file: File) => void
  onRemoveImage: (href: string) => void
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
      <GameIcon image={image} icon={game.icon} glow={game.glow} alt={game.title} />
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

      {/* Admin image upload */}
      {isAdmin && !editMode && (
        <AdminImageBtn href={game.href} hasImage={!!image} busy={imgBusy} onUpload={onUploadImage} onRemove={onRemoveImage} pos={{ top: 7, left: 7 }} />
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
  initialImages,
  isAdmin,
  isLoggedIn,
  initialLikeCounts,
  initialUserLikes,
}: {
  games: GameDef[]
  initialHidden: string[]
  initialOrder: string[]
  initialImages: Record<string, string>
  isAdmin: boolean
  isLoggedIn: boolean
  initialLikeCounts: Record<string, number>
  initialUserLikes: string[]
}) {
  const [orderedGames, setOrderedGames] = useState<GameDef[]>(() => applyOrder(games, initialOrder))
  const savedRef = useRef<GameDef[]>(applyOrder(games, initialOrder))
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden))
  const [images, setImages] = useState<Record<string, string>>(initialImages || {})
  const [imgBusy, setImgBusy] = useState<string | null>(null)
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

  async function uploadImage(href: string, file: File) {
    if (imgBusy) return
    setImgBusy(href)
    const prev = images[href]
    try {
      const dataUrl = await fileToDataUrl(file)
      setImages(m => ({ ...m, [href]: dataUrl }))
      const res = await fetch('/api/admin/game-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, image: dataUrl }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setImages(m => { const n = { ...m }; if (prev != null) n[href] = prev; else delete n[href]; return n })
    }
    setImgBusy(null)
  }

  async function removeImage(href: string) {
    if (imgBusy) return
    setImgBusy(href)
    const prev = images[href]
    setImages(m => { const n = { ...m }; delete n[href]; return n })
    try {
      const res = await fetch('/api/admin/game-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, image: null }),
      })
      if (!res.ok) throw new Error()
    } catch {
      if (prev != null) setImages(m => ({ ...m, [href]: prev }))
    }
    setImgBusy(null)
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
      {/* ── Featured cards grid (outside the drag grid) ──── */}
      <div className={`grid gap-3 mb-3 ${featuredGames.length >= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
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
            image={images[g.href]}
            imgBusy={imgBusy === g.href}
            onUploadImage={uploadImage}
            onRemoveImage={removeImage}
          />
        ))}
      </div>

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
                image={images[g.href]}
                imgBusy={imgBusy === g.href}
                onUploadImage={uploadImage}
                onRemoveImage={removeImage}
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
              <GameIcon image={images[activeGame.href]} icon={activeGame.icon} glow={activeGame.glow} alt={activeGame.title} />
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
