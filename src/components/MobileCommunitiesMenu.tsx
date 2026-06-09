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
        className="flex items-center gap-2 shrink-0 rounded-xl"
        style={{
          background: open ? 'rgba(200,155,60,0.22)' : 'rgba(200,155,60,0.1)',
          border: '1px solid rgba(200,155,60,0.4)',
          color: 'var(--gold)',
          padding: '10px 16px',
          minHeight: 44,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
        <span>Menu</span>
      </button>

      {open && (
        <>
          {/* Tap-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown panel — fixed + centered on screen */}
          <div
            className="fixed z-50 rounded-xl"
            style={{
              top: 62,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1a28',
              border: '1px solid rgba(200,155,60,0.25)',
              width: 260,
              maxWidth: '92vw',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 16px 40px rgba(0,0,0,0.8)',
            }}
          >
            {/* Section: Navigate */}
            <div className="px-4 pt-4 pb-2">
              <span style={{ color: 'var(--text-2)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Navigate</span>
            </div>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 active:bg-[rgba(200,155,60,0.15)]"
                style={{ color: '#e2e2f2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16, fontWeight: 500, minHeight: 48, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 active:bg-[rgba(200,155,60,0.15)]"
                style={{ color: '#c89b3c', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16, fontWeight: 500, minHeight: 48, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>⚙️</span>
                <span>Admin Panel</span>
              </Link>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(200,155,60,0.15)', margin: '6px 16px' }} />

            {/* Section: Communities */}
            <div className="px-4 pt-2 pb-2">
              <span style={{ color: 'var(--text-2)', fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>⚔ Communities</span>
            </div>
            {COMMUNITIES.map(ch => (
              <Link key={ch.href} href={ch.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 active:bg-[rgba(200,155,60,0.15)]"
                style={{ color: '#e2e2f2', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 16, fontWeight: 500, minHeight: 48, display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{ch.icon}</span>
                <span>{ch.label}</span>
              </Link>
            ))}
            <div style={{ height: 8 }} />
          </div>
        </>
      )}
    </div>
  )
}
