'use client'
import { useState } from 'react'
import Link from 'next/link'

const COMMUNITIES = [
  { icon: '❤️', label: 'Health',    href: '/skills/health' },
  { icon: '⚒️', label: 'Projects',  href: '/skills/projects' },
  { icon: '💼', label: 'Business',  href: '/skills/business' },
  { icon: '👥', label: 'Community', href: '/skills/community' },
  { icon: '🎣', label: 'Fishing',   href: '/skills/fishing' },
  { icon: '🍳', label: 'Cooking',   href: '/skills/food' },
  { icon: '🌱', label: 'Farming',   href: '/skills/gardening' },
  { icon: '🗺️', label: 'Adventure', href: '/skills/travel' },
  { icon: '🎮', label: 'Fun Zone',  href: '/skills/fun' },
]

const NAV = [
  { icon: '📋', label: 'Quests',  href: '/quest-board' },
  { icon: '📄', label: 'Resume',  href: '/resume' },
]

export default function MobileCommunitiesMenu({ isAdmin }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] shrink-0"
        style={{
          background: open ? 'rgba(200,155,60,0.18)' : 'rgba(200,155,60,0.08)',
          border: '1px solid rgba(200,155,60,0.35)',
          color: 'var(--gold)',
        }}
        aria-expanded={open}
      >
        <span>☰</span>
        <span>Menu</span>
      </button>

      {open && (
        <>
          {/* Tap-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown panel */}
          <div
            className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden"
            style={{
              background: '#13131c',
              border: '1px solid #2a2418',
              width: 220,
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.7)',
            }}
          >
            {/* Section: Navigate */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Navigate</span>
            </div>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  color: 'var(--text-1)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  color: 'var(--gold)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>⚙️</span>
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#2a2418', margin: '4px 0' }} />

            {/* Section: Communities */}
            <div className="px-4 pt-2 pb-1">
              <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>⚔ Communities</span>
            </div>
            {COMMUNITIES.map(ch => (
              <Link
                key={ch.href}
                href={ch.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{
                  color: 'var(--text-1)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 14,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 16 }}>{ch.icon}</span>
                <span>{ch.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
