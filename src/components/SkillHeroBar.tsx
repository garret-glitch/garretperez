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

function toRgb(hex: string) {
  return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`
}

export default function SkillHeroBar({ skill, communityXp, memberCount, postCount, isLoggedIn }: Props) {
  const rgb = toRgb(skill.color)
  const p = xpProgress(communityXp)

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, #0d0b08 0%, rgba(${rgb}, 0.15) 55%, #0d0b08 100%)`,
      border: `2px solid rgba(${rgb}, 0.52)`,
      padding: '26px 24px 22px',
    }}>
      {/* Top shimmer accent */}
      <div style={{
        position: 'absolute', top: 0, left: '6%', right: '6%', height: 2, pointerEvents: 'none',
        background: `linear-gradient(90deg, transparent, rgba(${rgb},0.95) 30%, rgba(200,155,60,0.85) 65%, transparent)`,
      }} />
      {/* Inner inset border */}
      <div style={{ position: 'absolute', inset: 5, border: `1px solid rgba(${rgb},0.09)`, pointerEvents: 'none' }} />
      {/* Corner pixel ornaments */}
      <div style={{ position: 'absolute', top: 9, right: 11, fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: `rgba(${rgb}, 0.45)`, letterSpacing: 4, pointerEvents: 'none' }}>✦ ✦</div>
      <div style={{ position: 'absolute', bottom: 9, left: 11, fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: `rgba(${rgb}, 0.45)`, letterSpacing: 4, pointerEvents: 'none' }}>✦ ✦</div>

      <div className="flex flex-col sm:flex-row gap-5 sm:items-start" style={{ position: 'relative' }}>

        {/* ── LEFT: identity + stats + CTA ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Icon + title + badge + description */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            {/* Glowing icon box */}
            <div style={{
              width: 70, height: 70, flexShrink: 0, borderRadius: 4, fontSize: 36,
              background: `radial-gradient(circle at 38% 38%, rgba(${rgb}, 0.22) 0%, rgba(${rgb}, 0.04) 100%)`,
              border: `2px solid rgba(${rgb}, 0.52)`,
              boxShadow: `0 0 24px rgba(${rgb}, 0.25), inset 0 0 12px rgba(${rgb}, 0.07)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {skill.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 13, color: '#f0d898', letterSpacing: '0.05em', margin: 0,
                }}>
                  {skill.label}
                </h1>
                <span style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                  color: '#c89b3c',
                  background: `rgba(${rgb}, 0.1)`,
                  border: `1px solid rgba(${rgb}, 0.4)`,
                  padding: '3px 9px', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                }}>
                  GUILD CHANNEL
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7a6248', margin: 0, lineHeight: 1.55 }}>
                {skill.description}
              </p>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: isLoggedIn ? 0 : 14 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(200,155,60,0.18)',
              padding: '5px 12px',
            }}>
              <span style={{ fontSize: 13 }}>👥</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#c89b3c', fontWeight: 700 }}>{memberCount}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5a4028' }}>members</span>
            </div>

            {postCount !== undefined && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(200,155,60,0.18)',
                padding: '5px 12px',
              }}>
                <span style={{ fontSize: 13 }}>📜</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#c89b3c', fontWeight: 700 }}>{postCount}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5a4028' }}>posts</span>
              </div>
            )}

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `rgba(${rgb}, 0.09)`,
              border: `1px solid rgba(${rgb}, 0.32)`,
              padding: '5px 12px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 7,
              color: '#c89b3c', letterSpacing: '0.08em',
            }}>
              ⚡ +50 XP
            </div>
          </div>

          {/* Login CTA for guests */}
          {!isLoggedIn && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                padding: '9px 20px', background: 'transparent',
                border: '1px solid rgba(200,155,60,0.4)', color: '#c89b3c',
                fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>Log In</Link>
              <Link href="/register" style={{
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                color: '#0a0600', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>🛡 Join &amp; Earn XP</Link>
            </div>
          )}
        </div>

        {/* ── RIGHT: community level panel ── */}
        <div style={{
          flexShrink: 0, width: 180,
          background: `linear-gradient(160deg, rgba(${rgb}, 0.11) 0%, rgba(0,0,0,0.35) 100%)`,
          border: `1px solid rgba(${rgb}, 0.34)`,
          padding: '16px 18px',
          boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#7a5a20', letterSpacing: '0.12em', marginBottom: 10 }}>
            ⚔ COMMUNITY
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 42, fontWeight: 800, color: '#c89b3c', lineHeight: 1 }}>
              {p.level}
            </span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#7a5a20', letterSpacing: '0.08em' }}>
              LVL
            </span>
          </div>
          <div style={{ height: 6, background: `rgba(${rgb}, 0.1)`, border: `1px solid rgba(${rgb}, 0.22)`, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ height: '100%', width: `${p.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)' }} />
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#5a4028', lineHeight: 1.8 }}>
            <div>{communityXp.toLocaleString()} XP</div>
            <div>{p.percent}% to Lv {p.level + 1}</div>
            {memberCount > 0 && (
              <div style={{ marginTop: 2 }}>{memberCount} contributor{memberCount === 1 ? '' : 's'}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
