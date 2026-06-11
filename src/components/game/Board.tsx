'use client'
import React, { useRef, useState, useCallback, useEffect, useReducer } from 'react'
import { Puzzle, PathMap, COLORS, GameSettings, Cell } from '@/lib/game/types'
import {
  startDraw, extendPath, checkWin, buildSVGPath,
  isColorConnected, connectedCount, totalColors,
} from '@/lib/game/engine'

interface Props {
  puzzle: Puzzle
  settings: GameSettings
  onWin: (moves: number, elapsed: number) => void
  onMovesChange: (n: number) => void
  boardKey: number
}

interface State {
  paths: PathMap
  activeColor: string | null
  history: PathMap[]
  moves: number
  won: boolean
}

type Action =
  | { type: 'START'; row: number; col: number }
  | { type: 'EXTEND'; row: number; col: number }
  | { type: 'END' }
  | { type: 'UNDO' }
  | { type: 'RESTART' }

function reducer(state: State, action: Action, puzzle: Puzzle): State {
  switch (action.type) {
    case 'START': {
      const { newPaths, activeColor } = startDraw(puzzle, state.paths, action.row, action.col)
      if (!activeColor) return state
      return {
        ...state,
        paths: newPaths,
        activeColor,
        history: [...state.history, state.paths],
      }
    }
    case 'EXTEND': {
      if (!state.activeColor) return state
      const newPaths = extendPath(puzzle, state.paths, state.activeColor, action.row, action.col)
      if (newPaths === state.paths) return state
      const won = checkWin(puzzle, newPaths)
      return {
        ...state,
        paths: newPaths,
        moves: state.moves + 1,
        won,
      }
    }
    case 'END':
      return { ...state, activeColor: null }
    case 'UNDO': {
      if (state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return {
        ...state,
        paths: prev,
        history: state.history.slice(0, -1),
        activeColor: null,
        won: false,
      }
    }
    case 'RESTART':
      return { paths: {}, activeColor: null, history: [], moves: 0, won: false }
  }
}

// Audio: tiny web audio clicks
let audioCtx: AudioContext | null = null
function playTone(freq: number, dur: number, gain = 0.07) {
  try {
    if (typeof window === 'undefined') return
    if (!audioCtx) audioCtx = new AudioContext()
    const osc = audioCtx.createOscillator()
    const g   = audioCtx.createGain()
    osc.connect(g); g.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
    osc.start(); osc.stop(audioCtx.currentTime + dur)
  } catch { /* ignore */ }
}
function playClick()   { playTone(880, 0.04) }
function playConnect() { playTone(660, 0.12) }
function playWin()     {
  playTone(523, 0.18, 0.1)
  setTimeout(() => playTone(659, 0.18, 0.1), 120)
  setTimeout(() => playTone(784, 0.25, 0.12), 240)
  setTimeout(() => playTone(1047, 0.35, 0.1), 380)
}

export default function Board({ puzzle, settings, onWin, onMovesChange, boardKey }: Props) {
  const initState: State = { paths: {}, activeColor: null, history: [], moves: 0, won: false }
  const [state, rawDispatch] = useReducer(
    (s: State, a: Action) => reducer(s, a, puzzle),
    initState
  )
  const dispatch = useCallback((a: Action) => rawDispatch(a), [])

  const startTimeRef = useRef(Date.now())
  const boardRef     = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(56)
  const [animating, setAnimating] = useState(false)
  const isDrawing = state.activeColor !== null

  // Reset on boardKey change
  useEffect(() => {
    rawDispatch({ type: 'RESTART' })
    startTimeRef.current = Date.now()
    setAnimating(false)
  }, [boardKey])

  // Notify parent of moves
  useEffect(() => { onMovesChange(state.moves) }, [state.moves, onMovesChange])

  // Win detection
  useEffect(() => {
    if (state.won && !animating) {
      setAnimating(true)
      if (settings.sound) playWin()
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
      setTimeout(() => onWin(state.moves, elapsed), 700)
    }
  }, [state.won, animating, settings.sound, onWin, state.moves])

  // Sound on connect
  const prevConnected = useRef(0)
  useEffect(() => {
    const c = connectedCount(puzzle, state.paths)
    if (settings.sound && c > prevConnected.current) playConnect()
    prevConnected.current = c
  }, [state.paths, puzzle, settings.sound])

  // Responsive cell size
  useEffect(() => {
    function measure() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const boardPx = Math.min(vw - 32, vh - 200, 520)
      setCellSize(Math.floor(boardPx / puzzle.size))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [puzzle.size])

  // Keyboard: Ctrl+Z = undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        dispatch({ type: 'UNDO' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  // Pointer coords → grid cell
  function cellFromEvent(e: React.PointerEvent): [number, number] | null {
    if (!boardRef.current) return null
    const rect = boardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor(x / cellSize)
    const row = Math.floor(y / cellSize)
    if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) return null
    return [row, col]
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const cell = cellFromEvent(e)
    if (!cell) return
    if (settings.sound) playClick()
    dispatch({ type: 'START', row: cell[0], col: cell[1] })
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDrawing) return
    const cell = cellFromEvent(e)
    if (!cell) return
    dispatch({ type: 'EXTEND', row: cell[0], col: cell[1] })
  }
  function onPointerUp() { dispatch({ type: 'END' }) }

  const boardPx = cellSize * puzzle.size
  const connected = connectedCount(puzzle, state.paths)
  const total     = totalColors(puzzle)

  // Color info helper
  function colorHex(c: string) {
    const k = c as keyof typeof COLORS
    return COLORS[k]?.hex ?? '#888'
  }
  function colorGlow(c: string) {
    const k = c as keyof typeof COLORS
    return COLORS[k]?.glow ?? 'rgba(128,128,128,0.4)'
  }

  // Build SVG elements for paths
  const pathElements: React.ReactNode[] = []
  for (const [color, cells] of Object.entries(state.paths)) {
    if (cells.length < 1) continue
    const hex  = colorHex(color)
    const glow = colorGlow(color)
    const sw   = cellSize * 0.52
    const complete = isColorConnected(puzzle, state.paths, color)

    if (cells.length >= 2) {
      const d = buildSVGPath(cells as Cell[], cellSize)
      pathElements.push(
        <path
          key={`path-glow-${color}`}
          d={d}
          stroke={glow}
          strokeWidth={sw + 8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />,
        <path
          key={`path-${color}`}
          d={d}
          stroke={hex}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={complete ? 1 : 0.88}
        />
      )
    }

    // Endpoint circles
    const eps = puzzle.dots.filter(d => d.color === color)
    for (const ep of eps) {
      const cx = ep.col * cellSize + cellSize / 2
      const cy = ep.row * cellSize + cellSize / 2
      const r  = cellSize * 0.35
      const inPath = cells.some(([rr, cc]) => rr === ep.row && cc === ep.col)
      pathElements.push(
        <circle
          key={`ep-glow-${color}-${ep.row}-${ep.col}`}
          cx={cx} cy={cy} r={r + 4}
          fill={glow}
        />,
        <circle
          key={`ep-${color}-${ep.row}-${ep.col}`}
          cx={cx} cy={cy} r={r}
          fill={hex}
          stroke={inPath ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)'}
          strokeWidth={inPath ? 2 : 3}
        />
      )
    }
  }

  // Dots whose color has NO path yet
  for (const d of puzzle.dots) {
    if ((state.paths[d.color] ?? []).length > 0) continue
    const cx = d.col * cellSize + cellSize / 2
    const cy = d.row * cellSize + cellSize / 2
    const r  = cellSize * 0.35
    const hex  = colorHex(d.color)
    const glow = colorGlow(d.color)
    pathElements.push(
      <circle key={`dot-glow-${d.color}-${d.row}-${d.col}`} cx={cx} cy={cy} r={r+4} fill={glow} />,
      <circle key={`dot-${d.color}-${d.row}-${d.col}`} cx={cx} cy={cy} r={r} fill={hex} stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
    )
  }

  const isDark = settings.theme === 'dark'
  const bg     = isDark ? '#0e0e1a' : '#f5f3ee'
  const cellBg = isDark ? '#141424' : '#e8e4dc'
  const lineCl = isDark ? '#1f1f35' : '#d0ccc0'
  const textCl = isDark ? '#a09878' : '#6b6050'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Progress chips */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: textCl, fontFamily: "'Press Start 2P', monospace" }}>
          {connected}/{total} connected
        </span>
        <div style={{ width: 80, height: 6, background: lineCl, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${total > 0 ? (connected / total) * 100 : 0}%`,
            background: 'var(--gold)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        style={{
          position: 'relative',
          width: boardPx,
          height: boardPx,
          background: bg,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 0 0 2px #1f1f35, 0 8px 40px rgba(0,0,0,0.7)'
            : '0 0 0 2px #d0ccc0, 0 8px 24px rgba(0,0,0,0.15)',
          touchAction: 'none',
          cursor: isDrawing ? 'crosshair' : 'default',
          transition: state.won ? 'box-shadow 0.4s ease' : 'none',
          ...(state.won ? { boxShadow: '0 0 0 3px var(--gold), 0 0 40px rgba(200,155,60,0.4)' } : {}),
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Grid lines */}
        {Array.from({ length: puzzle.size }, (_, r) =>
          Array.from({ length: puzzle.size }, (_, c) => (
            <div
              key={`cell-${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize,
                height: cellSize,
                background: cellBg,
                border: `1px solid ${lineCl}`,
                boxSizing: 'border-box',
              }}
            />
          ))
        )}

        {/* SVG overlay for paths and dots */}
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width={boardPx}
          height={boardPx}
        >
          {pathElements}
        </svg>

        {/* Win overlay */}
        {state.won && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,20,0.3)',
            animation: 'luminaFadeIn 0.4s ease',
          }}>
            <div style={{ fontSize: 32, animation: 'luminaBounce 0.5s ease' }}>✨</div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.history.length === 0}
          style={ctrlBtn(isDark, state.history.length === 0)}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => dispatch({ type: 'RESTART' })}
          style={ctrlBtn(isDark, false)}
          title="Restart"
        >
          ↺ Restart
        </button>
      </div>
    </div>
  )
}

function ctrlBtn(dark: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 18px',
    background: dark ? '#1a1a2e' : '#e0dbd0',
    border: `1px solid ${dark ? '#2a2a42' : '#c8c4b8'}`,
    borderRadius: 8,
    color: disabled ? (dark ? '#3a3a52' : '#b0aca4') : (dark ? '#a09878' : '#5a5248'),
    fontSize: 9,
    fontFamily: "'Press Start 2P', monospace",
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1,
  }
}
