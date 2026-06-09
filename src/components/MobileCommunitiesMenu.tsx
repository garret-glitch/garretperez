'use client'
import { useState } from 'react'
import Link from 'next/link'

const NAV = [
  { icon: '🏠', label: 'Home',      href: '/' },
  { icon: '📋', label: 'Quests',    href: '/quest-board' },
  { icon: '📄', label: 'Resume',    href: '/resume' },
]

const COMMUNITIES = [
  { icon: '❤️', label: 'Health',    href: '/skills/health' },
  { icon: '⚒️', label: 'Projects',  href: '/skills/projects' },
  { icon: '💼', label: 'Business',  href: '/skills/business' },
  { icon: '👥', label: 'Community', href: '/skills/community' },
  { icon: '🎣', label: 'Fishing',   href: '/skills/fishing' },
  { icon: '🍳', label: 'Cooking',   href: '/skills/food' },
  { icon: '🌱', label: 'Farming',   href: '/skills/gardening' },
  { icon: '🗺️', label: 'Adventure', href: '/skills/travel' },
  { icon: '🎮', label: 'Games',     href: '/skills/fun' },
]

const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16,
  padding: '14px 24px', minHeight: 54,
  color: '#e2e2f2',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 18, fontWeight: 500,
  textDecoration: 'none',
}

const SECTION_LABEL: React.CSSProperties = {
  padding: '14px 24px 6px',
  color: '#8888a8',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12, fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase',
}

export default function MobileCommunitiesMenu({ isAdmin }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', minHeight: 44,
          background: 'rgba(200,155,60,0.1)',
          border: '1px solid rgba(200,155,60,0.4)',
          borderRadius: 10,
          color: '#c89b3c',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 15, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>☰</span>
        <span>Menu</span>
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#0d0d14',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Overlay header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid #2a2418',
            position: 'sticky', top: 0, background: '#0d0d14', zIndex: 1,
          }}>
            <span style={{ color: '#c89b3c', fontFamily: 'Inter', fontSize: 17, fontWeight: 700 }}>
              Navigation
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', minHeight: 40,
                background: '#1a1a28', border: '1px solid #2a2a3e', borderRadius: 8,
                color: '#e2e2f2', fontFamily: 'Inter', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✕ Close
            </button>
          </div>

          {/* Menu content */}
          <div>
            <div style={SECTION_LABEL}>Pages</div>
            {NAV.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={ROW}>
                <span style={{ fontSize: 22, width: 34, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)} style={{ ...ROW, color: '#c89b3c' }}>
                <span style={{ fontSize: 22, width: 34, textAlign: 'center' }}>⚙️</span>
                Admin Panel
              </Link>
            )}

            <div style={{ height: 1, background: '#2a2418', margin: '8px 24px' }} />

            <div style={SECTION_LABEL}>⚔ Communities</div>
            {COMMUNITIES.map(ch => (
              <Link key={ch.href} href={ch.href} onClick={() => setOpen(false)} style={ROW}>
                <span style={{ fontSize: 22, width: 34, textAlign: 'center' }}>{ch.icon}</span>
                {ch.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
