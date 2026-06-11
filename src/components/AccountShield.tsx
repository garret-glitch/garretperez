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
    <div
      className="sm:shrink-0 mx-auto sm:mx-0 shield-separator"
      style={{
        width: 240,
        background: 'transparent',
        padding: '16px 16px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Top label */}
      <div style={{
        fontSize: 7, letterSpacing: '0.22em', color: '#c89b3c',
        textTransform: 'uppercase', marginBottom: 10,
        fontFamily: "'Press Start 2P', monospace",
      }}>
        {isLoggedIn ? '— Your Character —' : '— Join the Guild —'}
      </div>

      {/* ── Shield SVG ─────────────────────────────────── */}
      <div className="relative" style={{ width: 200 }}>
        <svg
          viewBox="0 0 200 242"
          className="shield-pulse"
          style={{ display: 'block', width: '100%' }}
        >
          <path d={SHIELD} fill={color} />
          <path d={SHIELD} fill="none" stroke="#c89b3c" strokeWidth="4" />
          <path d={INNER}  fill="none" stroke="rgba(200,155,60,0.55)" strokeWidth="1.8" />
          <line x1="16" y1="88" x2="184" y2="88" stroke="rgba(200,155,60,0.4)" strokeWidth="1.2" />
          <circle cx="28"  cy="13"  r="5"   fill="#c89b3c" opacity="0.95" />
          <circle cx="28"  cy="13"  r="2.5" fill="rgba(255,220,100,0.8)" />
          <circle cx="172" cy="13"  r="5"   fill="#c89b3c" opacity="0.95" />
          <circle cx="172" cy="13"  r="2.5" fill="rgba(255,220,100,0.8)" />
          <circle cx="16"  cy="88"  r="3.5" fill="#c89b3c" opacity="0.7" />
          <circle cx="184" cy="88"  r="3.5" fill="#c89b3c" opacity="0.7" />
          <circle cx="100" cy="228" r="7"   fill="#c89b3c" opacity="0.98" />
          <circle cx="100" cy="228" r="4"   fill="rgba(255,230,100,0.85)" />
          <ellipse cx="100" cy="130" rx="65" ry="50" fill="rgba(200,155,60,0.07)" />
        </svg>

        {/* ── Content overlay ──────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {isLoggedIn ? (
            <>
              <div style={{ marginTop: '9%', fontSize: 6.5, letterSpacing: '0.15em', color: '#a07848', textTransform: 'uppercase', fontFamily: "'Press Start 2P', monospace" }}>
                Character
              </div>
              {/* Initials */}
              <div style={{
                marginTop: '4%', width: '34%', aspectRatio: '1',
                background: 'rgba(200,155,60,0.18)', border: '2.5px solid #c89b3c',
                boxShadow: '0 0 16px rgba(200,155,60,0.4)',
                color: '#ffd060', fontSize: 'clamp(14px, 3.5vw, 20px)', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Inter, sans-serif',
              }}>
                {username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
              {/* Username */}
              <div style={{
                marginTop: '4%', fontSize: 'clamp(10px, 2.4vw, 13px)', fontWeight: 700,
                color: '#f5e8c0', textAlign: 'center',
                maxWidth: '78%', lineHeight: 1.35, wordBreak: 'break-word',
                fontFamily: 'Inter, sans-serif',
              }}>
                {username}
              </div>
              {/* XP bar */}
              <div style={{ marginTop: '5%', width: '64%' }}>
                <div style={{ height: 9, background: 'rgba(200,155,60,0.15)', overflow: 'hidden', border: '1px solid rgba(200,155,60,0.4)' }}>
                  <div style={{ height: '100%', width: `${xpPercent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)' }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 'clamp(7px, 1.5vw, 9px)', color: '#a07848', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
                  {xp.toLocaleString()} XP
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: '8%', fontSize: 6.5, letterSpacing: '0.15em', color: '#a07848', textTransform: 'uppercase', fontFamily: "'Press Start 2P', monospace" }}>
                Adventurer
              </div>
              {/* Shield icon */}
              <div style={{
                marginTop: '4%', width: '34%', aspectRatio: '1',
                background: 'rgba(200,155,60,0.09)',
                border: '2px dashed rgba(200,155,60,0.5)',
                color: 'rgba(200,155,60,0.7)',
                fontSize: 'clamp(18px, 4.5vw, 26px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>🛡</div>
              {/* Headline */}
              <div style={{
                marginTop: '5%',
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(11px, 2.8vw, 14px)',
                color: '#f5d878', fontWeight: 700,
                textAlign: 'center', lineHeight: 1.4,
                letterSpacing: '0.04em',
                textShadow: '0 0 16px rgba(200,155,60,0.6)',
              }}>
                Claim Your<br />Character
              </div>
              {/* Perks */}
              <div style={{ marginTop: '5%', display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'flex-start', width: '80%' }}>
                {[
                  { icon: '⚡', text: 'Earn XP & level up' },
                  { icon: '⚔', text: 'Customize your shield' },
                  { icon: '💬', text: 'Post in communities' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 12 }}>{item.icon}</span>
                    <span style={{ fontSize: 'clamp(8px, 1.8vw, 10px)', color: '#c8a860', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Edit pencil */}
        {isLoggedIn && (
          <button
            onClick={() => setEditing(e => !e)}
            title="Customize shield"
            style={{
              position: 'absolute', top: 14, right: 10,
              width: 26, height: 26,
              background: editing ? 'rgba(200,155,60,0.4)' : 'rgba(200,155,60,0.18)',
              border: '1px solid rgba(200,155,60,0.6)',
              color: '#c89b3c', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            ✏
          </button>
        )}
      </div>

      {/* Gold divider */}
      <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,155,60,0.5) 30%, rgba(200,155,60,0.5) 70%, transparent)', margin: '14px 0 12px' }} />

      {/* Color palette */}
      {editing && (
        <div style={{
          width: '100%', marginBottom: 10, padding: '10px 12px',
          background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.3)',
        }}>
          <div style={{ fontSize: 6.5, color: '#a07848', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: "'Press Start 2P', monospace" }}>
            ✦ Shield Color
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.val}
                onClick={() => saveColor(p.val)}
                disabled={saving}
                title={p.name}
                style={{
                  height: 34, background: p.val,
                  border: p.val === color ? '2px solid #c89b3c' : '1px solid rgba(200,155,60,0.3)',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: 11, color: '#c89b3c',
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

      {/* CTA buttons */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoggedIn ? (
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              width: '100%', padding: '11px 0',
              background: 'rgba(200,155,60,0.07)',
              border: '1px solid rgba(200,155,60,0.35)',
              color: '#c89b3c', fontSize: 13, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            Sign Out
          </button>
        ) : (
          <>
            <Link
              href="/register"
              className="body-text btn-pulse"
              style={{
                display: 'block', textAlign: 'center', padding: '16px 0',
                background: 'linear-gradient(135deg, #d4a840 0%, #a87828 100%)',
                color: '#0a0600',
                fontSize: 16, fontWeight: 800,
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              🛡 Create Account
            </Link>
            <Link
              href="/login"
              className="body-text"
              style={{
                display: 'block', textAlign: 'center', padding: '11px 0',
                background: 'rgba(200,155,60,0.08)',
                border: '1.5px solid rgba(200,155,60,0.45)',
                color: '#f0d898',
                fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.01em',
              }}
            >
              Log In
            </Link>
          </>
        )}
      </div>

    </div>
  )
}
