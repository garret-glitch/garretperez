'use client'
import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

const W = 200
const H = 144
const BR = 5
const SR = 4
const FRICTION = 0.994
const MAX_SPD = 4.5
const THRUST = 0.22
const STAR_CNT = 3

type Pt = { x: number; y: number }

function mkStar(ball: Pt): Pt {
  const m = 14
  let s: Pt
  do {
    s = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m) }
  } while (Math.hypot(s.x - ball.x, s.y - ball.y) < 36)
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
    tick: 0,
    raf: 0,
  })

  useEffect(() => {
    const canvas = cvs.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = g.current
    s.ball = { x: W / 2, y: H / 2, vx: 1.6, vy: 0.9 }
    s.stars = Array.from({ length: STAR_CNT }, () => mkStar(s.ball))
    s.score = 0
    s.tick = 0

    const frame = () => {
      const { ball, drag, stars } = s
      s.tick++

      // Thrust from drag
      if (drag.on) {
        const dx = drag.cx - drag.ox
        const dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 5) {
          const t = Math.min(d / 50, 1) * THRUST
          ball.vx += (dx / d) * t
          ball.vy += (dy / d) * t
        }
      }

      // Periodic nudge so ball never fully stops
      if (s.tick % 220 === 0) {
        const a = Math.random() * Math.PI * 2
        ball.vx += Math.cos(a) * 0.9
        ball.vy += Math.sin(a) * 0.9
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
          stars[i] = mkStar(ball)
          ns++
        }
      }
      if (ns !== s.score) { s.score = ns; setScore(ns) }

      // Background
      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(42,40,32,0.35)'
      ctx.lineWidth = 0.5
      for (let x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Gold coin stars
      for (const st of stars) {
        const grd = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, SR + 7)
        grd.addColorStop(0, 'rgba(200,155,60,0.45)')
        grd.addColorStop(1, 'rgba(200,155,60,0)')
        ctx.beginPath(); ctx.arc(st.x, st.y, SR + 7, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.beginPath(); ctx.arc(st.x, st.y, SR, 0, Math.PI * 2); ctx.fillStyle = '#c89b3c'; ctx.fill()
        ctx.beginPath(); ctx.arc(st.x - 1, st.y - 1, SR * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#ffd966'; ctx.fill()
      }

      // Thrust arrow
      if (drag.on) {
        const dx = drag.cx - drag.ox
        const dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 6) {
          const nx = dx / d, ny = dy / d
          const len = Math.min(d * 0.65, 42)
          const ex = ball.x + nx * len, ey = ball.y + ny * len
          ctx.save()
          ctx.globalAlpha = 0.85
          ctx.strokeStyle = '#c89b3c'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ex, ey); ctx.stroke()
          ctx.setLineDash([])
          const px = -ny * 3, py = nx * 3
          ctx.beginPath()
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - nx * 7 + px, ey - ny * 7 + py)
          ctx.lineTo(ex - nx * 7 - px, ey - ny * 7 - py)
          ctx.closePath(); ctx.fillStyle = '#c89b3c'; ctx.fill()
          ctx.restore()
        }
      }

      // Ball glow
      const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BR + 10)
      bg.addColorStop(0, 'rgba(140,210,255,0.5)')
      bg.addColorStop(1, 'rgba(60,120,255,0)')
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BR + 10, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()

      // Ball body
      const ballG = ctx.createRadialGradient(ball.x - 1.5, ball.y - 1.5, 0.5, ball.x, ball.y, BR)
      ballG.addColorStop(0, '#d4eeff')
      ballG.addColorStop(1, '#5ab4ff')
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()

      s.raf = requestAnimationFrame(frame)
    }

    s.raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(s.raf)
  }, [])

  const xy = (e: React.MouseEvent | React.TouchEvent, el: HTMLCanvasElement): Pt => {
    const r = el.getBoundingClientRect()
    const sx = W / r.width, sy = H / r.height
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0] ?? (e as React.TouchEvent).changedTouches[0]
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy }
    }
    const m = e as React.MouseEvent
    return { x: (m.clientX - r.left) * sx, y: (m.clientY - r.top) * sy }
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
    <div className="flex flex-col flex-1 border-t" style={{ borderColor: 'var(--border-dim)' }}>
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center justify-between shrink-0">
        <Link href="/skills/fun" className="text-[6px] uppercase tracking-widest hover:opacity-75 transition-opacity"
          style={{ color: 'var(--gold)' }}>
          🎮 Fun Zone
        </Link>
        <span className="text-[6px] font-bold" style={{ color: 'var(--gold)' }}>⭐ {score}</span>
      </div>

      {/* Canvas */}
      <div className="px-2 shrink-0">
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
        <div className="text-center text-[5px] pt-0.5 pb-1" style={{ color: 'var(--text-3)' }}>
          drag to thrust · collect gold coins
        </div>
      </div>

      {/* Game links */}
      <div className="px-2 pb-2 grid grid-cols-2 gap-1.5 shrink-0">
        <Link href="/skills/fun/wine-trivia"
          className="flex items-center justify-center gap-1 rounded py-1.5 text-[6px] transition-opacity hover:opacity-75"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          <span>🍷</span><span>Wine Quiz</span>
        </Link>
        <Link href="/skills/fun/matching"
          className="flex items-center justify-center gap-1 rounded py-1.5 text-[6px] transition-opacity hover:opacity-75"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          <span>🃏</span><span>Matching</span>
        </Link>
      </div>

      {/* Spacer to push user block down */}
      <div className="flex-1" />
    </div>
  )
}
