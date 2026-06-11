'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

const THEMES = [
  { name: 'Gold',    val: '#1a0e06', bg: 'linear-gradient(160deg, #1e1200 0%, #3a2208 100%)', border: 'rgba(200,155,60,0.5)' },
  { name: 'Royal',   val: '#0e1628', bg: 'linear-gradient(160deg, #0a1020 0%, #162040 100%)', border: 'rgba(80,120,220,0.5)'  },
  { name: 'Forest',  val: '#081a10', bg: 'linear-gradient(160deg, #06120a 0%, #0e2016 100%)', border: 'rgba(60,160,80,0.5)'   },
  { name: 'Crimson', val: '#1a0808', bg: 'linear-gradient(160deg, #160606 0%, #2c1010 100%)', border: 'rgba(200,60,60,0.5)'   },
  { name: 'Arcane',  val: '#100818', bg: 'linear-gradient(160deg, #0c0618 0%, #1e103a 100%)', border: 'rgba(140,80,220,0.5)'  },
  { name: 'Onyx',    val: '#111118', bg: 'linear-gradient(160deg, #0d0d16 0%, #1a1a28 100%)', border: 'rgba(140,140,180,0.45)' },
]

interface Props {
  username: string | null
  level: number
  xp: number
  xpPercent: number
  isLoggedIn: boolean
  initColor?: string
}

export default function AccountShield({ username, level, xp, xpPercent, isLoggedIn, initColor = '#1a0e06' }: Props) {
  const [color, setColor] = useState(initColor)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const theme = THEMES.find(t => t.val === color) ?? THEMES[0]

  const saveColor = async (val: string) => {
    setSaving(true)
    setColor(val)
    setEditing(false)
    try {
      await fetch('/api/user/shield-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: val }),
      })
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div
      className="w-full sm:w-[240px] sm:shrink-0 sm:mx-0"
      style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: '2px solid rgba(200,155,60,0.42)',
        boxShadow: '0 6px 36px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(200,155,60,0.08)',
        display: 'flex', flexDirection: 'column',
      }}
    >

      {/* ── Banner ─────────────────────────────────────────── */}
      <div style={{
        background: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
        padding: '24px 20px 20px',
        flexShrink: 0,
        position: 'relative',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        {isLoggedIn ? (
          <>
            <div style={{
              width: 58, height: 58,
              background: 'rgba(0,0,0,0.35)',
              border: `2px solid ${theme.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#f5e8c0',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.02em',
            }}>
              {username?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: '#f5e8c0',
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em', textAlign: 'center',
              maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {username}
            </div>
            {/* Theme picker toggle */}
            <button
              onClick={() => setEditing(e => !e)}
              title="Change banner theme"
              style={{
                position: 'absolute', top: 10, right: 10,
                width: 22, height: 22, padding: 0,
                background: editing ? 'rgba(200,155,60,0.25)' : 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(200,155,60,0.35)',
                color: '#c89b3c', fontSize: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              ✏
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, lineHeight: 1 }}>⚔</div>
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 13, fontWeight: 700,
              color: '#f0d898', textAlign: 'center', lineHeight: 1.4,
              letterSpacing: '0.04em',
              textShadow: '0 0 24px rgba(200,155,60,0.55)',
            }}>
              Your Character<br />Awaits
            </div>
          </>
        )}
      </div>

      {/* ── Theme picker ───────────────────────────────────── */}
      {editing && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(200,155,60,0.04)',
          borderBottom: '1px solid rgba(200,155,60,0.14)',
        }}>
          <div style={{ fontSize: 7.5, color: '#7a6030', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8, fontFamily: "'Press Start 2P', monospace" }}>
            Banner Theme
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {THEMES.map(t => (
              <button
                key={t.val}
                onClick={() => saveColor(t.val)}
                disabled={saving}
                style={{
                  height: 36, background: t.bg,
                  border: t.val === color ? `2px solid ${t.border}` : '1px solid rgba(200,155,60,0.2)',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: 10, color: '#d4b880',
                  fontFamily: 'Inter, sans-serif', fontWeight: 500,
                  transition: 'border 0.1s',
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────── */}
      <div style={{
        padding: '18px 18px 16px',
        ...(isLoggedIn ? { flex: 1 } : {}),
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {isLoggedIn ? (
          <>
            {/* Stat row */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Level', value: level,              size: 22 },
                { label: 'XP',    value: xp.toLocaleString(), size: 17 },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, padding: '9px 8px',
                  background: 'rgba(200,155,60,0.05)',
                  border: '1px solid rgba(200,155,60,0.16)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: s.size, fontWeight: 700, color: '#c89b3c', lineHeight: 1, marginBottom: 5, fontFamily: 'Inter, sans-serif' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 6.5, color: '#6a5030', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* XP bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 7, color: '#7a5828', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>
                  Progress
                </span>
                <span style={{ fontSize: 11, color: '#8a6840', fontFamily: 'Inter, sans-serif' }}>
                  {xpPercent}%
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${xpPercent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)', transition: 'width 0.6s ease' }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(200,155,60,0.12)', flexShrink: 0 }} />

            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              style={{
                width: '100%', padding: '10px 0',
                background: 'transparent',
                border: '1px solid rgba(200,155,60,0.28)',
                color: '#8a7050', fontSize: 12, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontWeight: 600,
                letterSpacing: '0.01em',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/register" className="body-text" style={{
              display: 'block', textAlign: 'center', padding: '14px 0',
              background: 'linear-gradient(135deg, #d4a840 0%, #a87828 100%)',
              color: '#0a0600', fontSize: 15, fontWeight: 800,
              textDecoration: 'none',
              boxShadow: '0 3px 18px rgba(200,155,60,0.38)',
              letterSpacing: '0.01em',
            }}>
              🛡 Create Account
            </Link>
            <Link href="/login" className="body-text" style={{
              display: 'block', textAlign: 'center', padding: '11px 0',
              background: 'transparent',
              border: '1px solid rgba(200,155,60,0.32)',
              color: '#c89b3c', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', letterSpacing: '0.01em',
            }}>
              Log In
            </Link>
          </div>
        )}
      </div>

    </div>
  )
}
