'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

const W = 400, H = 280
const PAD_W = 8, PAD_H = 55
const BALL_R = 6
const PLR_SPD = 4.5
const CPU_SPD = 3.0
const WIN = 5

export default function PongPage() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle')
  const [sc, setSc] = useState({ p: 0, c: 0 })
  const [result, setResult] = useState<'win' | 'loss'>('win')
  const [xpDone, setXpDone] = useState(false)
  const keys = useRef({ up: false, dn: false })

  const st = useRef({
    ball: { x: W / 2, y: H / 2, vx: 3, vy: 1.5 },
    plr: H / 2 - PAD_H / 2,
    cpu: H / 2 - PAD_H / 2,
    score: { p: 0, c: 0 },
    alive: false, raf: 0,
  })

  const resetBall = (dir: 1 | -1) => {
    const s = st.current
    const rally = s.score.p + s.score.c
    const spd = Math.min(3 + rally * 0.25, 7)
    const ang = (Math.random() * 0.5 - 0.25) * Math.PI
    s.ball = { x: W / 2, y: H / 2, vx: dir * spd * Math.cos(ang), vy: spd * Math.sin(ang) }
  }

  const render = useCallback(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { ball, plr, cpu, score } = st.current

    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(42,40,32,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([8, 8])
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = 'rgba(200,155,60,0.35)'
    ctx.font = 'bold 26px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(score.p), W / 4, 36)
    ctx.fillText(String(score.c), (3 * W) / 4, 36)
    ctx.textAlign = 'left'

    const pg = (x: number) => {
      const g = ctx.createLinearGradient(x, 0, x + PAD_W, 0)
      g.addColorStop(0, '#7a5820'); g.addColorStop(1, '#c89b3c')
      return g
    }
    ctx.fillStyle = pg(4)
    ctx.fillRect(4, plr, PAD_W, PAD_H)
    ctx.fillStyle = pg(W - PAD_W - 4)
    ctx.fillRect(W - PAD_W - 4, cpu, PAD_W, PAD_H)

    const bg = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R + 9)
    bg.addColorStop(0, 'rgba(140,210,255,0.5)'); bg.addColorStop(1, 'rgba(60,120,255,0)')
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R + 9, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
    const ballG = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0.5, ball.x, ball.y, BALL_R)
    ballG.addColorStop(0, '#d4eeff'); ballG.addColorStop(1, '#5ab4ff')
    ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fillStyle = ballG; ctx.fill()
  }, [])

  const loop = useCallback(() => {
    const s = st.current; if (!s.alive) return
    const { ball } = s

    if (keys.current.up) s.plr = Math.max(0, s.plr - PLR_SPD)
    if (keys.current.dn) s.plr = Math.min(H - PAD_H, s.plr + PLR_SPD)

    // CPU tracks ball (slight lag for fairness)
    const cpuC = s.cpu + PAD_H / 2
    if (ball.vx > 0) {
      if (cpuC < ball.y - 6) s.cpu = Math.min(H - PAD_H, s.cpu + CPU_SPD)
      else if (cpuC > ball.y + 6) s.cpu = Math.max(0, s.cpu - CPU_SPD)
    }

    ball.x += ball.vx; ball.y += ball.vy

    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) }
    if (ball.y + BALL_R > H) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy) }

    // Player paddle
    if (ball.x - BALL_R <= 4 + PAD_W && ball.y >= s.plr && ball.y <= s.plr + PAD_H && ball.vx < 0) {
      const hit = (ball.y - (s.plr + PAD_H / 2)) / (PAD_H / 2)
      const spd = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 10)
      ball.vx = Math.abs(ball.vx) * 1.06; ball.vy = hit * spd * 0.85
      ball.x = 4 + PAD_W + BALL_R
    }
    // CPU paddle
    if (ball.x + BALL_R >= W - PAD_W - 4 && ball.y >= s.cpu && ball.y <= s.cpu + PAD_H && ball.vx > 0) {
      const hit = (ball.y - (s.cpu + PAD_H / 2)) / (PAD_H / 2)
      const spd = Math.min(Math.hypot(ball.vx, ball.vy) * 1.06, 10)
      ball.vx = -Math.abs(ball.vx) * 1.06; ball.vy = hit * spd * 0.85
      ball.x = W - PAD_W - 4 - BALL_R
    }

    if (ball.x < -20) {
      s.score.c++; setSc({ ...s.score })
      if (s.score.c >= WIN) { s.alive = false; setResult('loss'); setPhase('done'); return }
      resetBall(-1)
    }
    if (ball.x > W + 20) {
      s.score.p++; setSc({ ...s.score })
      if (s.score.p >= WIN) { s.alive = false; setResult('win'); setPhase('done'); return }
      resetBall(1)
    }

    render()
    s.raf = requestAnimationFrame(loop)
  }, [render])

  const startGame = useCallback(() => {
    const s = st.current
    cancelAnimationFrame(s.raf)
    s.plr = H / 2 - PAD_H / 2; s.cpu = H / 2 - PAD_H / 2
    s.score = { p: 0, c: 0 }; s.alive = true
    s.ball = { x: W / 2, y: H / 2, vx: 3, vy: 1.5 }
    setSc({ p: 0, c: 0 }); setPhase('play'); setXpDone(false)
    render()
    s.raf = requestAnimationFrame(loop)
  }, [render, loop])

  useEffect(() => { render() }, [render])
  useEffect(() => () => cancelAnimationFrame(st.current.raf), [])

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { keys.current.up = true; e.preventDefault() }
      if (['ArrowDown', 's', 'S'].includes(e.key)) { keys.current.dn = true; e.preventDefault() }
    }
    const up = (e: KeyboardEvent) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) keys.current.up = false
      if (['ArrowDown', 's', 'S'].includes(e.key)) keys.current.dn = false
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  const onTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = cvs.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const y = (e.touches[0].clientY - rect.top) * (H / rect.height) - PAD_H / 2
    st.current.plr = Math.max(0, Math.min(H - PAD_H, y))
  }

  const claimXp = async () => {
    await fetch('/api/minigame/win', { method: 'POST' }).catch(() => {})
    setXpDone(true)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rp-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏓</span>
          <h1 className="text-[11px]" style={{ color: 'var(--text-1)' }}>Pong</h1>
          <span className="ml-auto text-[7px]" style={{ color: 'var(--gold)' }}>You {sc.p} · {sc.c} CPU</span>
        </div>

        <div className="relative">
          <canvas ref={cvs} width={W} height={H}
            className="w-full rounded-lg block"
            style={{ border: '1px solid var(--border)' }}
            onTouchMove={onTouch}
          />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              <div className="text-4xl mb-4">🏓</div>
              <button onClick={startGame} className="osrs-btn text-[8px] px-8 py-2">▶ Play Pong</button>
              <p className="mt-3 text-[6px]" style={{ color: 'var(--text-3)' }}>W/S or ↑↓ to move · First to {WIN} wins</p>
            </div>
          )}
          {phase === 'done' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              {result === 'win'
                ? <p className="text-[11px] mb-2" style={{ color: 'var(--gold)' }}>🏆 You Win!</p>
                : <p className="text-[11px] mb-2" style={{ color: '#ff6060' }}>💀 CPU Wins</p>}
              {result === 'win' && !xpDone && (
                <button onClick={claimXp} className="osrs-btn text-[8px] px-6 py-2 mb-2">Claim +25 Fun XP</button>
              )}
              {xpDone && <p className="text-[7px] mb-2" style={{ color: 'var(--gold)' }}>✓ +25 XP earned!</p>}
              <button onClick={startGame} className="mt-1 text-[7px] hover:opacity-70" style={{ color: 'var(--text-3)' }}>↺ Play Again</button>
            </div>
          )}
        </div>

        {phase === 'play' && (
          <p className="mt-2 text-center text-[6px]" style={{ color: 'var(--text-3)' }}>W/S or ↑↓ to move · First to {WIN} wins</p>
        )}
      </div>

      <div className="text-center">
        <Link href="/skills/fun" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>← Back to Fun Zone</Link>
      </div>
    </div>
  )
}
