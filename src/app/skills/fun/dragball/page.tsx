'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'

const W = 480
const H = 360
const BR = 7, RR = 7, SR = 5
const FRICTION = 0.992, MAX_SPD = 5.5, THRUST = 0.28, STAR_CNT = 5
const IFRAME_DUR = 90
const BASE_RB_SPD = 1.8

type Pt = { x: number; y: number }
type Phase = 'idle' | 'play' | 'dead'

function mkStar(ball: Pt): Pt {
  const m = 18
  let s: Pt
  do { s = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m) } }
  while (Math.hypot(s.x - ball.x, s.y - ball.y) < 45)
  return s
}

function mkEnemy(ball: Pt, existing: Pt[]): Pt {
  const m = 20
  let p: Pt
  let tries = 0
  do {
    p = { x: m + Math.random() * (W - 2 * m), y: m + Math.random() * (H - 2 * m) }
    tries++
  } while (
    tries < 50 &&
    (Math.hypot(p.x - ball.x, p.y - ball.y) < 80 ||
      existing.some(e => Math.hypot(p.x - e.x, p.y - e.y) < 40))
  )
  return p
}

export default function DragBallPage() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [refreshKey, setRefreshKey] = useState(0)
  const submitted = useRef(false)

  const frameRef = useRef<() => void>(() => {})
  const g = useRef({
    ball: { x: W / 2, y: H / 2, vx: 1.4, vy: 0.8 },
    enemies: [] as Array<{ x: number; y: number; vx: number; vy: number }>,
    stars: [] as Pt[],
    score: 0, lives: 3, iframes: 0, tick: 0, raf: 0,
    phase: 'idle' as Phase,
    drag: { on: false, ox: 0, oy: 0, cx: 0, cy: 0 },
  })

  // Submit score on death
  useEffect(() => {
    if (phase !== 'dead' || submitted.current || g.current.score === 0) return
    submitted.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'dragball', score: g.current.score }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  const startGame = useCallback(() => {
    const s = g.current
    cancelAnimationFrame(s.raf)
    s.ball = { x: W / 2, y: H / 2, vx: 1.4, vy: 0.8 }
    const spd = BASE_RB_SPD
    s.enemies = [
      { x: 40, y: 40, vx: -spd * 0.9, vy: spd },
      { x: W - 40, y: H - 40, vx: spd, vy: -spd * 0.8 },
    ]
    s.stars = Array.from({ length: STAR_CNT }, () => mkStar(s.ball))
    s.score = 0; s.lives = 3; s.iframes = 0; s.tick = 0; s.phase = 'play'
    s.drag = { on: false, ox: 0, oy: 0, cx: 0, cy: 0 }
    submitted.current = false
    setScore(0); setLives(3); setPhase('play')
    s.raf = requestAnimationFrame(frameRef.current)
  }, [])

  useEffect(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = g.current

    function draw() {
      const { ball, stars, enemies, drag } = s

      ctx.fillStyle = '#07070f'
      ctx.fillRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(42,40,32,0.22)'
      ctx.lineWidth = 0.5
      for (let x = 30; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 30; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // Score display
      ctx.fillStyle = 'rgba(200,155,60,0.9)'
      ctx.font = `700 11px "Press Start 2P", monospace`
      ctx.textAlign = 'right'
      ctx.fillText(String(s.score), W - 12, 20)
      ctx.textAlign = 'left'

      // Lives
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? '#ff3333' : '#2a2838'
        ctx.font = '13px monospace'
        ctx.fillText('♥', 10 + i * 18, 20)
      }

      // Gold coins
      for (const st of stars) {
        const grd = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, SR + 8)
        grd.addColorStop(0, 'rgba(200,155,60,0.5)'); grd.addColorStop(1, 'rgba(200,155,60,0)')
        ctx.beginPath(); ctx.arc(st.x, st.y, SR + 8, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill()
        ctx.fillStyle = '#c89b3c'
        ctx.beginPath(); ctx.arc(st.x, st.y, SR, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ffd966'
        ctx.beginPath(); ctx.arc(st.x - 1.5, st.y - 1.5, SR * 0.45, 0, Math.PI * 2); ctx.fill()
      }

      // Enemy balls
      for (const rb of enemies) {
        const rg = ctx.createRadialGradient(rb.x, rb.y, 0, rb.x, rb.y, RR + 12)
        rg.addColorStop(0, 'rgba(255,50,50,0.55)'); rg.addColorStop(1, 'rgba(255,0,0,0)')
        ctx.beginPath(); ctx.arc(rb.x, rb.y, RR + 12, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill()
        const rbG = ctx.createRadialGradient(rb.x - 2, rb.y - 2, 0.5, rb.x, rb.y, RR)
        rbG.addColorStop(0, '#ffaaaa'); rbG.addColorStop(1, '#ff2222')
        ctx.beginPath(); ctx.arc(rb.x, rb.y, RR, 0, Math.PI * 2); ctx.fillStyle = rbG; ctx.fill()
      }

      // Drag arrow
      if (drag.on) {
        const dx = drag.cx - drag.ox, dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 8) {
          const nx = dx / d, ny = dy / d, len = Math.min(d * 0.65, 55)
          const ex = ball.x + nx * len, ey = ball.y + ny * len
          ctx.save(); ctx.globalAlpha = 0.9
          ctx.strokeStyle = '#c89b3c'; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
          ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ex, ey); ctx.stroke()
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(ex, ey)
          ctx.lineTo(ex - nx * 9 + -ny * 4, ey - ny * 9 + nx * 4)
          ctx.lineTo(ex - nx * 9 - -ny * 4, ey - ny * 9 - nx * 4)
          ctx.closePath(); ctx.fillStyle = '#c89b3c'; ctx.fill()
          ctx.restore()
        }
      }

      // Blue player ball
      const visible = s.iframes === 0 || Math.floor(s.iframes / 8) % 2 === 0
      if (visible) {
        const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BR + 14)
        bg.addColorStop(0, 'rgba(140,210,255,0.55)'); bg.addColorStop(1, 'rgba(60,120,255,0)')
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BR + 14, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
        const ballG = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x, ball.y, BR)
        ballG.addColorStop(0, '#d4eeff'); ballG.addColorStop(1, '#5ab4ff')
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()
      }

      // Dead overlay
      if (s.phase === 'dead') {
        ctx.fillStyle = 'rgba(7,7,15,0.82)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#ff4444'
        ctx.font = 'bold 16px "Press Start 2P", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', W / 2, H / 2 - 20)
        ctx.fillStyle = 'rgba(200,155,60,0.9)'
        ctx.font = '12px "Press Start 2P", monospace'
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 6)
        ctx.fillStyle = '#7a7060'
        ctx.font = '9px monospace'
        ctx.fillText('tap Restart to play again', W / 2, H / 2 + 28)
        ctx.textAlign = 'left'
      }
    }

    frameRef.current = () => {
      const { ball, drag, stars, enemies } = s
      if (s.phase !== 'play') { draw(); return }
      s.tick++

      // Thrust from drag
      if (drag.on) {
        const dx = drag.cx - drag.ox, dy = drag.cy - drag.oy
        const d = Math.hypot(dx, dy)
        if (d > 6) { const t = Math.min(d / 60, 1) * THRUST; ball.vx += (dx / d) * t; ball.vy += (dy / d) * t }
      }

      // Periodic nudge so ball never fully stops
      if (s.tick % 280 === 0) {
        const a = Math.random() * Math.PI * 2
        ball.vx += Math.cos(a) * 0.9; ball.vy += Math.sin(a) * 0.9
      }

      const spd = Math.hypot(ball.vx, ball.vy)
      if (spd > MAX_SPD) { ball.vx = ball.vx / spd * MAX_SPD; ball.vy = ball.vy / spd * MAX_SPD }

      ball.x += ball.vx; ball.y += ball.vy
      ball.vx *= FRICTION; ball.vy *= FRICTION

      if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx) * 0.88 }
      if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx) * 0.88 }
      if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy) * 0.88 }
      if (ball.y > H - BR) { ball.y = H - BR; ball.vy = -Math.abs(ball.vy) * 0.88 }

      // Enemy movement — slowly accelerate over time
      const speedMult = 1 + s.score * 0.04
      for (const rb of enemies) {
        rb.x += rb.vx; rb.y += rb.vy
        if (rb.x < RR) { rb.x = RR; rb.vx = Math.abs(rb.vx) }
        if (rb.x > W - RR) { rb.x = W - RR; rb.vx = -Math.abs(rb.vx) }
        if (rb.y < RR) { rb.y = RR; rb.vy = Math.abs(rb.vy) }
        if (rb.y > H - RR) { rb.y = H - RR; rb.vy = -Math.abs(rb.vy) }
        // Cap speed
        const rs = Math.hypot(rb.vx, rb.vy)
        const cap = BASE_RB_SPD * Math.min(speedMult, 3.5)
        if (rs > cap) { rb.vx = rb.vx / rs * cap; rb.vy = rb.vy / rs * cap }
      }

      // Add third enemy at score 10
      if (s.score === 10 && enemies.length === 2) {
        const pos = mkEnemy(ball, enemies)
        enemies.push({ x: pos.x, y: pos.y, vx: BASE_RB_SPD * 1.1, vy: -BASE_RB_SPD * 0.9 })
      }

      // Collision
      if (s.iframes === 0) {
        for (const rb of enemies) {
          if (Math.hypot(ball.x - rb.x, ball.y - rb.y) < BR + RR + 1) {
            s.lives--
            setLives(s.lives)
            s.iframes = IFRAME_DUR
            if (s.lives <= 0) {
              s.phase = 'dead'
              setPhase('dead')
              draw()
              return
            }
            break
          }
        }
      }
      if (s.iframes > 0) s.iframes--

      // Collect coins
      let ns = s.score
      for (let i = 0; i < stars.length; i++) {
        if (Math.hypot(ball.x - stars[i].x, ball.y - stars[i].y) < BR + SR + 3) {
          stars[i] = mkStar(ball); ns++
        }
      }
      if (ns !== s.score) { s.score = ns; setScore(ns) }

      draw()
      s.raf = requestAnimationFrame(frameRef.current)
    }

    return () => cancelAnimationFrame(s.raf)
  }, [])

  const restart = useCallback(() => {
    startGame()
  }, [startGame])

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
    if (g.current.phase === 'idle') { startGame(); return }
    e.preventDefault()
    if (g.current.phase !== 'play') return
    const p = xy(e, cvs.current!)
    g.current.drag = { on: true, ox: p.x, oy: p.y, cx: p.x, cy: p.y }
  }
  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!g.current.drag.on) return; e.preventDefault()
    const p = xy(e, cvs.current!)
    g.current.drag.cx = p.x; g.current.drag.cy = p.y
  }
  const onUp = () => { g.current.drag.on = false }

  const cardStyle: React.CSSProperties = {
    background: '#0e0e1a', border: '1px solid #2a2820', borderRadius: 12, padding: '16px 20px',
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>🔵</span>
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#c89b3c' }}>Drag Ball</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a7060', marginTop: 3 }}>
              Drag to steer · dodge 🔴 enemies · collect ⭐ coins
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2820' }}>
        <canvas
          ref={cvs}
          width={W}
          height={H}
          style={{ display: 'block', width: '100%', cursor: phase === 'play' ? 'crosshair' : 'pointer', touchAction: 'none', userSelect: 'none' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div style={overlay} onClick={startGame}>
            <div style={overlayTitle}>DRAG BALL</div>
            <div style={overlayDesc}>
              Drag on the ball to steer it.<br />
              Dodge the red enemies, collect gold coins.<br />
              A 3rd enemy joins at 10 coins!
            </div>
            <button style={bigBtn}>▶ Start</button>
          </div>
        )}

        {/* Dead overlay */}
        {phase === 'dead' && (
          <div style={overlay}>
            <div style={{ ...overlayTitle, color: '#ff4444' }}>GAME OVER</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: '#c89b3c', margin: '8px 0' }}>
              {score}
            </div>
            <div style={overlayDesc}>coins collected</div>
            <button onClick={restart} style={bigBtn}>↺ Try Again</button>
          </div>
        )}
      </div>

      {/* Live stats during play */}
      {phase === 'play' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...cardStyle }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#ff4444' }}>
            {'❤'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives))}
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#c89b3c' }}>
            {score} ⭐
          </div>
        </div>
      )}

      {/* How to play */}
      {phase === 'idle' && (
        <div style={{ ...cardStyle, padding: '12px 16px' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#c89b3c', marginBottom: 8 }}>How to Play</div>
          <ul style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a7060', paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
            <li>Click/drag on the blue ball to thrust it in any direction</li>
            <li>Avoid the bouncing red balls — 3 lives total</li>
            <li>Collect gold coins to increase your score</li>
            <li>A 3rd enemy appears at 10 coins — enemies speed up over time!</li>
          </ul>
        </div>
      )}

      {/* Leaderboard */}
      <GameLeaderboard game="dragball" scoreLabel="coins" refreshKey={refreshKey} />

      <Link href="/skills/fun" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#5a5060', textDecoration: 'none', textAlign: 'center' }}>
        ← Back to Games
      </Link>
    </div>
  )
}

const overlay: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'rgba(7,7,15,0.88)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 10,
  cursor: 'pointer',
}
const overlayTitle: React.CSSProperties = {
  fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: '#c89b3c',
}
const overlayDesc: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#9a9080', textAlign: 'center', lineHeight: 1.7,
}
const bigBtn: React.CSSProperties = {
  marginTop: 6, padding: '10px 28px',
  background: 'linear-gradient(135deg,#c89b3c,#a07428)',
  border: 'none', borderRadius: 8, color: '#07070f',
  fontFamily: "'Press Start 2P', monospace", fontSize: 9,
  cursor: 'pointer',
}
