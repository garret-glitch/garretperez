'use client'
import { useState } from 'react'
import Link from 'next/link'

interface Props {
  isAdmin: boolean
}

const LINKS = [
  { icon: '🖼️', label: 'Edit Page',  href: '/admin/builder' },
  { icon: '📊', label: 'Dashboard',  href: '/admin' },
  { icon: '👥', label: 'Users',      href: '/admin/users' },
  { icon: '💬', label: 'Posts',      href: '/admin/community' },
  { icon: '⚙️', label: 'Settings',   href: '/admin/settings' },
]

export default function AdminFloatingBar({ isAdmin }: Props) {
  const [open, setOpen] = useState(false)

  if (!isAdmin) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {/* Expanded links */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems: 'flex-end',
        transition: 'all 0.2s ease',
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0)' : 'translateY(12px)',
        pointerEvents: open ? 'auto' : 'none',
      }}>
        {LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px 7px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-lit)',
              color: 'var(--gold)',
              fontSize: 8,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e1e2e')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          >
            <span style={{ fontSize: 14 }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close admin toolbar' : 'Admin toolbar'}
        style={{
          pointerEvents: 'auto',
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, #c89b3c, #a07828)'
            : 'linear-gradient(135deg, #1a1a28, #13131c)',
          border: '2px solid var(--border-lit)',
          color: open ? '#000' : 'var(--gold)',
          fontSize: 18,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(200,155,60,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
        }}
      >
        ⚙
      </button>
    </div>
  )
}
