'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const W = 200, H = 130
const BR = 5, RR = 5, SR = 4
const FRICTION = 0.994, MAX_SPD = 4.5, THRUST = 0.22, STAR_CNT = 3
const IFRAME_DUR = 70

const GAMES = [
  { icon: '✦',  label: 'Lumina', href: '/game',                    bg: 'linear-gradient(135deg,#2a1a4a,#1a1230)', glow: '#9060ff' },
  { icon: '🍷', label: 'Wine',   href: '/skills/fun/wine-trivia',  bg: 'linear-gradient(135deg,#3a1020,#1a0810)', glow: '#c03050' },
  { icon: '🃏', label: 'Cards',  href: '/skills/fun/matching',     bg: 'linear-gradient(135deg,#0a2a2a,#051818)', glow: '#30a090' },
  { icon: '🔵', label: 'Drag',   href: '/skills/fun/dragball',     bg: 'linear-gradient(135deg,#0a1a38,#050e20)', glow: '#4090e0' },
  { icon: '⚽', label: 'Ball',   href: '/skills/fun/ballgame',     bg: 'linear-gradient(135deg,#2a1a08,#180e04)', glow: '#c07830' },
  { icon: '🐍', label: 'Snake',  href: '/skills/fun/snake',        bg: 'linear-gradient(135deg,#0a2a10,#051808)', glow: '#30a050' },
  { icon: '🧱', label: 'Break',  href: '/skills/fun/breakout',     bg: 'linear-gradient(135deg,#1a1a0a,#0e0e04)', glow: '#c0a030' },
  { icon: '🦔', label: 'Mole',   href: '/skills/fun/whack-a-mole', bg: 'linear-gradient(135deg,#2a1808,#180e04)', glow: '#b06830' },
  { icon: '🏓', label: 'Pong',   href: '/skills/fun/pong',         bg: 'linear-gradient(135deg,#181828,#0e0e18)', glow: '#8080c0' },
]

type Pt = { x: number; y: number }

function mkStar(ball: Pt): Pt {
  const m = 14
  let s: Pt
  do { s = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m) } }
  while (Math.hypot(s.x - ball.x, s.y - ball.y) < 30)
  return s
}

export default function SidebarFunGame() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const pathname = usePathname()
  const [lives, setLives] = useState(3)
  const [phase, setPhase] = useState<'play' | 'dead'>('play')

  const frameRef = useRef<() => void>(() => {})
  const g = useRef({
    ball: { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 },
    rb: { x: 28, y: 28, vx: -1.3, vy: 1.5 },
    stars: [] as Pt[],
    score: 0, lives: 3, iframes: 0, tick: 0, raf: 0,
    phase: 'play' as 'play' | 'dead',
    drag: { on: false, ox: 0, oy: 0, cx: 0, cy: 0 },
  })

  useEffect(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = g.current

    s.ball = { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 }
    s.rb = { x: 28, y: 28, vx: -1.3, vy: 1.5 }
    s.stars = Array.from({ length: STAR_CNT }, () => mkStar(s.ball))
    s.score = 0; s.lives = 3; s.iframes = 0; s.tick = 0; s.phase = 'play'

    function draw() {
      const { ball, stars } = s
      const rb = s.rb

      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = 'rgba(42,40,32,0.28)'
      ctx.lineWidth = 0.5
      for (let x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Gold coins
      for (const st of stars) {
        const grd = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, SR + 6)
        grd.addColorStop(0, 'rgba(200,155,60,0.45)'); grd.addColorStop(1, 'rgba(200,155,60,0)')
        ctx.beginPath(); ctx.arc(st.x, st.y, SR + 6, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.fillStyle = '#c89b3c'; ctx.fillRect(st.x - SR, st.y - SR, SR * 2, SR * 2)
        ctx.fillStyle = '#ffd966'; ctx.fillRect(st.x - 1, st.y - 1, 3, 3)
      }

      // Red enemy ball
      const rg = ctx.createRadialGradient(rb.x, rb.y, 0, rb.x, rb.y, RR + 9)
      rg.addColorStop(0, 'rgba(255,50,50,0.55)'); rg.addColorStop(1, 'rgba(255,0,0,0)')
      ctx.beginPath(); ctx.arc(rb.x, rb.y, RR + 9, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill()
      const rbG = ctx.createRadialGradient(rb.x - 1.5, rb.y - 1.5, 0.5, rb.x, rb.y, RR)
      rbG.addColorStop(0, '#ffaaaa'); rbG.addColorStop(1, '#ff2222')
      ctx.beginPath(); ctx.arc(rb.x, rb.y, RR, 0, Math.PI * 2); ctx.fillStyle = rbG; ctx.fill()

      // Drag arrow
      if (s.drag.on) {
        const dx = s.drag.cx - s.drag.ox, dy = s.drag.cy - s.drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 6) {
          const nx = dx / d, ny = dy / d, len = Math.min(d * 0.65, 42)
          const ex = ball.x + nx * len, ey = ball.y + ny * len
          ctx.save(); ctx.globalAlpha = 0.85
          ctx.strokeStyle = '#c89b3c'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3])
          ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ex, ey); ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - nx * 7 + -ny * 3, ey - ny * 7 + nx * 3)
          ctx.lineTo(ex - nx * 7 - -ny * 3, ey - ny * 7 - nx * 3)
          ctx.closePath(); ctx.fillStyle = '#c89b3c'; ctx.fill()
          ctx.restore()
        }
      }

      // Blue player ball — flickers when invincible
      const visible = s.iframes === 0 || Math.floor(s.iframes / 6) % 2 === 0
      if (visible) {
        const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BR + 10)
        bg.addColorStop(0, 'rgba(140,210,255,0.5)'); bg.addColorStop(1, 'rgba(60,120,255,0)')
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BR + 10, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
        const ballG = ctx.createRadialGradient(ball.x - 1.5, ball.y - 1.5, 0.5, ball.x, ball.y, BR)
        ballG.addColorStop(0, '#d4eeff'); ballG.addColorStop(1, '#5ab4ff')
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()
      }

      // Game-over overlay on canvas
      if (s.phase === 'dead') {
        ctx.fillStyle = 'rgba(7,7,15,0.78)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ff4444'
        ctx.font = 'bold 13px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2 - 6)
        ctx.fillStyle = 'rgba(200,155,60,0.85)'
        ctx.font = '9px monospace'
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 9)
        ctx.textAlign = 'left'
      }
    }

    frameRef.current = () => {
      if (s.phase === 'dead') { draw(); return }
      const { ball, drag, stars } = s
      s.tick++

      // Thrust from drag
      if (drag.on) {
        const dx = drag.cx - drag.ox, dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 5) { const t = Math.min(d / 50, 1) * THRUST; ball.vx += (dx / d) * t; ball.vy += (dy / d) * t }
      }

      // Periodic nudge
      if (s.tick % 220 === 0) {
        const a = Math.random() * Math.PI * 2
        ball.vx += Math.cos(a) * 0.8; ball.vy += Math.sin(a) * 0.8
      }

      const spd = Math.hypot(ball.vx, ball.vy)
      if (spd > MAX_SPD) { ball.vx = ball.vx / spd * MAX_SPD; ball.vy = ball.vy / spd * MAX_SPD }

      ball.x += ball.vx; ball.y += ball.vy
      ball.vx *= FRICTION; ball.vy *= FRICTION

      if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx) * 0.88 }
      if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx) * 0.88 }
      if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy) * 0.88 }
      if (ball.y > H - BR) { ball.y = H - BR; ball.vy = -Math.abs(ball.vy) * 0.88 }

      // Red ball movement (constant speed, no friction)
      const rb = s.rb
      rb.x += rb.vx; rb.y += rb.vy
      if (rb.x < RR) { rb.x = RR; rb.vx = Math.abs(rb.vx) }
      if (rb.x > W - RR) { rb.x = W - RR; rb.vx = -Math.abs(rb.vx) }
      if (rb.y < RR) { rb.y = RR; rb.vy = Math.abs(rb.vy) }
      if (rb.y > H - RR) { rb.y = H - RR; rb.vy = -Math.abs(rb.vy) }

      // Red ball collision
      if (s.iframes === 0 && Math.hypot(ball.x - rb.x, ball.y - rb.y) < BR + RR + 1) {
        s.lives--
        setLives(s.lives)
        s.iframes = IFRAME_DUR
        if (s.lives <= 0) {
          s.phase = 'dead'
          setPhase('dead')
          draw()
          return
        }
      }
      if (s.iframes > 0) s.iframes--

      // Collect coins
      let ns = s.score
      for (let i = 0; i < stars.length; i++) {
        if (Math.hypot(ball.x - stars[i].x, ball.y - stars[i].y) < BR + SR + 2) {
          stars[i] = mkStar(ball); ns++
        }
      }
      if (ns !== s.score) { s.score = ns }

      draw()
      s.raf = requestAnimationFrame(frameRef.current)
    }

    s.raf = requestAnimationFrame(frameRef.current)
    return () => cancelAnimationFrame(s.raf)
  }, [])

  const restart = useCallback(() => {
    const s = g.current
    cancelAnimationFrame(s.raf)
    s.ball = { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 }
    s.rb = { x: 28, y: 28, vx: -1.3, vy: 1.5 }
    s.stars = Array.from({ length: STAR_CNT }, () => mkStar(s.ball))
    s.score = 0; s.lives = 3; s.iframes = 0; s.tick = 0; s.phase = 'play'
    setLives(3); setPhase('play')
    s.raf = requestAnimationFrame(frameRef.current)
  }, [])

  const xy = (e: React.MouseEvent | React.TouchEvent, el: HTMLCanvasElement): Pt => {
    const r = el.getBoundingClientRect()
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0] ?? (e as React.TouchEvent).changedTouches[0]
      return { x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height) }
    }
    const m = e as React.MouseEvent
    return { x: (m.clientX - r.left) * (W / r.width), y: (m.clientY - r.top) * (H / r.height) }
  }

  const onDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const p = xy(e, cvs.current!)
    g.current.drag = { on: true, ox: p.x, oy: p.y, cx: p.x, cy: p.y }
  }
  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!g.current.drag.on) return; e.preventDefault()
    const p = xy(e, cvs.current!)
    g.current.drag.cx = p.x; g.current.drag.cy = p.y
  }
  const onUp = () => { g.current.drag.on = false }

  return (
    <div className="flex flex-col flex-1 min-h-0"
      style={{ borderTop: '2px solid rgba(200,155,60,0.35)', background: 'rgba(200,155,60,0.03)' }}>

      {/* Mini game canvas */}
      <div className="px-2 pt-2 pb-0.5 shrink-0">
        <canvas
          ref={cvs}
          width={W}
          height={H}
          className="w-full rounded-md cursor-crosshair select-none block"
          style={{ border: '1px solid var(--border)' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
        {/* Lives + hint row */}
        <div className="flex items-center justify-between px-0.5 pt-1 pb-0.5">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <span key={i} className="text-[9px] leading-none select-none"
                style={{ color: i < lives ? '#ff3333' : '#2a2838' }}>♥</span>
            ))}
          </div>
          {phase === 'dead' ? (
            <button onClick={restart}
              className="text-[5.5px] px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
              ↺ Restart
            </button>
          ) : (
            <span className="text-[5px]" style={{ color: 'var(--text-3)' }}>drag · dodge 🔴 · collect ⭐</span>
          )}
        </div>
      </div>

      {/* Game tabs */}
      <div className="px-2 pb-2 shrink-0">
        <div className="text-[5px] px-0.5 pb-1.5 tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>Games</div>
        <div className="grid grid-cols-3 gap-1.5">
          {GAMES.map(gm => {
            const active = pathname === gm.href
            return (
              <Link key={gm.href} href={gm.href}
                className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-150"
                style={{
                  background: active ? gm.bg.replace('135deg,', '135deg,').replace(')', ', rgba(255,255,255,0.04))') : gm.bg,
                  border: `1px solid ${active ? gm.glow : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? `0 0 10px ${gm.glow}55, inset 0 1px 0 rgba(255,255,255,0.08)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  transform: active ? 'scale(1.04)' : 'scale(1)',
                }}>
                <span style={{ fontSize: 16, lineHeight: 1, filter: active ? `drop-shadow(0 0 4px ${gm.glow})` : 'none' }}>
                  {gm.icon}
                </span>
                <span style={{
                  fontSize: '5.5px',
                  letterSpacing: '0.03em',
                  color: active ? '#fff' : 'rgba(160,152,128,0.7)',
                  fontWeight: active ? 600 : 400,
                }}>
                  {gm.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Cool Items + Cool People — under Games & Entertainment */}
      <div className="shrink-0" style={{ borderTop: '1px solid rgba(200,155,60,0.15)' }}>
        <Link href="/skills/cool-items"
          className="flex items-center gap-2.5 px-3 py-2.5 hover:opacity-80 transition-opacity"
          style={{ borderLeft: '3px solid transparent' }}>
          <span className="shrink-0 flex items-center justify-center text-base"
            style={{ width: 28, height: 28, background: '#1a3a5a', borderRadius: 8 }}>💎</span>
          <div className="text-[7px] truncate" style={{ color: '#f0d898' }}>Cool Items</div>
        </Link>
        <Link href="/skills/cool-people"
          className="flex items-center gap-2.5 px-3 py-2.5 hover:opacity-80 transition-opacity"
          style={{ borderLeft: '3px solid transparent' }}>
          <span className="shrink-0 flex items-center justify-center text-base"
            style={{ width: 28, height: 28, background: '#4a1a5a', borderRadius: 8 }}>🌟</span>
          <div className="text-[7px] truncate" style={{ color: '#f0d898' }}>Cool People</div>
        </Link>
      </div>

      <div className="flex-1" />
    </div>
  )
}
