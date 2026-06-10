'use client'
import Link from 'next/link'

interface Props {
  isAdmin: boolean
}

const LINKS = [
  { icon: '🖼️', label: 'Edit Page', href: '/admin/builder', highlight: true },
  { icon: '📊', label: 'Dashboard', href: '/admin' },
  { icon: '👥', label: 'Users',     href: '/admin/users' },
  { icon: '💬', label: 'Posts',     href: '/admin/community' },
  { icon: '⚙️', label: 'Settings',  href: '/admin/settings' },
]

export default function AdminFloatingBar({ isAdmin }: Props) {
  if (!isAdmin) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 38,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 14,
      paddingRight: 14,
      background: 'linear-gradient(90deg, #0c0a01 0%, #110e02 40%, #110e02 60%, #0c0a01 100%)',
      borderBottom: '1px solid rgba(200,155,60,0.45)',
      boxShadow: '0 2px 18px rgba(200,155,60,0.12), 0 1px 0 rgba(200,155,60,0.08)',
    }}>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, lineHeight: 1 }}>⚔️</span>
        <div>
          <div style={{
            fontSize: 6.5,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: '#c89b3c',
            lineHeight: 1.1,
            textTransform: 'uppercase',
          }}>
            Garret&apos;s World
          </div>
          <div style={{
            fontSize: 5,
            letterSpacing: '0.22em',
            color: 'rgba(200,155,60,0.45)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            Admin Panel
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: 'rgba(200,155,60,0.2)', marginRight: 12, flexShrink: 0 }} />

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              color: link.highlight ? '#0d0a00' : 'rgba(200,155,60,0.7)',
              background: link.highlight
                ? 'linear-gradient(135deg, #c89b3c, #a07828)'
                : 'transparent',
              fontSize: 7,
              fontWeight: link.highlight ? 700 : 500,
              textDecoration: 'none',
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              border: link.highlight ? 'none' : '1px solid transparent',
              transition: 'all 0.15s',
              boxShadow: link.highlight ? '0 1px 6px rgba(200,155,60,0.35)' : 'none',
            }}
            onMouseEnter={e => {
              if (!link.highlight) {
                e.currentTarget.style.color = '#c89b3c'
                e.currentTarget.style.background = 'rgba(200,155,60,0.1)'
                e.currentTarget.style.border = '1px solid rgba(200,155,60,0.25)'
              }
            }}
            onMouseLeave={e => {
              if (!link.highlight) {
                e.currentTarget.style.color = 'rgba(200,155,60,0.7)'
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.border = '1px solid transparent'
              }
            }}
          >
            <span style={{ fontSize: 11 }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Live badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 20,
        border: '1px solid rgba(76,175,80,0.3)',
        background: 'rgba(76,175,80,0.08)',
        flexShrink: 0,
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#4caf50',
          boxShadow: '0 0 5px #4caf50, 0 0 10px rgba(76,175,80,0.4)',
          flexShrink: 0,
          animation: 'pulse 2s infinite',
        }} />
        <span style={{ fontSize: 6, color: 'rgba(76,175,80,0.8)', letterSpacing: '0.1em', fontWeight: 600 }}>
          LIVE
        </span>
      </div>

    </div>
  )
}
