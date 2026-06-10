'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Heart, Hammer, Briefcase, Users, Fish, Wine, Leaf, Compass, Gamepad2,
  Home, FileText, Menu, X, Scroll,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem { label: string; Icon: LucideIcon; href: string; bg: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',   Icon: Home,     href: '/',       bg: '#241a08' },
  { label: 'Resume', Icon: FileText, href: '/resume', bg: '#241a08' },
]

const COMMUNITIES: NavItem[] = [
  { label: 'Health',      Icon: Heart,      href: '/skills/health',   bg: '#5a1414' },
  { label: 'Projects',    Icon: Hammer,     href: '/skills/projects', bg: '#382e0e' },
  { label: 'Business',    Icon: Briefcase,  href: '/skills/business', bg: '#1c2e10' },
  { label: 'Community',   Icon: Users,      href: '/skills/community',bg: '#181e4a' },
  { label: 'Fishing',     Icon: Fish,       href: '/skills/fishing',  bg: '#0e2c48' },
  { label: 'Food & Wine', Icon: Wine,       href: '/skills/food',     bg: '#4e2006' },
  { label: 'Gardening',   Icon: Leaf,       href: '/skills/gardening',bg: '#0e3810' },
  { label: 'Adventure',   Icon: Compass,    href: '/skills/travel',   bg: '#382808' },
  { label: 'Games',       Icon: Gamepad2,   href: '/skills/fun',      bg: '#320c4a' },
  { label: 'Quests',      Icon: Scroll,     href: '/quests',          bg: '#2a1a06' },
]

function NavRow({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className="guild-channel"
      style={{
        paddingLeft: 14,
        borderLeftColor: active ? '#c89b3c' : 'transparent',
        background: active ? 'rgba(200,155,60,0.1)' : undefined,
        color: active ? '#f0d898' : undefined,
        minHeight: 52,
      }}
    >
      <span style={{
        flexShrink: 0, width: 32, height: 32,
        background: item.bg, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <item.Icon size={15} color="#dcc898" strokeWidth={1.6} />
      </span>
      <span style={{ fontSize: 7.5, flex: 1 }}>{item.label}</span>
    </Link>
  )
}

export default function MobileCommunitiesMenu({ isAdmin }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="md:hidden">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 40, height: 40,
          background: 'rgba(200,155,60,0.1)',
          border: '1px solid rgba(200,155,60,0.35)',
          borderRadius: 8,
          color: '#c89b3c',
          cursor: 'pointer',
        }}
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 190,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.22s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260, zIndex: 200,
          background: '#1a0e06',
          borderRight: '2px solid #5a3818',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.32, 0, 0.67, 0)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Castle battlements */}
        <div className="castle-battlements" />

        {/* Drawer header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #3a2010',
          position: 'sticky', top: 0, background: '#1a0e06', zIndex: 1,
        }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#c89b3c' }}>
            ⚔ Navigation
          </span>
          <button
            onClick={close}
            aria-label="Close navigation"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32,
              background: 'rgba(200,155,60,0.08)',
              border: '1px solid rgba(200,155,60,0.25)',
              borderRadius: 6,
              color: '#c89b3c',
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav links */}
        <div style={{ padding: '6px 0 4px' }}>
          {NAV_ITEMS.map(item => (
            <NavRow key={item.href} item={item} active={pathname === item.href} onClick={close} />
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={close}
              className="guild-channel"
              style={{ paddingLeft: 14, borderLeftColor: 'transparent', minHeight: 52 }}
            >
              <span style={{ flexShrink: 0, width: 32, height: 32, background: '#3a2c08', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚙</span>
              <span style={{ fontSize: 7.5, color: '#c89b3c' }}>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Divider + section label */}
        <div style={{ height: 1, background: '#3a2010', margin: '2px 14px 0' }} />
        <div style={{ padding: '8px 14px 5px', fontSize: 5.5, color: '#a07848', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>
          ⚔ Communities
        </div>

        {/* Community channels */}
        <div style={{ paddingBottom: 24 }}>
          {COMMUNITIES.map(item => (
            <NavRow
              key={item.href}
              item={item}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
              onClick={close}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
