import Link from 'next/link'
import { xpProgress } from '@/lib/xp'
import type { SkillMeta } from '@/lib/skills'

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
      padding: '8px 16px',
      background: highlight ? 'rgba(200,155,60,0.13)' : 'rgba(200,155,60,0.07)',
      border: `1px solid rgba(200,155,60,${highlight ? '0.45' : '0.22'})`,
      boxShadow: highlight ? '0 0 10px rgba(200,155,60,0.15)' : 'none',
    }}>
      <span className="body-text" style={{ fontSize: 17, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 5 }}>
        {value}
      </span>
      <span className="text-[5.5px]" style={{ color: '#7a6040', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>
        {label}
      </span>
    </div>
  )
}

export default function SkillHeroBar({ skill, communityXp, memberCount, postCount, isLoggedIn }: Props) {
  const p = xpProgress(communityXp)

  return (
    <div className="hero-panel">
      <div className="flex flex-col sm:flex-row gap-5 sm:items-center">

        {/* ── LEFT: icon + identity + stats ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14 }}>

            {/* Skill icon — matches the sidebar SkillCell exactly */}
            <div style={{
              width: 76, height: 76, flexShrink: 0,
              background: skill.color,
              border: '2px solid rgba(200,155,60,0.35)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 5,
            }}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>{skill.icon}</span>
              <span className="text-[5px]" style={{ fontFamily: "'Press Start 2P', monospace", color: '#e8d8b0', letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.4, padding: '0 4px' }}>
                {skill.label}
              </span>
            </div>

            {/* Title + badge + description */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 21, fontWeight: 700, color: 'var(--text-1)',
                  margin: 0, letterSpacing: '0.03em', lineHeight: 1.2,
                }}>
                  {skill.label}
                </h1>
              </div>
              <p className="body-text" style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                {skill.description}
              </p>
            </div>
          </div>

          {/* Gold divider — matches homepage style */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(200,155,60,0.35) 0%, transparent 75%)', marginBottom: 14 }} />

          {/* Stat chips — same pattern as homepage Members/Posts/Level chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: isLoggedIn ? 0 : 16 }}>
            <StatChip value={memberCount} label="Members" />
            {postCount !== undefined && <StatChip value={postCount} label="Posts" />}
            <StatChip value="+50 XP" label="Per Post" highlight />
          </div>

          {/* Login CTA — only shown to guests */}
          {!isLoggedIn && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                padding: '9px 20px', background: 'transparent',
                border: '1px solid rgba(200,155,60,0.4)', color: '#c89b3c',
                fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>
                Log In
              </Link>
              <Link href="/register" style={{
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #9a7428 100%)',
                color: '#0a0600', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>
                🛡 Join &amp; Earn XP
              </Link>
            </div>
          )}
        </div>

        {/* ── RIGHT: community level — highlighted chip matching homepage ── */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, minWidth: 140 }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '16px 28px', width: '100%',
            background: 'rgba(200,155,60,0.13)',
            border: '1px solid rgba(200,155,60,0.45)',
            boxShadow: '0 0 12px rgba(200,155,60,0.18)',
          }}>
            <span className="body-text" style={{ fontSize: 38, fontWeight: 800, color: '#c89b3c', lineHeight: 1, marginBottom: 6 }}>
              {p.level}
            </span>
            <span className="text-[6px]" style={{ fontFamily: "'Press Start 2P', monospace", color: '#7a6040', letterSpacing: '0.14em' }}>
              COMMUNITY
            </span>
          </div>

          {/* XP progress bar — matches homepage bar style */}
          <div style={{ width: '100%' }}>
            <div style={{ height: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,155,60,0.28)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${p.percent}%`, background: 'linear-gradient(90deg, #2a5a18, #4a9a28)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'rgba(255,255,255,0.15)' }} />
              </div>
            </div>
            <div className="body-text" style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 5, textAlign: 'center' }}>
              {communityXp.toLocaleString()} XP · {p.percent}% to Lv {p.level + 1}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
