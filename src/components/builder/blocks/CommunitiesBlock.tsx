'use client'
import Link from 'next/link'
import type { PageBlock } from '@/types/builder'

const CHANNELS = [
  { icon: '❤️', label: 'Health',      href: '/skills/health',    bg: '#5a1414' },
  { icon: '⚒️', label: 'Projects',    href: '/skills/projects',  bg: '#382e0e' },
  { icon: '💼', label: 'Business',    href: '/skills/business',  bg: '#1c2e10' },
  { icon: '👥', label: 'Community',   href: '/skills/community', bg: '#181e4a' },
  { icon: '🎣', label: 'Fishing',     href: '/skills/fishing',   bg: '#0e2c48' },
  { icon: '🍳', label: 'Food & Wine', href: '/skills/food',      bg: '#4e2006' },
  { icon: '🌱', label: 'Gardening',   href: '/skills/gardening', bg: '#0e3810' },
  { icon: '🗺️', label: 'Travel',      href: '/skills/travel',    bg: '#382808' },
  { icon: '🎮', label: 'Games',       href: '/skills/fun',       bg: '#320c4a' },
  { icon: '⚔️', label: 'Quests',      href: '/quests',           bg: '#2a1a06' },
]

interface Props {
  block: PageBlock
  isEditing?: boolean
}

export default function CommunitiesBlock({ block, isEditing = false }: Props) {
  const cfg = block.config as { heading?: string }
  const heading = cfg?.heading ?? 'Communities'

  return (
    <div className="rp-card">
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #3a2008 0%, #1a0c04 100%)',
          border: '2px solid rgba(200,155,60,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>⚔️</div>
        <div>
          <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{heading}</div>
          <div className="body-text" style={{ fontSize: 10, color: 'var(--text-2)' }}>Post, earn XP, and level up your skills</div>
        </div>
      </div>

      {/* Grid — 1 col mobile, 2 col sm, 3 col md */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3" style={{ gap: 8 }}>
        {CHANNELS.map(ch =>
          isEditing ? (
            <div key={ch.href} className="community-card" style={{ pointerEvents: 'none' }}>
              <div style={{ width: 40, height: 40, flexShrink: 0, background: ch.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>{ch.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</div>
              </div>
            </div>
          ) : (
            <Link key={ch.href} href={ch.href} className="community-card">
              <div style={{ width: 40, height: 40, flexShrink: 0, background: ch.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)' }}>{ch.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</div>
              </div>
            </Link>
          )
        )}
      </div>
    </div>
  )
}
