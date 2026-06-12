'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Puzzle, GameMode, Difficulty, GameSettings, HighScoreEntry } from '@/lib/game/types'
import {
  getDailyPuzzle, getClassicPuzzles,
  getChallengePuzzles, getEndlessPuzzle,
} from '@/lib/game/generator'
import {
  loadSettings, saveSettings, markCompleted, isCompleted,
  loadEndlessIndex, saveEndlessIndex,
  loadHighScores, addHighScore, isHighScore,
  hasTutorialBeenShown, markTutorialShown,
  loadPlayerName, savePlayerName,
} from '@/lib/game/storage'
import { playHint, playLevelComplete, playNewHighScore } from '@/lib/game/audio'

const Board = dynamic(() => import('./Board'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = 'menu' | 'difficulty' | 'game' | 'win' | 'highscores'

interface WinData {
  moves: number
  elapsed: number
  base: number
  timeBonus: number
  moveBonus: number
  score: number
  stars: number
  isNewHighScore: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert']
const DIFF_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner', easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert',
}
const MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic', daily: 'Daily', endless: 'Endless', zen: 'Zen', challenge: 'Challenge',
}

const BASE_SCORES: Record<Difficulty, number> = {
  beginner: 300, easy: 500, medium: 800, hard: 1200, expert: 2000,
}
const PAR_TIMES: Record<Difficulty, number> = {
  beginner: 50, easy: 80, medium: 130, hard: 210, expert: 320,
}
const PAR_MOVES: Record<Difficulty, number> = {
  beginner: 15, easy: 25, medium: 42, hard: 68, expert: 100,
}
const DIFF_DESCS: Record<Difficulty, string> = {
  beginner: '5×5 grid · 3 colors · Relaxed',
  easy:     '6×6 grid · 4 colors · Gentle',
  medium:   '7×7 grid · 5 colors · Satisfying',
  hard:     '9×9 grid · 7 colors · Challenging',
  expert:   '10×10 grid · 9 colors · Master-level',
}

function calcScore(diff: Difficulty, elapsed: number, moves: number) {
  const base  = BASE_SCORES[diff]
  const parT  = PAR_TIMES[diff]
  const parM  = PAR_MOVES[diff]
  const timeBonus = Math.max(0, Math.round((parT - elapsed) * 6))
  const moveBonus = Math.max(0, Math.round((parM - moves) * 8))
  const score  = base + timeBonus + moveBonus
  const perfect = base + parT * 6 + parM * 8
  const ratio  = score / perfect
  const stars  = ratio >= 0.72 ? 3 : ratio >= 0.42 ? 2 : 1
  return { base, timeBonus, moveBonus, score, stars }
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LuminaGame() {
  const [screen, setScreen]         = useState<Screen>('menu')
  const [mode, setMode]             = useState<GameMode>('classic')
  const [diff, setDiff]             = useState<Difficulty>('easy')
  const [puzzle, setPuzzle]         = useState<Puzzle | null>(null)
  const [puzzleIdx, setPuzzleIdx]   = useState(0)
  const [boardKey, setBoardKey]     = useState(0)
  const [moves, setMoves]           = useState(0)
  const [settings, setSettings]     = useState<GameSettings>(loadSettings)
  const [winData, setWinData]       = useState<WinData | null>(null)
  const [endlessIdx, setEndlessIdx] = useState(loadEndlessIndex)
  const [showSettings, setShowSettings] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [showTutorial, setShowTutorial]   = useState(false)

  // Power-ups
  const [hintsLeft, setHintsLeft]   = useState(3)
  const [hintPath, setHintPath]     = useState<{ color: string; cells: [number,number][] } | null>(null)
  const [connectedColors, setConnectedColors] = useState<string[]>([])

  // High score entry
  const [nameInput, setNameInput]       = useState('')
  const [enteringName, setEnteringName] = useState(false)
  const [savedRank, setSavedRank]       = useState<number | null>(null)

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const startRef  = useRef(Date.now())
  const isZen = mode === 'zen'

  // Show tutorial on first visit
  useEffect(() => {
    if (!hasTutorialBeenShown()) {
      setShowTutorial(true)
      markTutorialShown()
    }
  }, [])

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
    setHintsLeft(3)
    setHintPath(null)
    setConnectedColors([])
    setSavedRank(null)
    setEnteringName(false)
  }

  function startClassic(d: Difficulty) { setDiff(d); setPuzzleIdx(0); launchPuzzle(getClassicPuzzles(d, 30)[0]) }
  function startDaily()     { launchPuzzle(getDailyPuzzle()) }
  function startChallenge() { setPuzzleIdx(0); launchPuzzle(getChallengePuzzles(20)[0]) }
  function startEndless()   { launchPuzzle(getEndlessPuzzle(endlessIdx, 'medium')) }
  function startZen(d: Difficulty) { setDiff(d); setPuzzleIdx(0); launchPuzzle(getClassicPuzzles(d, 30)[0]) }

  function nextPuzzle() {
    if (!puzzle) return
    if (mode === 'classic' || mode === 'zen') {
      const next = puzzleIdx + 1
      setPuzzleIdx(next)
      launchPuzzle(getClassicPuzzles(diff, 30)[next % 30])
    } else if (mode === 'endless') {
      const next = endlessIdx + 1
      setEndlessIdx(next); saveEndlessIndex(next)
      launchPuzzle(getEndlessPuzzle(next, 'medium'))
    } else if (mode === 'challenge') {
      const next = puzzleIdx + 1
      setPuzzleIdx(next)
      launchPuzzle(getChallengePuzzles(20)[next % 20])
    } else {
      setScreen('menu')
    }
  }

  const handleWin = useCallback((m: number, e: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (puzzle) markCompleted(puzzle.id, e)

    const d = puzzle!.difficulty
    const { base, timeBonus, moveBonus, score, stars } = isZen
      ? { base: BASE_SCORES[d], timeBonus: 0, moveBonus: 0, score: BASE_SCORES[d], stars: 3 }
      : calcScore(d, e, m)

    const isNewHS = !isZen && isHighScore(score)

    if (settings.sound) {
      if (isNewHS) playNewHighScore()
      else playLevelComplete()
    }

    setWinData({ moves: m, elapsed: e, base, timeBonus, moveBonus, score, stars, isNewHighScore: isNewHS })
    if (isNewHS) {
      setNameInput(loadPlayerName() || 'Player')
      setEnteringName(true)
    }
    setScreen('win')
  }, [puzzle, isZen, settings.sound])

  function saveHighScoreEntry() {
    if (!winData || !puzzle) return
    const name = nameInput.trim() || 'Player'
    savePlayerName(name)
    const entry: HighScoreEntry = {
      name,
      score: winData.score,
      level: `${MODE_LABELS[mode]} ${DIFF_LABELS[puzzle.difficulty]}`,
      elapsed: winData.elapsed,
      moves: winData.moves,
      stars: winData.stars,
      date: new Date().toISOString(),
    }
    const rank = addHighScore(entry)
    setSavedRank(rank)
    setEnteringName(false)
  }

  const handleMovesChange = useCallback((n: number) => setMoves(n), [])

  const handleConnectedChange = useCallback((colors: string[]) => {
    setConnectedColors(colors)
  }, [])

  function useHintPowerUp() {
    if (hintsLeft <= 0 || !puzzle) return
    const allColors = Array.from(new Set(puzzle.dots.map(d => d.color)))
    const unconnected = allColors.find(c => !connectedColors.includes(c) && puzzle.solution[c])
    if (!unconnected) return
    setHintsLeft(h => h - 1)
    setHintPath({ color: unconnected, cells: puzzle.solution[unconnected] as [number, number][] })
    if (settings.sound) playHint()
    setTimeout(() => setHintPath(null), 2600)
  }

  function updateSetting<K extends keyof GameSettings>(key: K, val: GameSettings[K]) {
    const s = { ...settings, [key]: val }
    setSettings(s)
    saveSettings(s)
  }

  // ── Theme ────────────────────────────────────────────────────────────────────
  const isDark = settings.theme === 'dark'
  const bg     = isDark ? '#080810' : '#f0ede6'
  const card   = isDark ? '#0e0e1a' : '#e8e4da'
  const border = isDark ? '#1e1e32' : '#d0ccc0'
  const gold   = '#c89b3c'
  const text1  = isDark ? '#e8e4d8' : '#2a2420'
  const text2  = isDark ? '#9a9080' : '#6b6050'
  const text3  = isDark ? '#5a5468' : '#a09880'

  const styles = { bg, card, border, gold, text1, text2, text3, isDark }

  // ── Modals ───────────────────────────────────────────────────────────────────

  const tutorialOverlay = showTutorial
    ? <HowToPlayModal onClose={() => setShowTutorial(false)} {...styles} title="How to Play Lumina" showGotIt />
    : null

  const howToPlayOverlay = showHowToPlay
    ? <HowToPlayModal onClose={() => setShowHowToPlay(false)} {...styles} title="How to Play" />
    : null

  const settingsOverlay = showSettings
    ? <SettingsPanel settings={settings} onChange={updateSetting} onClose={() => setShowSettings(false)} {...styles} />
    : null

  // ── MENU ────────────────────────────────────────────────────────────────────

  if (screen === 'menu') {
    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        {tutorialOverlay}{howToPlayOverlay}{settingsOverlay}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '20px 20px 32px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 38, marginBottom: 6, filter: `drop-shadow(0 0 12px ${gold}80)` }}>✦</div>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: gold, letterSpacing: 6, textShadow: `0 0 24px ${gold}90`, lineHeight: 1.3 }}>
              LUMINA
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text3, marginTop: 6, letterSpacing: 3 }}>
              A FLOW PUZZLE GAME
            </div>
          </div>

          <div style={{ width: '100%', height: 1, background: border, margin: '18px 0' }} />

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <ModeButton icon="♟" label="CLASSIC" desc="Handcrafted puzzles by difficulty" color="#c89b3c" onClick={() => { setMode('classic'); setScreen('difficulty') }} {...styles} />
            <ModeButton icon="☀" label="DAILY"   desc={`Today's puzzle — ${fmtDate()}`}  color="#4895ef" onClick={() => { setMode('daily'); startDaily() }}   {...styles} />
            <ModeButton icon="∞" label="ENDLESS"  desc="Infinite puzzles, always fresh"    color="#2dc653" onClick={() => { setMode('endless'); startEndless() }} {...styles} />
            <ModeButton icon="◌" label="ZEN"      desc="No timer. Pure puzzle solving."    color="#9b5de5" onClick={() => { setMode('zen'); setScreen('difficulty') }} {...styles} />
            <ModeButton icon="◈" label="CHALLENGE" desc="Expert puzzles — prove yourself"  color="#e63946" onClick={() => { setMode('challenge'); startChallenge() }} {...styles} />
          </div>

          <div style={{ width: '100%', height: 1, background: border, margin: '18px 0' }} />

          <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 8 }}>
            <button onClick={() => setScreen('highscores')} style={{ flex: 1, ...outlineBtn(isDark, gold, border, text2), fontSize: 8 }}>
              🏆 Scores
            </button>
            <button onClick={() => setShowHowToPlay(true)} style={{ flex: 1, ...outlineBtn(isDark, border, border, text2), fontSize: 8 }}>
              ? How to Play
            </button>
          </div>

          <button onClick={() => setShowSettings(true)} style={{ ...outlineBtn(isDark, border, border, text2), width: '100%', fontSize: 8 }}>
            ⚙ Settings
          </button>

          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text3, marginTop: 18, textAlign: 'center', lineHeight: 1.6 }}>
            Made with love ♥
          </div>
        </div>
      </div>
    )
  }

  // ── HIGH SCORES ──────────────────────────────────────────────────────────────

  if (screen === 'highscores') {
    const scores = loadHighScores()
    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', maxWidth: 460, margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: gold, marginBottom: 4, letterSpacing: 2 }}>
            HIGH SCORES
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text3, marginBottom: 24 }}>
            Top 10 all-time
          </div>

          {scores.length === 0 ? (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: '40px 24px', textAlign: 'center', width: '100%' }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>🌟</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: text2, marginBottom: 12 }}>
                No scores yet
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text3 }}>
                Be the first to play and set the record!
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scores.map((s, i) => (
                <div key={i} style={{
                  background: i === 0 ? `${gold}18` : card,
                  border: `1px solid ${i === 0 ? gold : border}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  animation: `luminaFadeIn 0.3s ease ${i * 0.05}s both`,
                }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: i === 0 ? gold : text3, minWidth: 28 }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: text1, marginBottom: 3 }}>
                      {s.name}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text3 }}>
                      {s.level} · {fmtTime(s.elapsed)} · {s.moves} moves
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: i === 0 ? gold : text1 }}>
                      {s.score.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      {'⭐'.repeat(s.stars)}{'☆'.repeat(3 - s.stars)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setScreen('menu')} style={{ ...backBtn(isDark, text2, border), marginTop: 24 }}>
            ← Back to Menu
          </button>
        </div>
      </div>
    )
  }

  // ── DIFFICULTY ────────────────────────────────────────────────────────────────

  if (screen === 'difficulty') {
    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: gold, marginBottom: 6 }}>
            {mode === 'zen' ? 'ZEN MODE' : 'CLASSIC MODE'}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text2, marginBottom: 20 }}>
            {mode === 'zen' ? 'No timer · solve at your pace' : 'Earn stars · chase high scores'}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {DIFFICULTIES.map((d, i) => {
              const dots = '●'.repeat(i + 1) + '○'.repeat(4 - i)
              return (
                <button key={d}
                  onClick={() => mode === 'zen' ? startZen(d) : startClassic(d)}
                  style={{
                    background: card, border: `1px solid ${border}`, borderRadius: 12,
                    padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color 0.15s, transform 0.1s',
                    animation: `luminaFadeIn 0.3s ease ${i * 0.06}s both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = gold; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'none' }}
                >
                  <div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: text1, marginBottom: 5 }}>
                      {DIFF_LABELS[d]}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text3 }}>
                      {DIFF_DESCS[d]}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: gold, letterSpacing: 2, marginLeft: 12 }}>{dots}</div>
                </button>
              )
            })}
          </div>

          <button onClick={() => setScreen('menu')} style={{ ...backBtn(isDark, text2, border), marginTop: 20 }}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── GAME ─────────────────────────────────────────────────────────────────────

  if (screen === 'game' && puzzle) {
    const puzzleLabel = mode === 'classic'   ? `#${puzzleIdx + 1}` :
                        mode === 'endless'   ? `#${endlessIdx + 1}` :
                        mode === 'daily'     ? 'Today' :
                        mode === 'challenge' ? `#${puzzleIdx + 1}` : '∞'

    const parT = PAR_TIMES[puzzle.difficulty]
    const parM = PAR_MOVES[puzzle.difficulty]
    const nearTimeLimit = !isZen && elapsed >= parT * 0.75
    const nearMoveLimit = moves >= parM * 0.80
    const done = isCompleted(puzzle.id)

    return (
      <div style={fullPage(bg)}>
        <style>{ANIM_CSS}</style>
        {howToPlayOverlay}

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', maxWidth: 520, margin: '0 auto', width: '100%',
          boxSizing: 'border-box',
        }}>
          <button onClick={() => setScreen('menu')} style={{ background: 'none', border: 'none', color: text2, fontFamily: "'Press Start 2P', monospace", fontSize: 8, cursor: 'pointer', padding: '4px 0' }}>
            ← Menu
          </button>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: gold }}>
              {MODE_LABELS[mode]} {puzzleLabel}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text3, marginTop: 2 }}>
              {DIFF_LABELS[puzzle.difficulty]} · {puzzle.size}×{puzzle.size}{done ? ' ✓' : ''}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: text3, marginTop: 3, letterSpacing: 1 }}>
              Connect all colors · Fill every cell
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={() => setShowHowToPlay(true)}
              title="How to Play"
              style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: text2, width: 28, height: 28, cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >?</button>
            <button
              onClick={() => updateSetting('sound', !settings.sound)}
              title={settings.sound ? 'Mute' : 'Unmute'}
              style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, color: text2, width: 28, height: 28, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >{settings.sound ? '🔊' : '🔇'}</button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16,
          padding: '0 16px 10px', maxWidth: 520, margin: '0 auto', width: '100%',
          boxSizing: 'border-box',
        }}>
          {!isZen && (
            <StatPill label="TIME" value={fmtTime(elapsed)} warn={nearTimeLimit} gold={gold} text2={text2} border={border} isDark={isDark} />
          )}
          <StatPill label="MOVES" value={String(moves)} warn={nearMoveLimit} gold={gold} text2={text2} border={border} isDark={isDark} />
          {!isZen && (
            <StatPill label="PAR" value={fmtTime(parT)} gold={gold} text2={text2} border={border} isDark={isDark} note={`${parM}m`} />
          )}
        </div>

        {/* ── Board ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 12px' }}>
          <Board
            puzzle={puzzle}
            settings={settings}
            onWin={handleWin}
            onMovesChange={handleMovesChange}
            onConnectedChange={handleConnectedChange}
            hintPath={hintPath}
            boardKey={boardKey}
          />
        </div>

        {/* ── Power-ups ── */}
        {mode !== 'zen' && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '0 16px 24px' }}>
            <PowerUpBtn
              icon="💡"
              label={hintsLeft > 0 ? `Hint (${hintsLeft})` : 'No hints left'}
              disabled={hintsLeft <= 0}
              onClick={useHintPowerUp}
              isDark={isDark} gold={gold} border={border} text2={text2}
            />
          </div>
        )}
      </div>
    )
  }

  // ── WIN SCREEN ────────────────────────────────────────────────────────────────

  if (screen === 'win' && puzzle && winData) {
    const canNext = mode !== 'daily'

    return (
      <div style={{ ...fullPage(bg), justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
        <style>{ANIM_CSS}</style>
        <Sparkles />

        {/* Name entry overlay */}
        {enteringName && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: card, border: `2px solid ${gold}`, borderRadius: 20, padding: '32px 28px', textAlign: 'center', maxWidth: 320, width: 'calc(100% - 40px)', animation: 'luminaFadeIn 0.3s ease', boxShadow: `0 0 60px ${gold}50` }}>
              <div style={{ fontSize: 40, marginBottom: 10, animation: 'luminaBounce 0.6s ease' }}>🏆</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: gold, marginBottom: 6 }}>NEW HIGH SCORE!</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color: text1, marginBottom: 20 }}>
                {winData.score.toLocaleString()}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: text2, marginBottom: 10 }}>
                Enter your name to save:
              </div>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveHighScoreEntry()}
                maxLength={18}
                autoFocus
                placeholder="Your name"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: isDark ? '#1a1a2e' : '#e0dbd0',
                  border: `1px solid ${border}`, borderRadius: 8,
                  padding: '10px 12px', color: text1,
                  fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                  outline: 'none', marginBottom: 14,
                }}
              />
              <button onClick={saveHighScoreEntry} style={{ width: '100%', background: gold, border: 'none', borderRadius: 10, padding: '13px', color: '#0a0a10', fontFamily: "'Press Start 2P', monospace", fontSize: 8, cursor: 'pointer', boxShadow: `0 4px 20px ${gold}60` }}>
                Save Score →
              </button>
              <button onClick={() => setEnteringName(false)} style={{ marginTop: 10, background: 'none', border: 'none', color: text3, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Win card */}
        <div style={{
          background: card, border: `2px solid ${gold}`, borderRadius: 20,
          padding: '24px 28px', textAlign: 'center',
          maxWidth: 360, width: '100%',
          boxShadow: `0 0 60px ${gold}40`,
          animation: 'luminaFadeIn 0.5s ease',
        }}>
          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                fontSize: 30,
                filter: i <= winData.stars ? `drop-shadow(0 0 10px ${gold})` : 'none',
                opacity: i <= winData.stars ? 1 : 0.18,
                animation: i <= winData.stars ? `luminaBounce 0.5s ease ${i * 0.12}s both` : 'none',
              }}>⭐</div>
            ))}
          </div>

          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: gold, marginBottom: 6, animation: 'luminaBounce 0.5s ease 0.4s both' }}>
            LEVEL COMPLETE!
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text3, marginBottom: 20 }}>
            {DIFF_LABELS[puzzle.difficulty]} · {puzzle.size}×{puzzle.size}
          </div>

          {/* Score breakdown */}
          <div style={{ background: isDark ? '#0b0b18' : '#d8d4c8', borderRadius: 12, padding: '14px 18px', marginBottom: 18, textAlign: 'left' }}>
            <ScoreRow label="Base score"  value={winData.base.toLocaleString()} color={text1} text2={text2} />
            {!isZen && (
              <>
                <ScoreRow label="Time bonus"  value={`+${winData.timeBonus.toLocaleString()}`} color={winData.timeBonus > 0 ? '#2dc653' : text3} text2={text2} />
                <ScoreRow label="Move bonus"  value={`+${winData.moveBonus.toLocaleString()}`} color={winData.moveBonus > 0 ? '#2dc653' : text3} text2={text2} />
              </>
            )}
            <div style={{ height: 1, background: border, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: text1, fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: gold }}>{winData.score.toLocaleString()}</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 18 }}>
            {!isZen && <MiniStat label="Time"  value={fmtTime(winData.elapsed)} text1={text1} text2={text2} />}
            <MiniStat label="Moves" value={String(winData.moves)}    text1={text1} text2={text2} />
            <MiniStat label="Grid"  value={`${puzzle.size}×${puzzle.size}`} text1={text1} text2={text2} />
          </div>

          {/* High score badge */}
          {winData.isNewHighScore && savedRank !== null && (
            <div style={{ background: `${gold}20`, border: `1px solid ${gold}60`, borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: gold }}>
              🏆 Rank #{savedRank} on leaderboard!
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {canNext && (
              <button onClick={nextPuzzle} style={{ background: gold, border: 'none', borderRadius: 10, padding: '14px 24px', color: '#0a0a10', fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: 'pointer', width: '100%', boxShadow: `0 4px 20px ${gold}60` }}>
                Next Puzzle →
              </button>
            )}
            <button onClick={() => { setBoardKey(k => k + 1); setScreen('game') }} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 10, padding: '12px 24px', color: text2, fontFamily: "'Press Start 2P', monospace", fontSize: 8, cursor: 'pointer', width: '100%' }}>
              ↺ Replay
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setScreen('highscores')} style={{ flex: 1, background: 'none', border: 'none', color: text3, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', padding: '6px' }}>
                🏆 Scores
              </button>
              <button onClick={() => setScreen('menu')} style={{ flex: 1, background: 'none', border: 'none', color: text3, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer', padding: '6px' }}>
                ← Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function ModeButton({ icon, label, desc, color, onClick, card, border, text2 }: {
  icon: string; label: string; desc: string; color: string; onClick: () => void
  card: string; border: string; text2: string
  isDark?: boolean; gold?: string; bg?: string; text1?: string; text3?: string
}) {
  return (
    <button onClick={onClick} style={{
      background: card, border: `1px solid ${border}`, borderRadius: 12,
      padding: '14px 18px', cursor: 'pointer', textAlign: 'left', width: '100%',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'border-color 0.15s, transform 0.1s, box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}25` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ fontSize: 22, minWidth: 30, textAlign: 'center', color, filter: `drop-shadow(0 0 6px ${color}60)` }}>{icon}</div>
      <div>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color, marginBottom: 4 }}>{label}</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text2 }}>{desc}</div>
      </div>
    </button>
  )
}

function StatPill({ label, value, warn, gold, text2, border, isDark, note }: {
  label: string; value: string; warn?: boolean; gold: string; text2: string; border: string; isDark: boolean; note?: string
}) {
  return (
    <div style={{
      background: isDark ? '#0e0e1a' : '#e8e4da',
      border: `1px solid ${warn ? '#e63946' : border}`,
      borderRadius: 8, padding: '6px 12px', textAlign: 'center',
      boxShadow: warn ? '0 0 12px rgba(230,57,70,0.3)' : 'none',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: warn ? '#e63946' : text2, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: warn ? '#e63946' : gold, animation: warn ? 'luminaPulse 1s ease infinite' : 'none' }}>{value}</div>
      {note && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: text2, marginTop: 1 }}>{note}</div>}
    </div>
  )
}

function PowerUpBtn({ icon, label, disabled, onClick, isDark, gold, border, text2 }: {
  icon: string; label: string; disabled: boolean; onClick: () => void
  isDark: boolean; gold: string; border: string; text2: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? 'none' : (isDark ? '#1a1a2e' : '#e0dbd0'),
        border: `1px solid ${disabled ? border : gold}`,
        borderRadius: 10, padding: '9px 18px',
        color: disabled ? text2 : gold,
        fontFamily: "'Press Start 2P', monospace", fontSize: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', gap: 8,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.boxShadow = `0 0 12px ${gold}50` }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      {label}
    </button>
  )
}

function ScoreRow({ label, value, color, text2 }: { label: string; value: string; color: string; text2: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: text2 }}>{label}</span>
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color }}>{value}</span>
    </div>
  )
}

function MiniStat({ label, value, text1, text2 }: { label: string; value: string; text1: string; text2: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: text1, marginBottom: 3 }}>{value}</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: text2 }}>{label}</div>
    </div>
  )
}

function Sparkles() {
  const positions = [
    [8, 8], [82, 6], [14, 82], [86, 87], [50, 4], [4, 50],
    [96, 50], [50, 96], [22, 45], [78, 55], [50, 22], [50, 78],
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {positions.map(([x, y], i) => (
        <div key={i} style={{
          position: 'absolute', left: `${x}%`, top: `${y}%`,
          fontSize: [14, 20, 12, 18, 16, 22][i % 6],
          animation: `luminaSparkle ${0.55 + (i % 4) * 0.15}s ease ${i * 0.07}s both`,
        }}>
          {['✦', '★', '✧', '◆', '✦', '⋆'][i % 6]}
        </div>
      ))}
    </div>
  )
}

const HOW_TO_PLAY_SLIDES = [
  {
    icon: '🔵',
    title: 'Connect the Dots',
    body: 'Draw paths to connect matching colored dots. Every color must be connected to its pair.',
  },
  {
    icon: '⬛',
    title: 'Fill Every Cell',
    body: 'All cells on the board must be covered by a path — no empty squares allowed!',
  },
  {
    icon: '✋',
    title: 'How to Draw',
    body: 'Click (or tap) a dot and drag to draw. Drag back to erase. Crossing another color removes it.',
  },
  {
    icon: '⭐',
    title: 'Scoring & Stars',
    body: 'You earn a Base score + Time Bonus + Move Bonus. Faster and fewer moves = 3 stars and higher scores!',
  },
  {
    icon: '💡',
    title: 'Power-Ups',
    body: 'You have 3 Hints per game. Each hint briefly shows the correct path for an unfinished color. Use Undo to fix mistakes.',
  },
]

function HowToPlayModal({ onClose, card, border, gold, text1, text2, title, showGotIt }: {
  onClose: () => void; card: string; border: string; gold: string
  text1: string; text2: string
  title?: string; showGotIt?: boolean
  isDark?: boolean; text3?: string; bg?: string
}) {
  const [slide, setSlide] = React.useState(0)
  const s = HOW_TO_PLAY_SLIDES[slide]
  const isLast = slide === HOW_TO_PLAY_SLIDES.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        background: card, border: `2px solid ${gold}`, borderRadius: 20,
        padding: '28px 24px', maxWidth: 340, width: 'calc(100% - 40px)',
        animation: 'luminaFadeIn 0.25s ease',
        boxShadow: `0 0 40px ${gold}30`,
      }} onClick={e => e.stopPropagation()}>
        {title && (
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: gold, marginBottom: 20, textAlign: 'center' }}>
            {title}
          </div>
        )}

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44, marginBottom: 14, animation: 'luminaBounce 0.4s ease' }}>{s.icon}</div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: text1, marginBottom: 14 }}>{s.title}</div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: text2, lineHeight: 1.65 }}>{s.body}</div>
        </div>

        {/* Slide dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
          {HOW_TO_PLAY_SLIDES.map((_, i) => (
            <div key={i} onClick={() => setSlide(i)} style={{
              width: 8, height: 8, borderRadius: '50%', cursor: 'pointer',
              background: i === slide ? gold : border, transition: 'background 0.2s',
              boxShadow: i === slide ? `0 0 6px ${gold}` : 'none',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {slide > 0 && (
            <button onClick={() => setSlide(s => s - 1)} style={{ flex: 1, background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '11px', color: text2, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer' }}>
              ← Back
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setSlide(s => s + 1)} style={{ flex: 1, background: gold, border: 'none', borderRadius: 8, padding: '11px', color: '#0a0a10', fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer' }}>
              Next →
            </button>
          ) : (
            <button onClick={onClose} style={{ flex: 1, background: gold, border: 'none', borderRadius: 8, padding: '11px', color: '#0a0a10', fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer' }}>
              {showGotIt ? 'Got it! Let\'s Play' : 'Close ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ settings, onChange, onClose, card, border, text1, text2, gold }: {
  settings: GameSettings
  onChange: <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => void
  onClose: () => void
  card: string; border: string; text1: string; text2: string; gold: string
  isDark?: boolean; bg?: string; text3?: string; text4?: string
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '28px 32px', minWidth: 300, maxWidth: 380, animation: 'luminaFadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: gold, marginBottom: 24 }}>Settings</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Toggle label="Sound effects" value={settings.sound} onChange={v => onChange('sound', v)} text1={text1} gold={gold} border={border} />
          <Toggle label="Dark mode"     value={settings.theme === 'dark'} onChange={v => onChange('theme', v ? 'dark' : 'light')} text1={text1} gold={gold} border={border} />
          <Toggle label="Colorblind mode" value={settings.colorblind} onChange={v => onChange('colorblind', v)} text1={text1} gold={gold} border={border} />
        </div>
        <button onClick={onClose} style={{ marginTop: 24, width: '100%', background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '10px', color: text2, fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer' }}>Close</button>
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
      <button onClick={() => onChange(!value)} style={{ width: 46, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: value ? gold : border, transition: 'background 0.2s', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </button>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fullPage(bg: string): React.CSSProperties {
  return { minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', fontFamily: "'Press Start 2P', monospace" }
}

function outlineBtn(_isDark: boolean, borderColor: string, _fallback: string, textColor: string): React.CSSProperties {
  return {
    background: 'none',
    border: `1px solid ${borderColor}`,
    color: textColor,
    padding: '10px 16px',
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 8,
    cursor: 'pointer',
    borderRadius: 8,
    transition: 'border-color 0.15s',
  }
}

function backBtn(isDark: boolean, text2: string, border: string): React.CSSProperties {
  return {
    background: 'none', border: `1px solid ${border}`,
    color: text2, padding: '10px 20px', borderRadius: 8,
    fontFamily: "'Press Start 2P', monospace", fontSize: 7, cursor: 'pointer',
  }
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

function fmtDate(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Animations ─────────────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes luminaFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes luminaBounce {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes luminaSparkle {
  0%   { transform: scale(0) rotate(0deg); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: scale(2.5) rotate(200deg); opacity: 0; }
}
@keyframes luminaShake {
  0%, 100% { transform: none; }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@keyframes luminaHintPulse {
  from { opacity: 0.3; }
  to   { opacity: 0.75; }
}
@keyframes luminaPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}
`
