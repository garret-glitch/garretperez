'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'
import GodModeToggle, { useGodMode } from '@/components/GodModeToggle'

const W = 400, H = 280
const BCOLS = 8, BROWS = 4
const BPAD_X = 10, BTOP = 32, BGAP = 4
const BW = (W - 2 * BPAD_X - (BCOLS - 1) * BGAP) / BCOLS
const BH = 14
const PAD_W = 72, PAD_H = 8
const BALL_R = 6
const ROW_COLORS = ['#c89b3c', '#a07830', '#7a5824', '#5a4018']

type Brick = { x: number; y: number; alive: boolean; color: string }

function mkBricks(): Brick[] {
  const out: Brick[] = []
  for (let r = 0; r < BROWS; r++)
    for (let c = 0; c < BCOLS; c++)
      out.push({ x: BPAD_X + c * (BW + BGAP), y: BTOP + r * (BH + BGAP), alive: true, color: ROW_COLORS[r] })
  return out
}

export default function BreakoutPage() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'idle' | 'play' | 'dead' | 'win'>('idle')
  const [lives, setLives] = useState(3)
  const [score, setScore] = useState(0)
  const [xpDone, setXpDone] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const hasSubmittedScore = useRef(false)
  const { on: godOn } = useGodMode()
  const godRef = useRef(false)
  useEffect(() => { godRef.current = godOn }, [godOn])

  const st = useRef({
    bricks: mkBricks(),
    ball: { x: W / 2, y: H - 60, vx: 2.5, vy: -2.5 },
    pad: W / 2 - PAD_W / 2,
    lives: 3, score: 0,
    alive: false, raf: 0,
  })

  useEffect(() => {
    if (phase !== 'win' || hasSubmittedScore.current) return
    hasSubmittedScore.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'breakout', score: BCOLS * BROWS }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  const render = useCallback(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { bricks, ball, pad } = st.current

    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(42,40,32,0.22)'
    ctx.lineWidth = 0.5
    for (let x = 20; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 20; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    for (const b of bricks) {
      if (!b.alive) continue
      ctx.fillStyle = b.color
      ctx.fillRect(b.x, b.y, BW, BH)
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(b.x + 2, b.y + 2, BW - 4, 4)
    }

    const pg = ctx.createLinearGradient(pad, 0, pad + PAD_W, 0)
    pg.addColorStop(0, '#8a6820'); pg.addColorStop(0.5, '#c89b3c'); pg.addColorStop(1, '#8a6820')
    ctx.fillStyle = pg
    ctx.fillRect(pad, H - PAD_H - 4, PAD_W, PAD_H)

    const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R + 8)
    bg.addColorStop(0, 'rgba(140,210,255,0.5)'); bg.addColorStop(1, 'rgba(60,120,255,0)')
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R + 8, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
    const ballG = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x, ball.y, BALL_R)
    ballG.addColorStop(0, '#d4eeff'); ballG.addColorStop(1, '#5ab4ff')
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()
  }, [])

  const loop = useCallback(() => {
    const s = st.current; if (!s.alive) return
    const { ball, bricks } = s

    ball.x += ball.vx; ball.y += ball.vy

    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) }
    if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) }
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) }

    // Paddle hit
    if (ball.y + BALL_R >= H - PAD_H - 4 &&
      ball.y + BALL_R <= H - 2 &&
      ball.x >= s.pad - BALL_R &&
      ball.x <= s.pad + PAD_W + BALL_R) {
      const hit = (ball.x - (s.pad + PAD_W / 2)) / (PAD_W / 2)
      ball.vy = -Math.abs(ball.vy)
      ball.vx = hit * 4
      const spd = Math.hypot(ball.vx, ball.vy)
      if (spd > 7) { ball.vx = ball.vx / spd * 7; ball.vy = ball.vy / spd * 7 }
    }

    // Lost ball
    if (ball.y > H + 20) {
      if (!godRef.current) { // God Mode keeps all lives
        s.lives--; setLives(s.lives)
        if (s.lives <= 0) { s.alive = false; setPhase('dead'); return }
      }
      ball.x = s.pad + PAD_W / 2; ball.y = H - 60
      ball.vx = 2.5 * (Math.random() > 0.5 ? 1 : -1); ball.vy = -2.5
    }

    // Brick collision
    for (const b of bricks) {
      if (!b.alive) continue
      if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + BW &&
        ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BH) {
        b.alive = false; s.score++; setScore(s.score)
        const ol = ball.x + BALL_R - b.x, or2 = b.x + BW - (ball.x - BALL_R)
        const ot = ball.y + BALL_R - b.y, ob = b.y + BH - (ball.y - BALL_R)
        if (Math.min(ol, or2) < Math.min(ot, ob)) ball.vx = -ball.vx; else ball.vy = -ball.vy
        break
      }
    }

    if (bricks.every(b => !b.alive)) { s.alive = false; setPhase('win'); return }

    render()
    s.raf = requestAnimationFrame(loop)
  }, [render])

  const start = useCallback(() => {
    const s = st.current
    cancelAnimationFrame(s.raf)
    s.bricks = mkBricks()
    s.ball = { x: W / 2, y: H - 60, vx: 2.5, vy: -2.5 }
    s.pad = W / 2 - PAD_W / 2
    s.lives = 3; s.score = 0; s.alive = true
    setLives(3); setScore(0); setPhase('play'); setXpDone(false)
    hasSubmittedScore.current = false
    render()
    s.raf = requestAnimationFrame(loop)
  }, [render, loop])

  useEffect(() => { render() }, [render])
  useEffect(() => () => cancelAnimationFrame(st.current.raf), [])

  const movePad = useCallback((clientX: number) => {
    const canvas = cvs.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    st.current.pad = Math.max(0, Math.min(W - PAD_W, (clientX - rect.left) * (W / rect.width) - PAD_W / 2))
  }, [])

  const claimXp = async () => {
    await fetch('/api/minigame/win', { method: 'POST' }).catch(() => {})
    setXpDone(true)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rp-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧱</span>
          <h1 className="text-[11px]" style={{ color: 'var(--text-1)' }}>Breakout</h1>
          <span className="ml-auto text-[7px]" style={{ color: 'var(--gold)' }}>Score: {score} · ❤️ {lives}</span>
        </div>
        <div className="flex justify-end mb-2"><GodModeToggle /></div>

        <div className="relative">
          <canvas ref={cvs} width={W} height={H}
            className="w-full rounded-lg block cursor-none"
            style={{ border: '1px solid var(--border)' }}
            onMouseMove={e => movePad(e.clientX)}
            onTouchMove={e => { e.preventDefault(); movePad(e.touches[0].clientX) }}
          />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              <div className="text-4xl mb-4">🧱</div>
              <button onClick={start} className="osrs-btn text-[8px] px-8 py-2">▶ Play Breakout</button>
              <p className="mt-3 text-[6px]" style={{ color: 'var(--text-3)' }}>Move mouse / swipe to control paddle · 3 lives</p>
            </div>
          )}
          {phase === 'dead' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              <p className="text-[11px] mb-1" style={{ color: '#ff6060' }}>💀 Game Over</p>
              <p className="text-[7px] mb-4" style={{ color: 'var(--text-2)' }}>Score: {score}</p>
              <button onClick={start} className="osrs-btn text-[8px] px-6 py-2">↺ Try Again</button>
            </div>
          )}
          {phase === 'win' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              <p className="text-[11px] mb-1" style={{ color: 'var(--gold)' }}>🏆 Cleared!</p>
              <p className="text-[7px] mb-3" style={{ color: 'var(--text-2)' }}>All {BCOLS * BROWS} bricks destroyed</p>
              {!xpDone
                ? <button onClick={claimXp} className="osrs-btn text-[8px] px-6 py-2">Claim +25 Fun XP</button>
                : <p className="text-[7px]" style={{ color: 'var(--gold)' }}>✓ +25 XP earned!</p>}
              <button onClick={start} className="mt-3 text-[6px] hover:opacity-70" style={{ color: 'var(--text-3)' }}>Play again</button>
            </div>
          )}
        </div>

        {phase === 'play' && (
          <p className="mt-2 text-center text-[6px]" style={{ color: 'var(--text-3)' }}>Move mouse or swipe to control the paddle</p>
        )}
      </div>

      <GameLeaderboard game="breakout" scoreLabel="bricks" refreshKey={refreshKey} />

      <div className="text-center">
        <Link href="/skills/fun" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>← Back to Fun Zone</Link>
      </div>
    </div>
  )
}
