'use client'
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
  if (!isAdmin) return null

  return (
    <div style={{
      position: 'sticky',
      top: 32, // sits just below the SiteHeader (which is ~32px tall)
      zIndex: 800,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      background: 'linear-gradient(90deg, #1a120400, #1a1204ee 8%, #1a1204ee 92%, #1a120400)',
      borderTop: '1px solid rgba(200,155,60,0.35)',
      borderBottom: '1px solid rgba(200,155,60,0.35)',
      padding: '0 12px',
      backdropFilter: 'blur(6px)',
    }}>
      {/* Admin badge */}
      <span style={{
        fontSize: 6,
        color: 'rgba(200,155,60,0.55)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        paddingRight: 12,
        borderRight: '1px solid rgba(200,155,60,0.2)',
        marginRight: 4,
        whiteSpace: 'nowrap',
      }}>
        ⚔ Admin
      </span>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
        {LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              color: i === 0 ? 'var(--gold)' : 'var(--text-2)',
              fontSize: 7,
              textDecoration: 'none',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              borderRight: '1px solid rgba(200,155,60,0.1)',
              transition: 'color 0.15s, background 0.15s',
              fontWeight: i === 0 ? 700 : 400,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--gold)'
              e.currentTarget.style.background = 'rgba(200,155,60,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = i === 0 ? 'var(--gold)' : 'var(--text-2)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ fontSize: 12 }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 8 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#4caf50',
          boxShadow: '0 0 6px #4caf50',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 6, color: 'rgba(200,155,60,0.5)', whiteSpace: 'nowrap' }}>
          Live
        </span>
      </div>
    </div>
  )
}
