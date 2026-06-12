'use client'

import Link from 'next/link'
import { useState } from 'react'

export interface GameDef {
  icon: string
  title: string
  desc: string
  href: string
  xp: string
  bg: string
  glow: string
}

export default function GameGrid({
  games,
  initialHidden,
  isAdmin,
}: {
  games: GameDef[]
  initialHidden: string[]
  isAdmin: boolean
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initialHidden))
  const [busy, setBusy] = useState<string | null>(null)

  async function toggle(href: string) {
    if (busy) return
    setBusy(href)
    const willHide = !hidden.has(href)
    // Optimistic update
    setHidden(prev => {
      const next = new Set(prev)
      if (willHide) next.add(href); else next.delete(href)
      return next
    })
    try {
      const res = await fetch('/api/admin/toggle-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href, hide: willHide }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      // Revert on failure
      setHidden(prev => {
        const next = new Set(prev)
        if (willHide) next.delete(href); else next.add(href)
        return next
      })
    }
    setBusy(null)
  }

  const displayGames = isAdmin ? games : games.filter(g => !hidden.has(g.href))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {displayGames.map(g => {
        const isHidden = hidden.has(g.href)
        const isBusy = busy === g.href
        return (
          <div key={g.href} style={{ position: 'relative' }}>

            {/* Admin toggle button */}
            {isAdmin && (
              <button
                onClick={() => toggle(g.href)}
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

            {/* Game card */}
            <Link
              href={g.href}
              className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl transition-all duration-150 hover:scale-105 hover:brightness-110"
              style={{
                background: g.bg,
                border: `1px solid ${isHidden ? 'rgba(255,85,85,0.25)' : g.glow + '33'}`,
                boxShadow: `0 2px 12px ${g.glow}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
                opacity: isHidden ? 0.38 : 1,
                filter: isHidden ? 'grayscale(0.55)' : 'none',
                display: 'flex',
                pointerEvents: isHidden && !isAdmin ? 'none' : 'auto',
              }}
            >
              <span style={{ fontSize: 30, lineHeight: 1, filter: `drop-shadow(0 0 6px ${g.glow}99)` }}>
                {g.icon}
              </span>
              <div className="text-center">
                <div className="text-[9px] font-bold mb-0.5" style={{ color: '#e8e4d8' }}>{g.title}</div>
                <div className="text-[6px] mb-1 body-text" style={{ color: 'rgba(160,152,128,0.7)' }}>{g.desc}</div>
                <div className="text-[6px] font-bold" style={{ color: g.glow }}>{g.xp}</div>
              </div>
            </Link>

            {/* HIDDEN badge overlay — admin only */}
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
      })}
    </div>
  )
}
