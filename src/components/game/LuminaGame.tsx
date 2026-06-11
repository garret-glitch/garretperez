'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Puzzle, GameMode, Difficulty, GameSettings } from '@/lib/game/types'
import {
  getDailyPuzzle, getClassicPuzzles,
  getChallengePuzzles, getEndlessPuzzle,
} from '@/lib/game/generator'
import {
  loadSettings, saveSettings, markCompleted, isCompleted,
  loadEndlessIndex, saveEndlessIndex,
} from '@/lib/game/storage'

const Board = dynamic(() => import('./Board'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'menu' | 'difficulty' | 'game' | 'win' | 'settings'

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert']
const DIFF_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  easy:     'Easy',
  medium:   'Medium',
  hard:     'Hard',
  expert:   'Expert',
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LuminaGame() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [mode, setMode]     = useState<GameMode>('classic')
  const [diff, setDiff]     = useState<Difficulty>('easy')
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const [boardKey, setBoardKey]   = useState(0)
  const [moves, setMoves]         = useState(0)
  const [settings, setSettings]   = useState<GameSettings>(loadSettings)
  const [winData, setWinData]     = useState<{ moves: number; elapsed: number } | null>(null)
  const [endlessIdx, setEndlessIdx] = useState(loadEndlessIndex)
  const [showSettings, setShowSettings] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const isZen = mode === 'zen'

  // Timer
  useEffect(() => {
    if (screen !== 'game') { if (timerRef.current) clearInterval(timerRef.current); return }
    startRef.current = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [screen, boardKey])

  function launchPuzzle(p: Puzzle) {
    setPuzzle(p)
    setScreen('game')
    setBoardKey(k => k + 1)
    setMoves(0)
    setElapsed(0)
    setWinData(null)
  }

  function startClassic(d: Difficulty) {
    setDiff(d)
    setPuzzleIdx(0)
    const puzzles = getClassicPuzzles(d, 30)
    launchPuzzle(puzzles[0])
  }

  function startDaily()      { launchPuzzle(getDailyPuzzle()) }
  function startChallenge()  { setPuzzleIdx(0); launchPuzzle(getChallengePuzzles(20)[0]) }
  function startEndless()    { launchPuzzle(getEndlessPuzzle(endlessIdx, 'medium')) }
  function startZen(d: Difficulty) {
    setDiff(d)
    setPuzzleIdx(0)
    launchPuzzle(getClassicPuzzles(d, 30)[0])
  }

  function nextPuzzle() {
    if (!puzzle) return
    if (mode === 'classic' || mode === 'zen') {
      const next = puzzleIdx + 1
      const puzzles = getClassicPuzzles(diff, 30)
      setPuzzleIdx(next)
      launchPuzzle(puzzles[next % puzzles.length])
    } else if (mode === 'endless') {
      const next = endlessIdx + 1
      setEndlessIdx(next)
      saveEndlessIndex(next)
      launchPuzzle(getEndlessPuzzle(next, 'medium'))
    } else if (mode === 'challenge') {
      const next = puzzleIdx + 1
      setPuzzleIdx(next)
      launchPuzzle(getChallengePuzzles(20)[next % 20])
    } else {
      // daily: go back to menu after completing
      setScreen('menu')
    }
  }

  const handleWin = useCallback((m: number, e: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (puzzle) markCompleted(puzzle.id, e)
    setWinData({ moves: m, elapsed: e })
    setScreen('win')
  }, [puzzle])

  const handleMovesChange = useCallback((n: number) => setMoves(n), [])

  function updateSetting<K extends keyof GameSettings>(key: K, val: GameSettings[K]) {
    const s = { ...settings, [key]: val }
    setSettings(s)
    saveSettings(s)
  }

  // Style helpers
  const isDark = settings.theme === 'dark'
  const bg     = isDark ? '#080810' : '#f0ede6'
  const card   = isDark ? '#0e0e1a' : '#e8e4da'
  const border = isDark ? '#1e1e32' : '#d0ccc0'
  const gold   = '#c89b3c'
  const text1  = isDark ? '#e8e4d8' : '#2a2420'
  const text2  = isDark ? '#9a9080' : '#6b6050'
  const text3  = isDark ? '#5a5468' : '#a09880'

  // ── MENU ────────────────────────────────────────────────────────────────────

  if (screen === 'menu') {
    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        {showSettings && <SettingsPanel settings={settings} onChange={updateSetting} onClose={() => setShowSettings(false)} card={card} border={border} text1={text1} text2={text2} gold={gold} />}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '24px 20px', maxWidth: 420, margin: '0 auto' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✦</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: gold, letterSpacing: 6, textShadow: `0 0 20px ${gold}80`, lineHeight: 1.3 }}>
              LUMINA
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text3, marginTop: 8, letterSpacing: 2 }}>
              A FLOW PUZZLE GAME
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: border, margin: '20px 0' }} />

          {/* Mode buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ModeButton icon="♟" label="CLASSIC" desc="Handcrafted puzzles by difficulty" color="#c89b3c" onClick={() => { setMode('classic'); setScreen('difficulty') }} card={card} border={border} text2={text2} />
            <ModeButton icon="☀" label="DAILY" desc={`Today's puzzle — ${formatDate()}`} color="#4895ef" onClick={() => { setMode('daily'); startDaily() }} card={card} border={border} text2={text2} />
            <ModeButton icon="∞" label="ENDLESS" desc="Infinite puzzles, always fresh" color="#2dc653" onClick={() => { setMode('endless'); startEndless() }} card={card} border={border} text2={text2} />
            <ModeButton icon="◌" label="ZEN" desc="No timer. Pure puzzle solving." color="#9b5de5" onClick={() => { setMode('zen'); setScreen('difficulty') }} card={card} border={border} text2={text2} />
            <ModeButton icon="◈" label="CHALLENGE" desc="Expert puzzles for the brave" color="#e63946" onClick={() => { setMode('challenge'); startChallenge() }} card={card} border={border} text2={text2} />
          </div>

          <div style={{ width: '100%', height: 1, background: border, margin: '20px 0' }} />

          {/* Settings */}
          <button onClick={() => setShowSettings(true)} style={{
            background: 'none', border: `1px solid ${border}`, color: text2, padding: '10px 24px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 8, cursor: 'pointer',
            borderRadius: 8, width: '100%',
          }}>
            ⚙ Settings
          </button>

          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text3, marginTop: 20, textAlign: 'center', lineHeight: 1.6 }}>
            Made with love ♥
          </div>
        </div>
      </div>
    )
  }

  // ── DIFFICULTY SELECT ────────────────────────────────────────────────────────

  if (screen === 'difficulty') {
    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px', maxWidth: 420, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: gold, marginBottom: 24 }}>
            {mode === 'zen' ? 'ZEN MODE' : 'CLASSIC MODE'}
          </div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: text2, marginBottom: 24 }}>
            Choose Difficulty
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DIFFICULTIES.map((d, i) => {
              const dots = '●'.repeat(i + 1) + '○'.repeat(4 - i)
              return (
                <button key={d} onClick={() => mode === 'zen' ? startZen(d) : startClassic(d)} style={{
                  background: card, border: `1px solid ${border}`, borderRadius: 10,
                  padding: '16px 20px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = gold)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}
                >
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: text1 }}>
                    {DIFF_LABELS[d]}
                  </div>
                  <div style={{ fontSize: 12, color: gold, letterSpacing: 2 }}>{dots}</div>
                </button>
              )
            })}
          </div>
          <button onClick={() => setScreen('menu')} style={backBtn(isDark, text2, border)}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── GAME ────────────────────────────────────────────────────────────────────

  if (screen === 'game' && puzzle) {
    const puzzleLabel = mode === 'classic' ? `#${puzzleIdx + 1}` :
                        mode === 'endless'  ? `#${endlessIdx + 1}` :
                        mode === 'daily'    ? 'Today' :
                        mode === 'challenge' ? `#${puzzleIdx + 1}` : '∞'
    const done = isCompleted(puzzle.id)

    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', maxWidth: 520, margin: '0 auto', width: '100%',
        }}>
          <button onClick={() => setScreen('menu')} style={{
            background: 'none', border: 'none', color: text2,
            fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer',
          }}>← Menu</button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: gold }}>
              {MODE_LABELS[mode]} {puzzleLabel}
            </div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: text3, marginTop: 3 }}>
              {DIFF_LABELS[puzzle.difficulty]} · {puzzle.size}×{puzzle.size}
              {done ? ' ✓' : ''}
            </div>
          </div>

          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, textAlign: 'right' }}>
            {!isZen && (
              <div style={{ color: text2 }}>{formatTime(elapsed)}</div>
            )}
            <div style={{ color: text3, fontSize: 6, marginTop: 2 }}>{moves} moves</div>
          </div>
        </div>

        {/* Board */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 24px' }}>
          <Board
            puzzle={puzzle}
            settings={settings}
            onWin={handleWin}
            onMovesChange={handleMovesChange}
            boardKey={boardKey}
          />
        </div>
      </div>
    )
  }

  // ── WIN SCREEN ───────────────────────────────────────────────────────────────

  if (screen === 'win' && puzzle && winData) {
    const canNext = mode !== 'daily'
    return (
      <div style={{ ...fullPage(bg), justifyContent: 'center', alignItems: 'center' }}>
        <style>{ANIM_CSS}</style>
        <div style={{
          background: card, border: `2px solid ${gold}`, borderRadius: 20,
          padding: '32px 40px', textAlign: 'center', maxWidth: 340,
          boxShadow: `0 0 40px ${gold}40`,
          animation: 'luminaFadeIn 0.5s ease',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12, animation: 'luminaBounce 0.6s ease' }}>✨</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: gold, marginBottom: 20 }}>
            SOLVED!
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 24 }}>
            <StatBox label="Time" value={!isZen ? formatTime(winData.elapsed) : '∞'} color={text1} text2={text2} />
            <StatBox label="Moves" value={String(winData.moves)} color={text1} text2={text2} />
            <StatBox label="Size" value={`${puzzle.size}×${puzzle.size}`} color={text1} text2={text2} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canNext && (
              <button onClick={nextPuzzle} style={{
                background: gold, border: 'none', borderRadius: 10,
                padding: '14px 24px', color: '#0a0a10',
                fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                cursor: 'pointer', width: '100%',
                boxShadow: `0 4px 20px ${gold}60`,
              }}>
                Next Puzzle →
              </button>
            )}
            <button onClick={() => { setBoardKey(k => k + 1); setScreen('game') }} style={{
              background: 'none', border: `1px solid ${border}`, borderRadius: 10,
              padding: '12px 24px', color: text2,
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              cursor: 'pointer', width: '100%',
            }}>
              ↺ Replay
            </button>
            <button onClick={() => setScreen('menu')} style={{
              background: 'none', border: 'none', color: text3,
              fontFamily: "'Press Start 2P', monospace", fontSize: 7,
              cursor: 'pointer',
            }}>
              ← Menu
            </button>
          </div>
        </div>

        {/* Sparkles */}
        <Sparkles />
      </div>
    )
  }

  return null
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModeButton({ icon, label, desc, color, onClick, card, border, text2 }: {
  icon: string; label: string; desc: string; color: string
  onClick: () => void; card: string; border: string; text2: string
}) {
  return (
    <button onClick={onClick} style={{
      background: card, border: `1px solid ${border}`, borderRadius: 12,
      padding: '16px 20px', cursor: 'pointer', textAlign: 'left', width: '100%',
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.15s, transform 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ fontSize: 22, minWidth: 28, textAlign: 'center', color }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color, marginBottom: 5 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text2 }}>{desc}</div>
      </div>
    </button>
  )
}

function StatBox({ label, value, color, text2 }: { label: string; value: string; color: string; text2: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text2 }}>{label}</div>
    </div>
  )
}

function Sparkles() {
  const positions = [
    [10, 10], [80, 5], [15, 80], [85, 85], [50, 5], [5, 50],
    [95, 50], [50, 95], [20, 50], [80, 50], [50, 20], [50, 75],
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100 }}>
      {positions.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${x}%`, top: `${y}%`,
          fontSize: [14, 18, 12, 20, 16][i % 5],
          animation: `luminaSparkle ${0.6 + (i % 4) * 0.15}s ease ${i * 0.08}s both`,
        }}>
          {['✦', '★', '✧', '◆', '✦'][i % 5]}
        </div>
      ))}
    </div>
  )
}

function SettingsPanel({ settings, onChange, onClose, card, border, text1, text2, gold }: {
  settings: GameSettings
  onChange: <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => void
  onClose: () => void
  card: string; border: string; text1: string; text2: string; gold: string
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: card, border: `1px solid ${border}`, borderRadius: 16,
        padding: '28px 32px', minWidth: 300, maxWidth: 380,
        animation: 'luminaFadeIn 0.2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: gold, marginBottom: 24 }}>
          Settings
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Toggle label="Sound effects" value={settings.sound} onChange={v => onChange('sound', v)} text1={text1} gold={gold} border={border} />
          <Toggle label="Dark mode" value={settings.theme === 'dark'} onChange={v => onChange('theme', v ? 'dark' : 'light')} text1={text1} gold={gold} border={border} />
          <Toggle label="Colorblind mode" value={settings.colorblind} onChange={v => onChange('colorblind', v)} text1={text1} gold={gold} border={border} />
        </div>
        <button onClick={onClose} style={{
          marginTop: 24, width: '100%', background: 'none',
          border: `1px solid ${border}`, borderRadius: 8, padding: '10px',
          color: text2, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer',
        }}>Close</button>
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange, text1, gold, border }: {
  label: string; value: boolean; onChange: (v: boolean) => void
  text1: string; gold: string; border: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: text1 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
        background: value ? gold : border, transition: 'background 0.2s', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 22 : 3,
          width: 20, height: 20, borderRadius: '50%',
          background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </button>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic', daily: 'Daily', endless: 'Endless', zen: 'Zen', challenge: 'Challenge',
}

function fullPage(bg: string): React.CSSProperties {
  return {
    minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column',
    fontFamily: "'Press Start 2P', monospace",
  }
}

function backBtn(isDark: boolean, text2: string, border: string): React.CSSProperties {
  return {
    marginTop: 20, background: 'none', border: `1px solid ${border}`,
    color: text2, padding: '10px 20px', borderRadius: 8,
    fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer',
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function formatDate(): string {
  const d = new Date()
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── CSS animations ─────────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes luminaFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes luminaBounce {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes luminaSparkle {
  0%   { transform: scale(0) rotate(0deg); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: scale(2.5) rotate(200deg); opacity: 0; }
}
`
