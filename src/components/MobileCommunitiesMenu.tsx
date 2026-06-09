'use client'
import { useState } from 'react'
import Link from 'next/link'

const CHANNELS = [
  { icon: '📋', label: 'Quests',    href: '/quest-board' },
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

export default function MobileCommunitiesMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] transition-colors"
        style={{
          background: open ? 'rgba(200,155,60,0.15)' : 'rgba(200,155,60,0.08)',
          border: '1px solid rgba(200,155,60,0.3)',
          color: 'var(--gold)',
        }}
        aria-expanded={open}
        aria-label="Communities menu"
      >
        <span>⚔</span>
        <span>Communities</span>
        <span style={{ fontSize: 8, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div
            className="absolute left-0 top-full mt-1 z-50 rounded-xl py-1"
            style={{
              background: '#13131c',
              border: '1px solid #2a2418',
              minWidth: 200,
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            {CHANNELS.map(ch => (
              <Link
                key={ch.href}
                href={ch.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(200,155,60,0.1)]"
                style={{ color: 'var(--text-1)', fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif' }}
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
