'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import GameLeaderboard from '@/components/GameLeaderboard'

const GAME_TIME = 30
const WIN_SCORE = 10
const SPAWN_MS = 680
const VISIBLE_MS = 900

/* ---------------------------------------------------------------------------
   Audio engine — fully synthesized via Web Audio (no asset files).
   Bouncy carnival music loop + satisfying SFX, routed through a master gain
   so a single toggle mutes everything. Unlocks on first user gesture.
--------------------------------------------------------------------------- */
const Audio = (() => {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let music: GainNode | null = null
  let sfx: GainNode | null = null
  let on = true
  let loop: ReturnType<typeof setInterval> | null = null
  let step = 0

  const ensure = () => {
    if (typeof window === 'undefined') return null
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = on ? 0.85 : 0; master.connect(ctx.destination)
      music = ctx.createGain(); music.gain.value = 0.0; music.connect(master)
      sfx = ctx.createGain(); sfx.gain.value = 1.0; sfx.connect(master)
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  }

  const tone = (freq: number, dur: number, type: OscillatorType, dest: GainNode, vol: number, when = 0) => {
    if (!ctx) return
    const t = ctx.currentTime + when
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(dest)
    o.start(t); o.stop(t + dur + 0.02)
  }

  const noise = (dur: number, dest: GainNode, vol: number, hp = 0, when = 0) => {
    if (!ctx) return
    const t = ctx.currentTime + when
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = ctx.createBufferSource(); src.buffer = buf
    const g = ctx.createGain(); g.gain.value = vol
    let node: AudioNode = src
    if (hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; src.connect(f); node = f }
    node.connect(g); g.connect(dest)
    src.start(t); src.stop(t + dur)
  }

  // Catchy 16-step major-key loop (E/C major, playful).
  const E5 = 659.25, G5 = 783.99, C5 = 523.25, D5 = 587.33
  const C3 = 130.81, G2 = 98, A2 = 110, F2 = 87.31
  const MEL = [E5, 0, G5, E5, C5, 0, D5, 0, E5, G5, 0, E5, D5, 0, C5, 0]
  const BASS = [C3, C3, G2, G2, A2, A2, F2, F2, C3, C3, G2, G2, F2, F2, G2, G2]

  return {
    isOn: () => on,
    toggle() {
      on = !on
      ensure()
      if (master && ctx) master.gain.setTargetAtTime(on ? 0.85 : 0, ctx.currentTime, 0.02)
      return on
    },
    unlock() { ensure() },
    startMusic() {
      if (!ensure() || !ctx || !music) return
      if (loop) return
      music.gain.setTargetAtTime(0.5, ctx.currentTime, 0.3)
      step = 0
      loop = setInterval(() => {
        if (!ctx || !music || !sfx) return
        const m = MEL[step % 16]
        if (m) tone(m, 0.16, 'triangle', music, 0.16)
        tone(BASS[step % 16], 0.22, 'square', music, 0.06)
        if (step % 2 === 0) noise(0.03, music, 0.05, 6000) // hat
        if (step % 8 === 0) noise(0.08, music, 0.12, 120)  // kick-ish
        step++
      }, 150)
    },
    stopMusic() {
      if (loop) { clearInterval(loop); loop = null }
      if (ctx && music) music.gain.setTargetAtTime(0.0, ctx.currentTime, 0.2)
    },
    pop() { if (!ensure() || !sfx) return; tone(880, 0.07, 'sine', sfx, 0.12); tone(1320, 0.05, 'sine', sfx, 0.08, 0.02) },
    whack() {
      if (!ensure() || !ctx || !sfx) return
      const t = ctx.currentTime
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'square'; o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12)
      g.gain.setValueAtTime(0.28, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.16)
      noise(0.07, sfx, 0.22, 200)
    },
    combo(n: number) { if (!ensure() || !sfx) return; const base = 520 + Math.min(n, 8) * 70; tone(base, 0.09, 'sine', sfx, 0.14); tone(base * 1.5, 0.08, 'sine', sfx, 0.1, 0.05) },
    tick() { if (!ensure() || !sfx) return; tone(1000, 0.05, 'square', sfx, 0.1) },
    start() { if (!ensure() || !sfx) return;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', sfx!, 0.12, i * 0.07)) },
    win() { if (!ensure() || !sfx) return;[523, 659, 784, 1047, 1319].forEach((f, i) => { tone(f, 0.18, 'triangle', sfx!, 0.16, i * 0.1); tone(f * 2, 0.18, 'sine', sfx!, 0.06, i * 0.1) }) },
    lose() { if (!ensure() || !sfx) return;[440, 349, 277, 220].forEach((f, i) => tone(f, 0.2, 'sawtooth', sfx!, 0.12, i * 0.12)) },
  }
})()

export default function WhackAMolePage() {
  const [phase, setPhase] = useState<'idle' | 'play' | 'done'>('idle')
  const [moles, setMoles] = useState<boolean[]>(Array(9).fill(false))
  const [bonk, setBonk] = useState<number[]>(Array(9).fill(0))
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [xpDone, setXpDone] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [combo, setCombo] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [shake, setShake] = useState(0)

  const running = useRef(false)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const hasSubmittedScore = useRef(false)
  const spawnTimer = useRef<ReturnType<typeof setInterval>>()
  const countdown = useRef<ReturnType<typeof setInterval>>()
  const comboTimer = useRef<ReturnType<typeof setTimeout>>()

  const stop = useCallback(() => {
    running.current = false
    clearInterval(spawnTimer.current)
    clearInterval(countdown.current)
    clearTimeout(comboTimer.current)
    Audio.stopMusic()
    setMoles(Array(9).fill(false))
  }, [])

  useEffect(() => stop, [stop])

  useEffect(() => {
    if (phase !== 'done') return
    if (scoreRef.current >= WIN_SCORE) Audio.win(); else Audio.lose()
    if (hasSubmittedScore.current || scoreRef.current < WIN_SCORE) return
    hasSubmittedScore.current = true
    fetch('/api/minigame/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'whack-a-mole', score: scoreRef.current }),
    }).then(() => setRefreshKey(k => k + 1)).catch(() => {})
  }, [phase])

  const resetCombo = () => { comboRef.current = 0; setCombo(0) }

  const start = useCallback(() => {
    stop()
    Audio.unlock(); Audio.start(); Audio.startMusic()
    scoreRef.current = 0; comboRef.current = 0
    running.current = true
    hasSubmittedScore.current = false
    setScore(0); setCombo(0); setTimeLeft(GAME_TIME); setMoles(Array(9).fill(false)); setPhase('play'); setXpDone(false)

    spawnTimer.current = setInterval(() => {
      if (!running.current) return
      const idx = Math.floor(Math.random() * 9)
      setMoles(prev => { if (prev[idx]) return prev; const n = [...prev]; n[idx] = true; Audio.pop(); return n })
      setTimeout(() => {
        if (!running.current) return
        setMoles(prev => {
          if (!prev[idx]) return prev
          const n = [...prev]; n[idx] = false
          resetCombo() // expired unwhacked → break combo
          return n
        })
      }, VISIBLE_MS)
    }, SPAWN_MS)

    countdown.current = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1
        if (next <= 0) { stop(); setPhase('done'); return 0 }
        if (next <= 5) Audio.tick()
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
      comboRef.current++; setCombo(comboRef.current)
      setBonk(b => { const c = [...b]; c[idx] = (c[idx] || 0) + 1; return c })
      setShake(s => s + 1)
      Audio.whack()
      if (comboRef.current >= 2) Audio.combo(comboRef.current)
      clearTimeout(comboTimer.current)
      comboTimer.current = setTimeout(resetCombo, 1500)
      return n
    })
  }

  const claimXp = async () => {
    await fetch('/api/minigame/win', { method: 'POST' }).catch(() => {})
    setXpDone(true)
  }

  const toggleSound = () => setSoundOn(Audio.toggle())

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <style>{`
        @keyframes wam-rise { 0%{transform:translateY(115%) scale(0.85)} 60%{transform:translateY(-8%) scale(1.05)} 100%{transform:translateY(0) scale(1)} }
        @keyframes wam-hide { from{transform:translateY(0)} to{transform:translateY(115%)} }
        @keyframes wam-bonk { 0%{transform:translateY(0) scaleY(1) scaleX(1)} 40%{transform:translateY(18%) scaleY(0.55) scaleX(1.35)} 100%{transform:translateY(115%) scaleY(1) scaleX(1)} }
        @keyframes wam-hammer { 0%{transform:rotate(-55deg) translateY(-30px);opacity:0} 25%{opacity:1} 45%{transform:rotate(18deg) translateY(0)} 70%{transform:rotate(8deg) translateY(-4px)} 100%{transform:rotate(8deg) translateY(-4px);opacity:0} }
        @keyframes wam-ring { 0%{transform:scale(0.3);opacity:0.9;border-width:4px} 100%{transform:scale(2.1);opacity:0;border-width:1px} }
        @keyframes wam-float { 0%{transform:translateY(0) scale(0.6);opacity:0} 20%{transform:translateY(-10px) scale(1.1);opacity:1} 100%{transform:translateY(-46px) scale(1);opacity:0} }
        @keyframes wam-star { 0%{transform:translate(0,0) scale(0.4);opacity:1} 100%{transform:translate(var(--dx),var(--dy)) scale(0.9);opacity:0} }
        @keyframes wam-combo { 0%{transform:scale(0.4);opacity:0} 30%{transform:scale(1.15);opacity:1} 80%{transform:scale(1);opacity:1} 100%{transform:scale(1);opacity:0} }
        @keyframes wam-shake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-3px,2px)} 50%{transform:translate(3px,-2px)} 75%{transform:translate(-2px,-2px)} }
        @keyframes wam-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      <div className="rp-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🔨</span>
          <h1 className="text-[11px]" style={{ color: 'var(--text-1)' }}>Whack-a-Mole</h1>
          <span className="ml-auto text-[7px] flex items-center gap-2">
            <span style={{ color: 'var(--gold)' }}>⭐ {score}</span>
            <span style={{ color: timeLeft <= 5 && phase === 'play' ? '#e05a4a' : 'var(--gold)', animation: timeLeft <= 5 && phase === 'play' ? 'wam-pulse 0.5s infinite' : 'none' }}>⏱ {timeLeft}s</span>
            <button onClick={toggleSound} aria-label="Toggle sound" className="hover:opacity-70" style={{ fontSize: 12, lineHeight: 1 }}>
              {soundOn ? '🔊' : '🔇'}
            </button>
          </span>
        </div>

        <div
          className="grid grid-cols-3 gap-3 p-4 rounded-xl relative"
          key={`shake-${shake}`}
          style={{
            background: 'radial-gradient(circle at 50% 0%, #1b1626, var(--bg-page))',
            border: '1px solid var(--border)',
            animation: shake ? 'wam-shake 0.18s' : 'none',
          }}
        >
          {moles.map((up, i) => (
            <button
              key={i}
              onClick={() => whack(i)}
              className="aspect-square rounded-xl relative overflow-hidden select-none"
              style={{
                background: 'linear-gradient(180deg, #16131f 0%, #0e0c14 100%)',
                border: `1px solid ${up ? 'var(--gold)' : 'var(--border)'}`,
                boxShadow: up ? '0 0 16px rgba(200,155,60,0.28), inset 0 -8px 14px rgba(0,0,0,0.6)' : 'inset 0 -8px 14px rgba(0,0,0,0.6)',
                cursor: up ? 'pointer' : 'default',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
            >
              {/* hole shadow */}
              <span style={{ position: 'absolute', left: '15%', right: '15%', bottom: '12%', height: '28%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.75), transparent 70%)' }} />

              {/* mole */}
              <span
                key={`m-${up}-${bonk[i]}`}
                className="absolute inset-x-0 flex items-end justify-center"
                style={{
                  bottom: '8%', height: '78%', fontSize: 34, lineHeight: 1,
                  animation: up ? 'wam-rise 0.22s cubic-bezier(.2,1.4,.5,1) forwards' : 'wam-hide 0.18s ease-in forwards',
                  filter: up ? 'drop-shadow(0 3px 4px rgba(0,0,0,0.5))' : 'none',
                }}
              >
                🦔
              </span>

              {/* dirt mound (foreground so mole emerges from it) */}
              <span style={{ position: 'absolute', left: '-5%', right: '-5%', bottom: '-2%', height: '34%', borderRadius: '50% 50% 0 0 / 80% 80% 0 0', background: 'linear-gradient(180deg, #4a3a28, #2d2418)', boxShadow: 'inset 0 3px 4px rgba(255,220,150,0.08)' }} />

              {/* whack feedback */}
              {bonk[i] > 0 && (
                <span key={`fx-${bonk[i]}`} className="pointer-events-none absolute inset-0">
                  <span className="absolute left-1/2 top-1/2 rounded-full" style={{ width: 40, height: 40, marginLeft: -20, marginTop: -20, border: '3px solid var(--gold)', animation: 'wam-ring 0.45s ease-out forwards' }} />
                  <span className="absolute" style={{ left: '50%', top: '8%', marginLeft: -10, fontSize: 22, transformOrigin: '50% 100%', animation: 'wam-hammer 0.4s ease-out forwards' }}>🔨</span>
                  <span className="absolute font-bold" style={{ left: '50%', top: '38%', marginLeft: -8, fontSize: 13, color: 'var(--gold)', textShadow: '0 1px 2px #000', animation: 'wam-float 0.6s ease-out forwards' }}>+1</span>
                  {[[-26, -18], [24, -22], [-20, 20], [22, 16]].map(([dx, dy], s) => (
                    <span key={s} className="absolute" style={{ left: '50%', top: '45%', fontSize: 11, ['--dx' as any]: `${dx}px`, ['--dy' as any]: `${dy}px`, animation: 'wam-star 0.5s ease-out forwards' }}>✨</span>
                  ))}
                </span>
              )}
            </button>
          ))}

          {/* combo banner */}
          {combo >= 2 && phase === 'play' && (
            <span key={`combo-${combo}`} className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: -6, fontSize: 11, fontWeight: 700, color: 'var(--gold)', textShadow: '0 2px 4px #000', animation: 'wam-combo 0.8s ease-out forwards' }}>
              COMBO x{combo}!
            </span>
          )}
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

      <GameLeaderboard game="whack-a-mole" scoreLabel="whacks" refreshKey={refreshKey} />

      <div className="text-center">
        <Link href="/skills/fun" className="text-[7px] hover:opacity-70" style={{ color: 'var(--text-2)' }}>
          ← Back to Fun Zone
        </Link>
      </div>
    </div>
  )
}
