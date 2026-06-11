'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'

const W = 400
const H = 320
const BALL_R   = 9
const PAD_W    = 80
const PAD_H    = 10
const PAD_Y    = H - 22
const BASE_SPD = 3.8
const MAX_SPD  = 11

type Phase = 'idle' | 'play' | 'dead'

interface State {
  ball: { x: number; y: number; vx: number; vy: number }
  pad:  number   // left edge
  lives: number
  score: number
  raf:   number
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

export default function BallGamePage() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase]     = useState<Phase>('idle')
  const [score, setScore]     = useState(0)
  const [lives, setLives]     = useState(3)
  const [refreshKey, setRefreshKey] = useState(0)
  const submitted = useRef(false)
  const touchX    = useRef<number | null>(null)

  const st = useRef<State>({
    ball:  { x: W / 2, y: H / 2, vx: BASE_SPD, vy: BASE_SPD },
    pad:   W / 2 - PAD_W / 2,
    lives: 3,
    score: 0,
    raf:   0,
  })

  // ── submit score when dead ──
  useEffect(() => {
    if (phase !== 'dead' || submitted.current || st.current.score === 0) return
    submitted.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'ballgame', score: st.current.score }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  const draw = useCallback(() => {
    const canvas = cvs.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { ball, pad, lives: l, score: sc } = st.current

    // Background
    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    // Paddle
    const speed = Math.hypot(ball.vx, ball.vy)
    const t = Math.min(1, (speed - BASE_SPD) / (MAX_SPD - BASE_SPD))
    const padColor = `hsl(${45 - t * 45},${80 + t * 20}%,${55 + t * 10}%)`
    ctx.fillStyle = padColor
    ctx.shadowColor = padColor
    ctx.shadowBlur  = 12
    ctx.beginPath()
    ctx.roundRect(pad, PAD_Y, PAD_W, PAD_H, 5)
    ctx.fill()
    ctx.shadowBlur = 0

    // Ball
    const ballColor = `hsl(${45 - t * 45},100%,65%)`
    ctx.fillStyle = ballColor
    ctx.shadowColor = ballColor
    ctx.shadowBlur  = 18
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Lives
    for (let i = 0; i < l; i++) {
      ctx.fillStyle = '#e63946'
      ctx.shadowColor = '#e63946'; ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(12 + i * 20, 12, 6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    // Score
    ctx.fillStyle = '#c89b3c'
    ctx.font = '700 14px "Press Start 2P", monospace'
    ctx.textAlign = 'right'
    ctx.fillText(String(sc), W - 10, 18)
    ctx.textAlign = 'left'
  }, [])

  const tick = useCallback(() => {
    const s = st.current
    const { ball, pad } = s

    // Move ball
    ball.x += ball.vx
    ball.y += ball.vy

    // Wall bounces (left / right / top)
    if (ball.x - BALL_R < 0)  { ball.x = BALL_R;      ball.vx = Math.abs(ball.vx) }
    if (ball.x + BALL_R > W)  { ball.x = W - BALL_R;  ball.vx = -Math.abs(ball.vx) }
    if (ball.y - BALL_R < 0)  { ball.y = BALL_R;      ball.vy = Math.abs(ball.vy) }

    // Paddle collision
    const hitX = ball.x >= pad && ball.x <= pad + PAD_W
    const hitY = ball.y + BALL_R >= PAD_Y && ball.y + BALL_R <= PAD_Y + PAD_H + Math.abs(ball.vy)
    if (hitX && hitY && ball.vy > 0) {
      ball.vy = -Math.abs(ball.vy)
      ball.y  = PAD_Y - BALL_R

      // Angle based on hit position
      const rel   = (ball.x - (pad + PAD_W / 2)) / (PAD_W / 2)  // -1 to 1
      const speed = Math.hypot(ball.vx, ball.vy)
      const angle = (rel * 60 * Math.PI) / 180  // ±60°
      ball.vx = Math.sin(angle) * speed
      ball.vy = -Math.cos(angle) * speed

      // Speed up every 5 bounces
      s.score++
      setScore(s.score)
      const newSpd = Math.min(MAX_SPD, BASE_SPD + s.score * 0.18)
      const dir = Math.hypot(ball.vx, ball.vy)
      ball.vx = (ball.vx / dir) * newSpd
      ball.vy = (ball.vy / dir) * newSpd
    }

    // Ball missed (falls below paddle)
    if (ball.y - BALL_R > H) {
      s.lives--
      setLives(s.lives)
      if (s.lives <= 0) {
        cancelAnimationFrame(s.raf)
        setPhase('dead')
        return
      }
      // Reset ball
      ball.x  = W / 2
      ball.y  = H / 2
      const angle = (Math.random() * 60 - 30) * Math.PI / 180
      const spd   = BASE_SPD + s.score * 0.1
      ball.vx = Math.sin(angle) * spd
      ball.vy = Math.cos(angle) * spd
    }

    draw()
    s.raf = requestAnimationFrame(tick)
  }, [draw])

  function startGame() {
    const s = st.current
    cancelAnimationFrame(s.raf)
    s.ball  = { x: W / 2, y: H / 2, vx: BASE_SPD * 0.7, vy: -BASE_SPD }
    s.pad   = W / 2 - PAD_W / 2
    s.lives = 3
    s.score = 0
    submitted.current = false
    setScore(0)
    setLives(3)
    setPhase('play')
    s.raf = requestAnimationFrame(tick)
  }

  // ── Mouse / touch input ──
  useEffect(() => {
    if (phase !== 'play') return
    const canvas = cvs.current
    if (!canvas) return

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      const scaleX = W / rect.width
      const mx = (e.clientX - rect.left) * scaleX
      st.current.pad = clamp(mx - PAD_W / 2, 0, W - PAD_W)
    }
    function onTouchMove(e: TouchEvent) {
      e.preventDefault()
      const t = e.touches[0]
      const rect = canvas!.getBoundingClientRect()
      const scaleX = W / rect.width
      const mx = (t.clientX - rect.left) * scaleX
      touchX.current = mx
      st.current.pad = clamp(mx - PAD_W / 2, 0, W - PAD_W)
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
    }
  }, [phase])

  // ── Cleanup ──
  useEffect(() => () => cancelAnimationFrame(st.current.raf), [])

  const cardStyle: React.CSSProperties = {
    background: '#0e0e1a', border: '1px solid #2a2820', borderRadius: 12, padding: '16px 20px',
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 28 }}>⚽</span>
          <div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#c89b3c' }}>Ball Game</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a7060', marginTop: 3 }}>
              Keep the ball alive — 3 lives · speed increases every bounce
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
          style={{ display: 'block', width: '100%', cursor: phase === 'play' ? 'none' : 'default', touchAction: 'none' }}
        />

        {/* Idle overlay */}
        {phase === 'idle' && (
          <div style={overlay}>
            <div style={overlayTitle}>BALL GAME</div>
            <div style={overlayDesc}>Move your paddle to keep the ball alive.<br />Speed increases with every bounce.</div>
            <button onClick={startGame} style={bigBtn}>▶ Start</button>
          </div>
        )}

        {/* Dead overlay */}
        {phase === 'dead' && (
          <div style={overlay}>
            <div style={{ ...overlayTitle, color: '#e63946' }}>GAME OVER</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: '#c89b3c', margin: '8px 0' }}>
              {score}
            </div>
            <div style={overlayDesc}>bounces</div>
            <button onClick={startGame} style={bigBtn}>↺ Try Again</button>
          </div>
        )}
      </div>

      {/* Live stats */}
      {phase === 'play' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', ...cardStyle }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#e63946' }}>
            {'❤'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives))}
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#c89b3c' }}>
            {score} bounces
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <GameLeaderboard game="ballgame" scoreLabel="bounces" refreshKey={refreshKey} />

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
}
const overlayTitle: React.CSSProperties = {
  fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#c89b3c',
}
const overlayDesc: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#9a9080', textAlign: 'center',
}
const bigBtn: React.CSSProperties = {
  marginTop: 6, padding: '10px 28px',
  background: 'linear-gradient(135deg,#c89b3c,#a07428)',
  border: 'none', borderRadius: 8, color: '#07070f',
  fontFamily: "'Press Start 2P', monospace", fontSize: 9,
  cursor: 'pointer',
}
