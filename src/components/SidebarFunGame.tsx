'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

const W = 200
const H = 130
const BR = 5
const SR = 4
const FRICTION = 0.994
const MAX_SPD = 4.5
const THRUST = 0.22
const STAR_CNT = 3

const GAMES = [
  { icon: '🍷', label: 'Wine',   href: '/skills/fun/wine-trivia' },
  { icon: '🃏', label: 'Cards',  href: '/skills/fun/matching' },
  { icon: '🐍', label: 'Snake',  href: '/skills/fun/snake' },
  { icon: '🧱', label: 'Break',  href: '/skills/fun/breakout' },
  { icon: '🦔', label: 'Mole',   href: '/skills/fun/whack-a-mole' },
  { icon: '🏓', label: 'Pong',   href: '/skills/fun/pong' },
]

type Pt = { x: number; y: number }

function mkStar(ball: Pt): Pt {
  const m = 12
  let s: Pt
  do { s = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m) } }
  while (Math.hypot(s.x - ball.x, s.y - ball.y) < 32)
  return s
}

export default function SidebarFunGame() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const g = useRef({
    ball: { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 },
    stars: [] as Pt[],
    score: 0,
    drag: { on: false, ox: 0, oy: 0, cx: 0, cy: 0 },
    tick: 0, raf: 0,
  })

  useEffect(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = g.current
    s.ball = { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 }
    s.stars = Array.from({ length: STAR_CNT }, () => mkStar(s.ball))
    s.score = 0; s.tick = 0

    const frame = () => {
      const { ball, drag, stars } = s
      s.tick++

      if (drag.on) {
        const dx = drag.cx - drag.ox, dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 5) {
          const t = Math.min(d / 50, 1) * THRUST
          ball.vx += (dx / d) * t; ball.vy += (dy / d) * t
        }
      }

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

      let ns = s.score
      for (let i = 0; i < stars.length; i++) {
        if (Math.hypot(ball.x - stars[i].x, ball.y - stars[i].y) < BR + SR + 2) {
          stars[i] = mkStar(ball); ns++
        }
      }
      if (ns !== s.score) { s.score = ns; setScore(ns) }

      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = 'rgba(42,40,32,0.3)'
      ctx.lineWidth = 0.5
      for (let x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      for (const st of stars) {
        const grd = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, SR + 7)
        grd.addColorStop(0, 'rgba(200,155,60,0.45)'); grd.addColorStop(1, 'rgba(200,155,60,0)')
        ctx.beginPath(); ctx.arc(st.x, st.y, SR + 7, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.fillStyle = '#c89b3c'
        ctx.fillRect(st.x - SR, st.y - SR, SR * 2, SR * 2)
        ctx.fillStyle = '#ffd966'
        ctx.fillRect(st.x - 1, st.y - 1, 3, 3)
      }

      if (drag.on) {
        const dx = drag.cx - drag.ox, dy = drag.cy - drag.oy
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
          ctx.lineTo(ex - nx * 7 + (-ny * 3), ey - ny * 7 + (nx * 3))
          ctx.lineTo(ex - nx * 7 - (-ny * 3), ey - ny * 7 - (nx * 3))
          ctx.closePath(); ctx.fillStyle = '#c89b3c'; ctx.fill()
          ctx.restore()
        }
      }

      const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BR + 10)
      bg.addColorStop(0, 'rgba(140,210,255,0.5)'); bg.addColorStop(1, 'rgba(60,120,255,0)')
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BR + 10, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
      const ballG = ctx.createRadialGradient(ball.x - 1.5, ball.y - 1.5, 0.5, ball.x, ball.y, BR)
      ballG.addColorStop(0, '#d4eeff'); ballG.addColorStop(1, '#5ab4ff')
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()

      s.raf = requestAnimationFrame(frame)
    }

    s.raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(s.raf)
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
    if (!g.current.drag.on) return
    e.preventDefault()
    const p = xy(e, cvs.current!)
    g.current.drag.cx = p.x; g.current.drag.cy = p.y
  }
  const onUp = () => { g.current.drag.on = false }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ borderTop: '2px solid rgba(200,155,60,0.35)', background: 'rgba(200,155,60,0.03)' }}>

      {/* Skill-style header — mirrors the guild channel rows above */}
      <Link href="/skills/fun"
        className="flex items-center gap-2.5 px-3 py-2.5 shrink-0 hover:opacity-80 transition-opacity"
        style={{ borderLeft: '3px solid var(--gold)', borderBottom: '1px solid rgba(200,155,60,0.15)' }}>
        <span className="text-base shrink-0">🎮</span>
        <div className="flex-1 min-w-0">
          <div className="text-[7px] font-bold" style={{ color: 'var(--text-1)' }}>Fun Zone</div>
          <div className="text-[5.5px]" style={{ color: 'var(--text-3)' }}>Games &amp; Entertainment</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[6px] font-bold" style={{ color: 'var(--gold)' }}>88</div>
          <div className="text-[5px]" style={{ color: 'var(--gold)' }}>⭐ {score}</div>
        </div>
      </Link>

      {/* Mini game */}
      <div className="px-2 pt-2 pb-1 shrink-0">
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
        <div className="text-center text-[5px] pt-0.5" style={{ color: 'var(--text-3)' }}>
          drag to thrust · collect coins
        </div>
      </div>

      {/* 6 game links — 3-col grid */}
      <div className="px-2 pb-2 grid grid-cols-3 gap-1 shrink-0">
        {GAMES.map(gm => (
          <Link key={gm.href} href={gm.href}
            className="flex flex-col items-center gap-0.5 py-1.5 rounded transition-opacity hover:opacity-75"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <span className="text-sm leading-none">{gm.icon}</span>
            <span className="text-[5px]" style={{ color: 'var(--text-3)' }}>{gm.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex-1" />
    </div>
  )
}
