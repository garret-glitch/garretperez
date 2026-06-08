'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const GAME_TIME = 30
const WIN_SCORE = 10
const SPAWN_MS = 680
const VISIBLE_MS = 900

export default function WhackAMolePage() {
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle')
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false))
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [xpDone, setXpDone] = useState(false)

  const running = useRef(false)
  const scoreRef = useRef(0)
  const spawnTimer = useRef<ReturnType<typeof setInterval>>()
  const countdown = useRef<ReturnType<typeof setInterval>>()

  const stop = useCallback(() => {
    running.current = false
    clearInterval(spawnTimer.current)
    clearInterval(countdown.current)
    setMoles(Array(9).fill(false))
  }, [])

  useEffect(() => stop, [stop])

  const start = useCallback(() => {
    stop()
    scoreRef.current = 0
    running.current = true
    setScore(0); setTimeLeft(GAME_TIME); setMoles(Array(9).fill(false)); setPhase('play'); setXpDone(false)

    spawnTimer.current = setInterval(() => {
      if (!running.current) return
      const idx = Math.floor(Math.random() * 9)
      setMoles(prev => { const n = [...prev]; n[idx] = true; return n })
      setTimeout(() => {
        if (!running.current) return
        setMoles(prev => { const n = [...prev]; n[idx] = false; return n })
      }, VISIBLE_MS)
    }, SPAWN_MS)

    countdown.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1
        if (next <= 0) { stop(); setPhase('done'); return 0 }
        return next
      })
    }, 1000)
  }, [stop])

  const whack = (idx: number) => {
    if (!running.current) return
    setMoles(prev => {
      if (!prev[idx]) return prev
      const n = [...prev]; n[idx] = false
      scoreRef.current++; setScore(scoreRef.current)
      return n
    })
  }

  const claimXp = async () => {
    await fetch('/api/minigame/win', { method: 'POST' }).catch(() => {})
    setXpDone(true)
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="rp-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🦔</span>
          <h1 className="text-[11px]" style={{ color: 'var(--text-1)' }}>Whack-a-Mole</h1>
          <span className="ml-auto text-[7px]" style={{ color: 'var(--gold)' }}>⭐ {score} · ⏱ {timeLeft}s</span>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl"
          style={{ background: 'var(--bg-page)', border: '1px solid var(--border)' }}>
          {moles.map((up, i) => (
            <button
              key={i}
              onClick={() => whack(i)}
              className="aspect-square rounded-xl flex items-center justify-center text-3xl select-none"
              style={{
                background: up ? 'rgba(200,155,60,0.15)' : 'var(--bg-elevated)',
                border: `1px solid ${up ? 'var(--gold)' : 'var(--border)'}`,
                transform: up ? 'scale(1.08)' : 'scale(0.97)',
                boxShadow: up ? '0 0 14px rgba(200,155,60,0.3)' : 'none',
                cursor: up ? 'pointer' : 'default',
                transition: 'all 0.12s',
              }}
            >
              {up ? '🦔' : <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a1a28', border: '1px solid #2a2820', display: 'block' }} />}
            </button>
          ))}
        </div>

        <div className="mt-4 text-center">
          {phase === 'idle' && (
            <>
              <button onClick={start} className="osrs-btn text-[8px] px-8 py-2">▶ Start Game</button>
              <p className="mt-2 text-[6px]" style={{ color: 'var(--text-3)' }}>
                Click the moles before they hide · Score {WIN_SCORE}+ to win · {GAME_TIME}s timer
              </p>
            </>
          )}
          {phase === 'done' && (
            <div>
              {score >= WIN_SCORE
                ? <p className="text-[10px] mb-2" style={{ color: 'var(--gold)' }}>🏆 You Win! ({score} whacks)</p>
                : <p className="text-[10px] mb-2" style={{ color: 'var(--text-2)' }}>Time&apos;s up! {score}/{WIN_SCORE} whacks</p>
              }
              {score >= WIN_SCORE && !xpDone && (
                <button onClick={claimXp} className="osrs-btn text-[8px] px-6 py-2 mb-2 block mx-auto">
                  Claim +25 Fun XP
                </button>
              )}
              {xpDone && <p className="text-[7px] mb-2" style={{ color: 'var(--gold)' }}>✓ +25 XP earned!</p>}
              <button onClick={start} className="text-[7px] hover:opacity-70 mt-1" style={{ color: 'var(--text-3)' }}>
                ↺ Play Again
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="text-center">
        <Link href="/skills/fun" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>
          ← Back to Fun Zone
        </Link>
      </div>
    </div>
  )
}
