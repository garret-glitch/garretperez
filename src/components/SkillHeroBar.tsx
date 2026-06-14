import Link from 'next/link'
import { xpProgress } from '@/lib/xp'
import type { SkillMeta } from '@/lib/skills'
import {
  Heart, Hammer, Briefcase, Users, Fish, Wine, Leaf, Compass, Gamepad2,
  Diamond, Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SKILL_ICONS: Record<string, LucideIcon> = {
  health:        Heart,
  projects:      Hammer,
  business:      Briefcase,
  community:     Users,
  fishing:       Fish,
  food:          Wine,
  gardening:     Leaf,
  travel:        Compass,
  fun:           Gamepad2,
  'cool-items':  Diamond,
  'cool-people': Star,
}

interface Props {
  skill: SkillMeta
  communityXp: number
  memberCount: number
  postCount?: number
  isLoggedIn: boolean
}

function StatChip({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '9px 16px', minWidth: 68,
      background: highlight ? 'rgba(200,155,60,0.13)' : 'rgba(200,155,60,0.06)',
      border: `1px solid rgba(200,155,60,${highlight ? '0.5' : '0.22'})`,
      boxShadow: highlight ? '0 0 10px rgba(200,155,60,0.12)' : 'none',
    }}>
      <span className="body-text" style={{ fontSize: 17, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </span>
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '5.5px', color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </span>
    </div>
  )
}

export default function SkillHeroBar({ skill, communityXp, memberCount, postCount, isLoggedIn }: Props) {
  const p = xpProgress(communityXp)
  const SkillIcon = SKILL_ICONS[skill.slug] ?? Gamepad2
  const xpRemaining = p.neededXp - p.currentXp

  return (
    <div className="hero-panel">

      {/* ── Main row: identity | stats | level ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>

        {/* LEFT: icon + skill name + description */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
          <div style={{
            width: 64, height: 64, flexShrink: 0,
            background: skill.color,
            borderRadius: 12,
            border: '1px solid rgba(200,155,60,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SkillIcon size={28} color="#dcc898" strokeWidth={1.5} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 20, fontWeight: 700, color: 'var(--text-1)',
              margin: 0, letterSpacing: '0.04em', lineHeight: 1.2,
            }}>
              {skill.label}
            </h1>
            <p className="body-text" style={{ fontSize: 12, color: 'var(--text-2)', margin: '5px 0 0', lineHeight: 1.5 }}>
              {skill.description}
            </p>
          </div>
        </div>

        {/* MIDDLE: stat chips */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          <StatChip value={memberCount} label="Members" />
          {postCount !== undefined && <StatChip value={postCount} label="Posts" />}
          <StatChip value="+50 XP" label="Per Post" highlight />
        </div>

        {/* RIGHT: community level box */}
        <div style={{ flexShrink: 0, minWidth: 118, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{
            padding: '10px 18px', textAlign: 'center',
            background: 'rgba(200,155,60,0.1)',
            border: '1px solid rgba(200,155,60,0.42)',
          }}>
            <div className="body-text" style={{ fontSize: 34, fontWeight: 800, color: '#c89b3c', lineHeight: 1 }}>
              {p.level}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#7a6040', letterSpacing: '0.14em', marginTop: 5 }}>
              COMMUNITY
            </div>
          </div>
          <div style={{ height: 7, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(200,155,60,0.18)', borderTop: 'none', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${p.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #4a9a28)' }} />
          </div>
          <div className="body-text" style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
            {p.currentXp.toLocaleString()} XP &middot; {xpRemaining.toLocaleString()} TO LV {p.level + 1}
          </div>
        </div>

      </div>

      {/* Guest CTA */}
      {!isLoggedIn && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(200,155,60,0.12)' }}>
          <Link href="/login" style={{
            padding: '8px 18px', background: 'transparent',
            border: '1px solid rgba(200,155,60,0.4)', color: '#c89b3c',
            fontSize: 12, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
          }}>
            Log In
          </Link>
          <Link href="/register" style={{
            padding: '8px 18px',
            background: 'linear-gradient(135deg, #c89b3c 0%, #9a7428 100%)',
            color: '#0a0600', fontSize: 12, fontWeight: 700,
            textDecoration: 'none', fontFamily: 'Inter, sans-serif',
          }}>
            🛡 Join &amp; Earn XP
          </Link>
        </div>
      )}

    </div>
  )
}
