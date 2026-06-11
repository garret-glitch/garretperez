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
      background: `linear-gradient(180deg, rgba(${rgb}, 0.07) 0%, #0c0a08 60%)`,
      borderTop: `3px solid rgba(${rgb}, 0.75)`,
      borderLeft: `1px solid rgba(${rgb}, 0.15)`,
      borderRight: `1px solid rgba(${rgb}, 0.15)`,
      borderBottom: `1px solid rgba(${rgb}, 0.15)`,
      padding: '28px 26px 24px',
    }}>
      <div className="flex flex-col sm:flex-row gap-6 sm:items-start">

        {/* ── LEFT: identity + stats + CTA ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Icon + title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
            <div style={{
              width: 62, height: 62, flexShrink: 0,
              background: `rgba(${rgb}, 0.1)`,
              border: `1px solid rgba(${rgb}, 0.28)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30,
            }}>
              {skill.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 7, flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 13, color: '#ede0c0', letterSpacing: '0.04em', margin: 0,
                }}>
                  {skill.label}
                </h1>
                <span style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
                  color: '#6a5838', letterSpacing: '0.14em', textTransform: 'uppercase',
                  border: '1px solid #2e2418', padding: '2px 9px',
                }}>
                  Guild Channel
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#6a5a40', margin: 0, lineHeight: 1.6 }}>
                {skill.description}
              </p>
            </div>
          </div>

          {/* Stats — inline, no boxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: isLoggedIn ? 0 : 18 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5a4a30' }}>
              👥 <span style={{ color: '#a08858', fontWeight: 600 }}>{memberCount}</span> members
            </span>
            {postCount !== undefined && (
              <>
                <span style={{ color: '#2e2418', fontSize: 16, lineHeight: 1 }}>·</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#5a4a30' }}>
                  📜 <span style={{ color: '#a08858', fontWeight: 600 }}>{postCount}</span> posts
                </span>
              </>
            )}
            <span style={{ color: '#2e2418', fontSize: 16, lineHeight: 1 }}>·</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#8a7040', fontWeight: 600, letterSpacing: '0.03em' }}>
              +50 XP per post
            </span>
          </div>

          {/* Login CTA for guests */}
          {!isLoggedIn && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href="/login" style={{
                padding: '8px 20px', background: 'transparent',
                border: '1px solid #2e2418', color: '#a08858',
                fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.02em',
              }}>
                Log In
              </Link>
              <Link href="/register" style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #9a7428 100%)',
                color: '#0a0600', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                letterSpacing: '0.02em',
              }}>
                🛡 Join &amp; Earn XP
              </Link>
            </div>
          )}
        </div>

        {/* ── RIGHT: community level ── */}
        <div style={{
          flexShrink: 0, width: 172,
          borderLeft: `1px solid rgba(${rgb}, 0.14)`,
          paddingLeft: 22,
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600,
            color: '#4a3a24', letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Community
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 10 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 44, fontWeight: 800, color: '#c89b3c', lineHeight: 1 }}>
              {p.level}
            </span>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
              color: '#6a5030', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              lvl
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: '#1e1a14', marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${p.percent}%`, background: 'linear-gradient(90deg, #7a5010, #c89b3c)' }} />
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#4a3a24', lineHeight: 1.9 }}>
            <div style={{ color: '#6a5030' }}>{communityXp.toLocaleString()} XP</div>
            <div>{p.percent}% to level {p.level + 1}</div>
            {memberCount > 0 && (
              <div>{memberCount} contributor{memberCount === 1 ? '' : 's'}</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
