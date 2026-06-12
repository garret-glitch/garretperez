'use client'
import React, { useRef, useState, useCallback, useEffect, useReducer } from 'react'
import { Puzzle, PathMap, COLORS, GameSettings, Cell } from '@/lib/game/types'
import {
  startDraw, extendPath, checkWin, buildSVGPath,
  isColorConnected, connectedCount, totalColors, isEndpoint, coveredCount,
} from '@/lib/game/engine'
import { playClick, playConnect, playBadMove } from '@/lib/game/audio'

interface Props {
  puzzle: Puzzle
  settings: GameSettings
  onWin: (moves: number, elapsed: number) => void
  onMovesChange: (n: number) => void
  onConnectedChange?: (colors: string[]) => void
  hintPath?: { color: string; cells: [number, number][] } | null
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
      return { ...state, paths: newPaths, activeColor, history: [...state.history, state.paths] }
    }
    case 'EXTEND': {
      if (!state.activeColor) return state
      const newPaths = extendPath(puzzle, state.paths, state.activeColor, action.row, action.col)
      if (newPaths === state.paths) return state
      const won = checkWin(puzzle, newPaths)
      return { ...state, paths: newPaths, moves: state.moves + 1, won }
    }
    case 'END':
      return { ...state, activeColor: null }
    case 'UNDO': {
      if (state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return { ...state, paths: prev, history: state.history.slice(0, -1), activeColor: null, won: false }
    }
    case 'RESTART':
      return { paths: {}, activeColor: null, history: [], moves: 0, won: false }
  }
}

export default function Board({ puzzle, settings, onWin, onMovesChange, onConnectedChange, hintPath, boardKey }: Props) {
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
  const [badMove, setBadMove]     = useState(false)
  const badMoveRef = useRef(false)
  const isDrawing = state.activeColor !== null

  // Reset on boardKey change
  useEffect(() => {
    rawDispatch({ type: 'RESTART' })
    startTimeRef.current = Date.now()
    setAnimating(false)
    setBadMove(false)
  }, [boardKey])

  // Notify parent of moves
  useEffect(() => { onMovesChange(state.moves) }, [state.moves, onMovesChange])

  // Win detection
  useEffect(() => {
    if (state.won && !animating) {
      setAnimating(true)
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
      setTimeout(() => onWin(state.moves, elapsed), 600)
    }
  }, [state.won, animating, onWin, state.moves])

  // Sound + connected change notification
  const prevConnected = useRef(0)
  useEffect(() => {
    const c = connectedCount(puzzle, state.paths)
    if (c > prevConnected.current) {
      if (settings.sound) playConnect()
      // Notify parent which colors are connected
      const colors = Array.from(new Set(puzzle.dots.map(d => d.color)))
      const connected = colors.filter(col => isColorConnected(puzzle, state.paths, col))
      onConnectedChange?.(connected)
    }
    prevConnected.current = c
  }, [state.paths, puzzle, settings.sound, onConnectedChange])

  // Responsive cell size
  useEffect(() => {
    function measure() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const boardPx = Math.min(vw - 32, vh - 220, 520)
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

  function triggerBadMove() {
    if (badMoveRef.current) return
    badMoveRef.current = true
    setBadMove(true)
    if (settings.sound) playBadMove()
    setTimeout(() => { badMoveRef.current = false; setBadMove(false) }, 420)
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
    // Detect: trying to enter another color's endpoint
    const ep = isEndpoint(puzzle, cell[0], cell[1])
    if (ep && ep.color !== state.activeColor) {
      triggerBadMove()
      return
    }
    dispatch({ type: 'EXTEND', row: cell[0], col: cell[1] })
  }

  function onPointerUp() { dispatch({ type: 'END' }) }

  const boardPx     = cellSize * puzzle.size
  const connected   = connectedCount(puzzle, state.paths)
  const total       = totalColors(puzzle)
  const cellsCovered = coveredCount(state.paths)
  const totalCells  = puzzle.size * puzzle.size

  function colorHex(c: string) { return (COLORS as Record<string, { hex: string; glow: string }>)[c]?.hex ?? '#888' }
  function colorGlow(c: string) { return (COLORS as Record<string, { hex: string; glow: string }>)[c]?.glow ?? 'rgba(128,128,128,0.4)' }

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
        <path key={`pg-${color}`} d={d} stroke={glow} strokeWidth={sw + 8} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
        <path key={`p-${color}`}  d={d} stroke={hex}  strokeWidth={sw}     strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={complete ? 1 : 0.88} />
      )
    }

    const eps = puzzle.dots.filter(d => d.color === color)
    for (const ep of eps) {
      const cx = ep.col * cellSize + cellSize / 2
      const cy = ep.row * cellSize + cellSize / 2
      const r  = cellSize * 0.35
      const inPath = cells.some(([rr, cc]) => rr === ep.row && cc === ep.col)
      pathElements.push(
        <circle key={`eg-${color}-${ep.row}-${ep.col}`} cx={cx} cy={cy} r={r + 4} fill={glow} />,
        <circle key={`e-${color}-${ep.row}-${ep.col}`}  cx={cx} cy={cy} r={r}     fill={hex}
          stroke={inPath ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)'}
          strokeWidth={inPath ? 2 : 3} />
      )
    }
  }

  // Dots without paths
  for (const d of puzzle.dots) {
    if ((state.paths[d.color] ?? []).length > 0) continue
    const cx  = d.col * cellSize + cellSize / 2
    const cy  = d.row * cellSize + cellSize / 2
    const r   = cellSize * 0.35
    const hex  = colorHex(d.color)
    const glow = colorGlow(d.color)
    pathElements.push(
      <circle key={`dg-${d.color}-${d.row}-${d.col}`} cx={cx} cy={cy} r={r + 4} fill={glow} />,
      <circle key={`d-${d.color}-${d.row}-${d.col}`}  cx={cx} cy={cy} r={r}     fill={hex} stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
    )
  }

  // Hint path overlay
  if (hintPath && hintPath.cells.length >= 2) {
    const hHex  = colorHex(hintPath.color)
    const hGlow = colorGlow(hintPath.color)
    const hd    = buildSVGPath(hintPath.cells as Cell[], cellSize)
    pathElements.push(
      <path key="hint-glow" d={hd} stroke={hGlow} strokeWidth={cellSize * 0.62} strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ animation: 'luminaHintPulse 0.55s ease-in-out infinite alternate' }} />,
      <path key="hint-dash" d={hd} stroke={hHex}  strokeWidth={cellSize * 0.42} strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={`${cellSize * 0.38} ${cellSize * 0.26}`}
        style={{ animation: 'luminaHintPulse 0.55s ease-in-out infinite alternate' }} />
    )
  }

  const isDark = settings.theme === 'dark'
  const bg     = isDark ? '#0e0e1a' : '#f5f3ee'
  const cellBg = isDark ? '#141424' : '#e8e4dc'
  const lineCl = isDark ? '#1f1f35' : '#d0ccc0'
  const textCl = isDark ? '#a09878' : '#6b6050'
  const gold   = '#c89b3c'

  const colorPct = total > 0 ? Math.round((connected / total) * 100) : 0
  const cellPct  = totalCells > 0 ? Math.round((cellsCovered / totalCells) * 100) : 0
  const allConnected = connected === total
  const allFilled    = cellsCovered === totalCells

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Progress rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        {/* Colors connected */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: allConnected ? '#2dc653' : textCl, fontFamily: "'Press Start 2P', monospace", minWidth: 100 }}>
            {connected}/{total} colors
          </span>
          <div style={{ width: 80, height: 6, background: lineCl, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${colorPct}%`,
              background: allConnected ? '#2dc653' : gold,
              borderRadius: 4, transition: 'width 0.35s ease',
              boxShadow: allConnected ? '0 0 8px rgba(45,198,83,0.7)' : 'none',
            }} />
          </div>
        </div>
        {/* Cells filled */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: allFilled ? '#2dc653' : textCl, fontFamily: "'Press Start 2P', monospace", minWidth: 100 }}>
            {cellsCovered}/{totalCells} cells
          </span>
          <div style={{ width: 80, height: 6, background: lineCl, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${cellPct}%`,
              background: allFilled ? '#2dc653' : '#4895ef',
              borderRadius: 4, transition: 'width 0.35s ease',
              boxShadow: allFilled ? '0 0 8px rgba(45,198,83,0.7)' : 'none',
            }} />
          </div>
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
          ...(state.won
            ? { boxShadow: `0 0 0 3px ${gold}, 0 0 50px rgba(200,155,60,0.5)`, transition: 'box-shadow 0.4s ease' }
            : {}),
          ...(badMove ? { animation: 'luminaShake 0.4s ease' } : {}),
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Grid cells */}
        {Array.from({ length: puzzle.size }, (_, r) =>
          Array.from({ length: puzzle.size }, (_, c) => (
            <div key={`cell-${r}-${c}`} style={{
              position: 'absolute',
              left: c * cellSize, top: r * cellSize,
              width: cellSize, height: cellSize,
              background: cellBg,
              border: `1px solid ${lineCl}`,
              boxSizing: 'border-box',
            }} />
          ))
        )}

        {/* SVG paths + hints */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={boardPx} height={boardPx}>
          {pathElements}
        </svg>

        {/* Win flash */}
        {state.won && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(10,10,20,0.25)',
            animation: 'luminaFadeIn 0.4s ease',
          }}>
            <div style={{ fontSize: 36, animation: 'luminaBounce 0.5s ease' }}>✨</div>
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
        <button onClick={() => dispatch({ type: 'RESTART' })} style={ctrlBtn(isDark, false)} title="Restart">
          ↺ Restart
        </button>
      </div>
    </div>
  )
}

function ctrlBtn(dark: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '9px 18px',
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
