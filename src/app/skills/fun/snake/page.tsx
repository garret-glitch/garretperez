'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'
import GodModeToggle, { useGodMode } from '@/components/GodModeToggle'

const CELL = 16
const COLS = 24
const ROWS = 16
const W = COLS * CELL
const H = ROWS * CELL
const TICK = 130

type Pt = { x: number; y: number }
type Dir = 'U' | 'D' | 'L' | 'R'

const OPP: Record<Dir, Dir> = { U: 'D', D: 'U', L: 'R', R: 'L' }
const DX: Record<Dir, number> = { U: 0, D: 0, L: -1, R: 1 }
const DY: Record<Dir, number> = { U: -1, D: 1, L: 0, R: 0 }

function rndFood(snake: Pt[]): Pt {
  let p: Pt
  do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
  while (snake.some(s => s.x === p.x && s.y === p.y))
  return p
}

export default function SnakePage() {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'idle' | 'play' | 'dead' | 'win'>('idle')
  const [score, setScore] = useState(0)
  const [xpDone, setXpDone] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const hasSubmittedScore = useRef(false)
  const { on: godOn } = useGodMode()
  const godRef = useRef(false)
  useEffect(() => { godRef.current = godOn }, [godOn])
  const st = useRef({
    snake: [] as Pt[],
    dir: 'R' as Dir,
    nextDir: 'R' as Dir,
    food: { x: 18, y: 8 } as Pt,
    score: 0,
    alive: false,
    timer: null as ReturnType<typeof setTimeout> | null,
  })

  useEffect(() => {
    if (phase !== 'win' || hasSubmittedScore.current) return
    hasSubmittedScore.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'snake', score: 10 }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  const render = useCallback(() => {
    const canvas = cvs.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const { snake, food } = st.current

    ctx.fillStyle = '#07070f'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = 'rgba(42,40,32,0.28)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    if (food) {
      const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, CELL)
      fg.addColorStop(0, 'rgba(200,155,60,0.45)'); fg.addColorStop(1, 'rgba(200,155,60,0)')
      ctx.beginPath(); ctx.arc(fx, fy, CELL, 0, Math.PI * 2); ctx.fillStyle = fg; ctx.fill()
      ctx.fillStyle = '#c89b3c'
      ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6)
      ctx.fillStyle = '#ffd966'
      ctx.fillRect(food.x * CELL + 5, food.y * CELL + 5, 3, 3)
    }

    snake.forEach((seg, i) => {
      const t = 1 - i / Math.max(snake.length, 1)
      ctx.fillStyle = i === 0 ? '#a0d4ff' : `hsl(${200 + t * 20},${55 + t * 30}%,${32 + t * 28}%)`
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
    })

    if (snake[0]) {
      const hx = snake[0].x * CELL + CELL / 2, hy = snake[0].y * CELL + CELL / 2
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, CELL * 1.3)
      hg.addColorStop(0, 'rgba(140,210,255,0.3)'); hg.addColorStop(1, 'rgba(60,120,255,0)')
      ctx.beginPath(); ctx.arc(hx, hy, CELL * 1.3, 0, Math.PI * 2); ctx.fillStyle = hg; ctx.fill()
    }
  }, [])

  const step = useCallback(() => {
    const s = st.current; if (!s.alive) return
    s.dir = s.nextDir
    const head = s.snake[0]
    const next = { x: head.x + DX[s.dir], y: head.y + DY[s.dir] }

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS ||
      s.snake.slice(1).some(p => p.x === next.x && p.y === next.y)) {
      if (godRef.current) {
        // God Mode — wrap through walls and slither harmlessly through yourself
        next.x = (next.x + COLS) % COLS; next.y = (next.y + ROWS) % ROWS
      } else {
        s.alive = false; setPhase('dead'); render(); return
      }
    }

    const ate = next.x === s.food.x && next.y === s.food.y
    s.snake = [next, ...s.snake]
    if (!ate) s.snake.pop()
    else {
      s.score++; setScore(s.score)
      if (s.score >= 10) { s.alive = false; render(); setPhase('win'); return }
      s.food = rndFood(s.snake)
    }

    render()
    s.timer = setTimeout(step, TICK)
  }, [render])

  const start = useCallback(() => {
    const s = st.current
    if (s.timer) clearTimeout(s.timer)
    s.snake = [{ x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 }]
    s.dir = s.nextDir = 'R'
    s.food = rndFood(s.snake)
    s.score = 0; s.alive = true
    setScore(0); setPhase('play'); setXpDone(false)
    hasSubmittedScore.current = false
    render()
    s.timer = setTimeout(step, TICK)
  }, [render, step])

  useEffect(() => { render() }, [render])
  useEffect(() => () => { const t = st.current.timer; if (t) clearTimeout(t) }, [])

  function changeDir(nd: Dir) {
    const s = st.current; if (!s.alive || nd === OPP[s.dir]) return
    s.nextDir = nd
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = st.current; if (!s.alive) return
      const map: Record<string, Dir> = {
        ArrowUp: 'U', w: 'U', W: 'U',
        ArrowDown: 'D', s: 'D', S: 'D',
        ArrowLeft: 'L', a: 'L', A: 'L',
        ArrowRight: 'R', d: 'R', D: 'R',
      }
      const nd = map[e.key]; if (!nd || nd === OPP[s.dir]) return
      s.nextDir = nd; e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const claimXp = async () => {
    await fetch('/api/minigame/win', { method: 'POST' }).catch(() => {})
    setXpDone(true)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="rp-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🐍</span>
          <h1 className="text-[11px]" style={{ color: 'var(--text-1)' }}>Snake</h1>
          <span className="ml-auto text-[7px]" style={{ color: 'var(--gold)' }}>⭐ {score} / 10</span>
        </div>
        <div className="flex justify-end mb-2"><GodModeToggle /></div>

        <div className="relative">
          <canvas ref={cvs} width={W} height={H}
            className="w-full rounded-lg block"
            style={{ border: '1px solid var(--border)' }}
          />
          {phase === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg"
              style={{ background: 'rgba(7,7,15,0.88)' }}>
              <div className="text-4xl mb-4">🐍</div>
              <button onClick={start} className="osrs-btn text-[8px] px-8 py-2">▶ Play Snake</button>
              <p className="mt-3 text-[6px] hidden sm:block" style={{ color: 'var(--text-3)' }}>WASD or Arrow Keys · Collect 10 coins to win</p>
              <p className="mt-3 text-[6px] sm:hidden" style={{ color: 'var(--text-3)' }}>Use the D-pad · Collect 10 coins to win</p>
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
              <p className="text-[11px] mb-1" style={{ color: 'var(--gold)' }}>🏆 You Win!</p>
              <p className="text-[7px] mb-3" style={{ color: 'var(--text-2)' }}>10/10 coins collected</p>
              {!xpDone
                ? <button onClick={claimXp} className="osrs-btn text-[8px] px-6 py-2">Claim +25 Fun XP</button>
                : <p className="text-[7px]" style={{ color: 'var(--gold)' }}>✓ +25 XP earned!</p>}
              <button onClick={start} className="mt-3 text-[6px] hover:opacity-70" style={{ color: 'var(--text-3)' }}>Play again</button>
            </div>
          )}
        </div>

        {phase === 'play' && (
          <p className="mt-2 text-center text-[6px] hidden sm:block" style={{ color: 'var(--text-3)' }}>WASD or Arrow Keys to steer</p>
        )}

        {/* Mobile D-pad — only shown on small screens */}
        {(phase === 'play' || phase === 'idle') && (
          <div className="sm:hidden mt-4 flex flex-col items-center gap-1" style={{ userSelect: 'none' }}>
            <button onPointerDown={() => changeDir('U')}
              className="w-14 h-14 text-xl rounded border-2 flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--gold)', fontSize: 22 }}>↑</button>
            <div className="flex gap-1">
              <button onPointerDown={() => changeDir('L')}
                className="w-14 h-14 text-xl rounded border-2 flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--gold)', fontSize: 22 }}>←</button>
              <div className="w-14 h-14 rounded" style={{ background: 'var(--bg-elevated)', opacity: 0.3 }} />
              <button onPointerDown={() => changeDir('R')}
                className="w-14 h-14 text-xl rounded border-2 flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--gold)', fontSize: 22 }}>→</button>
            </div>
            <button onPointerDown={() => changeDir('D')}
              className="w-14 h-14 text-xl rounded border-2 flex items-center justify-center"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--gold)', fontSize: 22 }}>↓</button>
          </div>
        )}
      </div>

      <GameLeaderboard game="snake" scoreLabel="coins" refreshKey={refreshKey} />

      <div className="text-center">
        <Link href="/skills/fun" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>← Back to Fun Zone</Link>
      </div>
    </div>
  )
}
