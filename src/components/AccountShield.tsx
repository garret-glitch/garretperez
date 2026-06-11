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
    <div className="sm:shrink-0 flex flex-col items-center w-[200px] mx-auto sm:mx-0">

      {/* ── Shield SVG ───────────────────────────────────── */}
      <div className="relative w-full sm:w-[200px]">
        <svg viewBox="0 0 200 242" className="w-full sm:w-[200px]" style={{ display: 'block' }}>
          {/* Body */}
          <path d={SHIELD} fill={color} />
          {/* Gold outer border */}
          <path d={SHIELD} fill="none" stroke="#c89b3c" strokeWidth="3.5" />
          {/* Inner decorative border */}
          <path d={INNER} fill="none" stroke="rgba(200,155,60,0.45)" strokeWidth="1.5" />
          {/* Horizontal divider */}
          <line x1="16" y1="88" x2="184" y2="88" stroke="rgba(200,155,60,0.3)" strokeWidth="1" />
          {/* Corner jewels — top */}
          <circle cx="28"  cy="13"  r="4.5" fill="#c89b3c" opacity="0.9" />
          <circle cx="28"  cy="13"  r="2.2" fill="rgba(255,220,100,0.75)" />
          <circle cx="172" cy="13"  r="4.5" fill="#c89b3c" opacity="0.9" />
          <circle cx="172" cy="13"  r="2.2" fill="rgba(255,220,100,0.75)" />
          {/* Mid jewels on divider */}
          <circle cx="16"  cy="88"  r="3"   fill="#c89b3c" opacity="0.6" />
          <circle cx="184" cy="88"  r="3"   fill="#c89b3c" opacity="0.6" />
          {/* Bottom point gem */}
          <circle cx="100" cy="228" r="6"   fill="#c89b3c" opacity="0.95" />
          <circle cx="100" cy="228" r="3.5" fill="rgba(255,225,100,0.8)" />
          {/* Subtle crest glow */}
          <ellipse cx="100" cy="130" rx="56" ry="42" fill="rgba(200,155,60,0.04)" />
        </svg>

        {/* ── Content overlay ──────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ marginTop: '9%', fontSize: 6, letterSpacing: '0.15em', color: '#a07848', textTransform: 'uppercase' }}>
            Account
          </div>

          {isLoggedIn ? (
            <>
              {/* Initials avatar */}
              <div style={{
                marginTop: '4%', width: '27%', aspectRatio: '1',
                borderRadius: 14,
                background: 'rgba(200,155,60,0.15)', border: '2.5px solid #c89b3c',
                color: '#ffd060', fontSize: 'clamp(12px, 3vw, 16px)', fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>

              {/* Name */}
              <div style={{ marginTop: '3%', fontSize: 'clamp(7px, 1.8vw, 9px)', color: '#f0d898', textAlign: 'center', maxWidth: '70%', lineHeight: 1.4, wordBreak: 'break-word' }}>
                {username}
              </div>

              {/* XP bar */}
              <div style={{ marginTop: '3%', width: '54%' }}>
                <div style={{ height: 7, background: 'rgba(200,155,60,0.15)', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(200,155,60,0.3)' }}>
                  <div style={{ height: '100%', width: `${xpPercent}%`, background: 'linear-gradient(90deg, #6a4010, #c89b3c)', borderRadius: 3 }} />
                </div>
                <div style={{ marginTop: 3, fontSize: 'clamp(5px, 1.2vw, 6px)', color: '#8a6030', textAlign: 'center' }}>
                  {xp.toLocaleString()} XP
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Locked avatar */}
              <div style={{
                marginTop: '5%', width: '27%', aspectRatio: '1',
                borderRadius: 14,
                background: 'rgba(200,155,60,0.07)',
                border: '2px dashed rgba(200,155,60,0.35)',
                color: 'rgba(200,155,60,0.4)',
                fontSize: 'clamp(14px, 3.5vw, 18px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>🔒</div>

              {/* Claim headline */}
              <div style={{
                marginTop: '4%',
                fontFamily: "'Cinzel', serif",
                fontSize: 'clamp(7px, 1.8vw, 9px)',
                color: '#e8d080', fontWeight: 700,
                textAlign: 'center', lineHeight: 1.5,
                letterSpacing: '0.04em',
              }}>
                Claim Your<br />Character
              </div>

              {/* Locked XP bar */}
              <div style={{ marginTop: '4%', width: '54%' }}>
                <div style={{ height: 6, background: 'rgba(200,155,60,0.08)', border: '1px dashed rgba(200,155,60,0.25)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '0%' }} />
                </div>
                <div style={{ marginTop: 3, fontSize: 'clamp(5px, 1.2vw, 6px)', color: 'rgba(200,155,60,0.3)', textAlign: 'center', letterSpacing: '0.05em' }}>
                  — XP —
                </div>
              </div>

              {/* Perks list */}
              <div style={{ marginTop: '5%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                {['⚡ Earn XP just by browsing', '⚔ Level up your profile', '💬 Post in communities'].map(line => (
                  <div key={line} style={{ fontSize: 'clamp(4.5px, 1.1vw, 5.5px)', color: '#907040', textAlign: 'center' }}>{line}</div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Edit pencil — only when logged in */}
        {isLoggedIn && (
          <button
            onClick={() => setEditing(e => !e)}
            title="Customize shield"
            style={{
              position: 'absolute', top: 16, right: 14,
              width: 22, height: 22, borderRadius: 6,
              background: editing ? 'rgba(200,155,60,0.35)' : 'rgba(200,155,60,0.15)',
              border: '1px solid rgba(200,155,60,0.5)',
              color: '#c89b3c', fontSize: 10, cursor: 'pointer',
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
        <div className="w-full sm:w-[188px]" style={{
          marginTop: 4, padding: '8px 10px',
          background: '#13131c', border: '1px solid rgba(200,155,60,0.4)', borderRadius: 8,
        }}>
          <div style={{ fontSize: 6, color: '#a07848', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
                  height: 30, borderRadius: 5, background: p.val,
                  border: p.val === color ? '2px solid #c89b3c' : '1px solid rgba(200,155,60,0.3)',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: 5, color: '#c89b3c',
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

      {/* ── Logout / Login ───────────────────────────────── */}
      <div className="w-full sm:w-[188px]" style={{ marginTop: 8 }}>
        {isLoggedIn ? (
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            style={{
              width: '100%', padding: '7px 0',
              background: 'linear-gradient(180deg, #4a2e10 0%, #2e1a06 100%)',
              border: '1.5px solid rgba(200,155,60,0.35)',
              borderRadius: 6, color: '#e8d090', fontSize: 7, cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            ⛨ Logout
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {/* Primary CTA — big gold Join button */}
            <Link href="/register" style={{
              display: 'block', textAlign: 'center', padding: '11px 0',
              background: 'linear-gradient(135deg, #c89b3c 0%, #9a7228 100%)',
              color: '#120c00',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 7, fontWeight: 700,
              letterSpacing: '0.03em',
              textDecoration: 'none',
              boxShadow: '0 3px 16px rgba(200,155,60,0.45)',
            }}>🛡 Create Account</Link>
            {/* Secondary — login */}
            <Link href="/login" style={{
              display: 'block', textAlign: 'center', padding: '7px 0',
              background: 'transparent',
              border: '1px solid rgba(200,155,60,0.35)',
              color: '#c89b3c', fontSize: 7,
              letterSpacing: '0.05em', textDecoration: 'none',
            }}>Already a member? Login</Link>
          </div>
        )}
      </div>

    </div>
  )
}
