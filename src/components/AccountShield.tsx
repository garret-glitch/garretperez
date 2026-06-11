'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

const PRESETS = [
  { name: 'Leather', val: '#1a0e06' },
  { name: 'Steel',   val: '#0e1628' },
  { name: 'Forest',  val: '#081a10' },
  { name: 'Crimson', val: '#1a0808' },
  { name: 'Arcane',  val: '#100818' },
  { name: 'Onyx',    val: '#111118' },
]

const SHIELD = 'M 20,4 L 180,4 Q 196,4 196,20 L 196,148 Q 196,160 186,168 L 104,236 Q 100,240 96,236 L 14,168 Q 4,160 4,148 L 4,20 Q 4,4 20,4 Z'
const INNER  = 'M 28,13 L 172,13 Q 184,13 184,25 L 184,144 Q 184,154 175,162 L 100,224 L 25,162 Q 16,154 16,144 L 16,25 Q 16,13 28,13 Z'

interface Props {
  username: string | null
  level: number
  xp: number
  xpPercent: number
  isLoggedIn: boolean
  initColor?: string
}

export default function AccountShield({ username, xp, xpPercent, isLoggedIn, initColor = '#1a0e06' }: Props) {
  const [color, setColor]     = useState(initColor)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const saveColor = async (c: string) => {
    setSaving(true)
    setColor(c)
    try {
      await fetch('/api/user/shield-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: c }),
      })
    } catch { /* ignore */ }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="sm:shrink-0 flex flex-col items-center mx-auto sm:mx-0" style={{ width: 220 }}>

      {/* ── Shield SVG ───────────────────────────────────── */}
      <div className="relative" style={{ width: 220 }}>
        <svg
          viewBox="0 0 200 242"
          style={{
            display: 'block', width: '100%',
            filter: isLoggedIn
              ? 'drop-shadow(0 0 10px rgba(200,155,60,0.4)) drop-shadow(0 0 24px rgba(200,155,60,0.2))'
              : 'drop-shadow(0 0 14px rgba(200,155,60,0.55)) drop-shadow(0 0 32px rgba(200,155,60,0.25))',
          }}
        >
          <path d={SHIELD} fill={color} />
          <path d={SHIELD} fill="none" stroke="#c89b3c" strokeWidth="3.5" />
          <path d={INNER}  fill="none" stroke="rgba(200,155,60,0.5)" strokeWidth="1.5" />
          <line x1="16" y1="88" x2="184" y2="88" stroke="rgba(200,155,60,0.35)" strokeWidth="1" />
          <circle cx="28"  cy="13"  r="4.5" fill="#c89b3c" opacity="0.9" />
          <circle cx="28"  cy="13"  r="2.2" fill="rgba(255,220,100,0.75)" />
          <circle cx="172" cy="13"  r="4.5" fill="#c89b3c" opacity="0.9" />
          <circle cx="172" cy="13"  r="2.2" fill="rgba(255,220,100,0.75)" />
          <circle cx="16"  cy="88"  r="3"   fill="#c89b3c" opacity="0.6" />
          <circle cx="184" cy="88"  r="3"   fill="#c89b3c" opacity="0.6" />
          <circle cx="100" cy="228" r="6"   fill="#c89b3c" opacity="0.95" />
          <circle cx="100" cy="228" r="3.5" fill="rgba(255,225,100,0.8)" />
          <ellipse cx="100" cy="130" rx="62" ry="48" fill="rgba(200,155,60,0.06)" />
        </svg>

        {/* ── Content overlay ──────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ marginTop: '9%', fontSize: 6.5, letterSpacing: '0.15em', color: '#a07848', textTransform: 'uppercase', fontFamily: "'Press Start 2P', monospace" }}>
            {isLoggedIn ? 'Character' : 'Account'}
          </div>

          {isLoggedIn ? (
            <>
              {/* Initials avatar */}
              <div style={{
                marginTop: '4%', width: '32%', aspectRatio: '1',
                background: 'rgba(200,155,60,0.15)', border: '2.5px solid #c89b3c',
                boxShadow: '0 0 14px rgba(200,155,60,0.35)',
                color: '#ffd060', fontSize: 'clamp(14px, 3.5vw, 19px)', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
              }}>
                {username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>

              {/* Username */}
              <div style={{
                marginTop: '4%',
                fontSize: 'clamp(9px, 2.2vw, 12px)', fontWeight: 600,
                color: '#f5e8c0', textAlign: 'center',
                maxWidth: '75%', lineHeight: 1.4, wordBreak: 'break-word',
                fontFamily: 'Inter, sans-serif',
              }}>
                {username}
              </div>

              {/* XP bar */}
              <div style={{ marginTop: '5%', width: '62%' }}>
                <div style={{ height: 8, background: 'rgba(200,155,60,0.15)', overflow: 'hidden', border: '1px solid rgba(200,155,60,0.35)' }}>
                  <div style={{ height: '100%', width: `${xpPercent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)' }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 'clamp(6.5px, 1.4vw, 8px)', color: '#a07848', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                  {xp.toLocaleString()} XP
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Lock icon */}
              <div style={{
                marginTop: '5%', width: '32%', aspectRatio: '1',
                background: 'rgba(200,155,60,0.07)',
                border: '1.5px dashed rgba(200,155,60,0.45)',
                color: 'rgba(200,155,60,0.55)',
                fontSize: 'clamp(16px, 4vw, 22px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>🔒</div>

              {/* Headline */}
              <div style={{
                marginTop: '5%',
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(10px, 2.5vw, 13px)',
                color: '#f0d898', fontWeight: 700,
                textAlign: 'center', lineHeight: 1.45,
                letterSpacing: '0.04em',
              }}>
                Claim Your<br />Character
              </div>

              {/* Perks */}
              <div style={{ marginTop: '5%', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', width: '82%' }}>
                {[
                  { icon: '⚡', text: 'Earn XP & level up' },
                  { icon: '⚔', text: 'Customize your shield' },
                  { icon: '💬', text: 'Post in communities' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: 'clamp(7px, 1.6vw, 9px)', color: '#b09060', fontFamily: 'Inter, sans-serif' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Edit pencil — logged in only */}
        {isLoggedIn && (
          <button
            onClick={() => setEditing(e => !e)}
            title="Customize shield"
            style={{
              position: 'absolute', top: 16, right: 12,
              width: 24, height: 24,
              background: editing ? 'rgba(200,155,60,0.35)' : 'rgba(200,155,60,0.15)',
              border: '1px solid rgba(200,155,60,0.5)',
              color: '#c89b3c', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            ✏
          </button>
        )}
      </div>

      {/* ── Color palette ────────────────────────────────── */}
      {editing && (
        <div style={{
          width: 208, marginTop: 4, padding: '10px 12px',
          background: '#13131c', border: '1px solid rgba(200,155,60,0.4)',
        }}>
          <div style={{ fontSize: 6, color: '#a07848', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Press Start 2P', monospace" }}>
            ✦ Shield Color
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
            {PRESETS.map(p => (
              <button
                key={p.val}
                onClick={() => saveColor(p.val)}
                disabled={saving}
                title={p.name}
                style={{
                  height: 32, background: p.val,
                  border: p.val === color ? '2px solid #c89b3c' : '1px solid rgba(200,155,60,0.3)',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: 10, color: '#c89b3c',
                  fontFamily: 'Inter, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border 0.1s',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Buttons ───────────────────────────────────────── */}
      <div style={{ width: 208, marginTop: 10 }}>
        {isLoggedIn ? (
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              width: '100%', padding: '10px 0',
              background: 'rgba(200,155,60,0.07)',
              border: '1px solid rgba(200,155,60,0.3)',
              color: '#c89b3c', fontSize: 13, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            Sign Out
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link href="/register" className="body-text" style={{
              display: 'block', textAlign: 'center', padding: '14px 0',
              background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)',
              color: '#0e0800',
              fontSize: 15, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 22px rgba(200,155,60,0.5)',
              letterSpacing: '0.01em',
            }}>🛡 Create Account</Link>
            <Link href="/login" className="body-text" style={{
              display: 'block', textAlign: 'center', padding: '10px 0',
              background: 'rgba(200,155,60,0.06)',
              border: '1px solid rgba(200,155,60,0.4)',
              color: '#e8c870',
              fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '0.01em',
            }}>Log In</Link>
          </div>
        )}
      </div>

    </div>
  )
}
