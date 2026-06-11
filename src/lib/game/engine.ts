import { Puzzle, PathMap, Cell } from './types'

export function cellKey(r: number, c: number) { return `${r},${c}` }
export function parseKey(k: string): Cell { const [r, c] = k.split(',').map(Number); return [r, c] }

/** Find which color occupies a given cell, or null if empty */
export function colorAt(paths: PathMap, row: number, col: number): string | null {
  for (const [color, path] of Object.entries(paths)) {
    if (path.some(([r, c]) => r === row && c === col)) return color
  }
  return null
}

/** True if cell is one of a color's two endpoints */
export function isEndpoint(puzzle: Puzzle, row: number, col: number): { color: string } | null {
  const dot = puzzle.dots.find(d => d.row === row && d.col === col)
  return dot ? { color: dot.color } : null
}

/** Two endpoints of a given color */
export function endpoints(puzzle: Puzzle, color: string): [Cell, Cell] {
  const dots = puzzle.dots.filter(d => d.color === color)
  return [[dots[0].row, dots[0].col], [dots[1].row, dots[1].col]]
}

/** Check if a path for a color "connects" both its endpoints */
export function isColorConnected(puzzle: Puzzle, paths: PathMap, color: string): boolean {
  const path = paths[color]
  if (!path || path.length < 2) return false
  const [e1, e2] = endpoints(puzzle, color)
  const s = path[0], t = path[path.length - 1]
  return (s[0]===e1[0] && s[1]===e1[1] && t[0]===e2[0] && t[1]===e2[1]) ||
         (s[0]===e2[0] && s[1]===e2[1] && t[0]===e1[0] && t[1]===e1[1])
}

/** Count cells covered by all paths */
export function coveredCount(paths: PathMap): number {
  const s = new Set<string>()
  for (const path of Object.values(paths)) {
    for (const [r, c] of path) s.add(cellKey(r, c))
  }
  return s.size
}

/** Win: all cells filled AND all colors connected */
export function checkWin(puzzle: Puzzle, paths: PathMap): boolean {
  if (coveredCount(paths) !== puzzle.size * puzzle.size) return false
  const colors = Array.from(new Set(puzzle.dots.map(d => d.color)))
  return colors.every(color => isColorConnected(puzzle, paths, color))
}

/** Percentage of cells covered */
export function fillPercent(puzzle: Puzzle, paths: PathMap): number {
  return Math.round((coveredCount(paths) / (puzzle.size * puzzle.size)) * 100)
}

/** Number of colors that are fully connected */
export function connectedCount(puzzle: Puzzle, paths: PathMap): number {
  const colors = Array.from(new Set(puzzle.dots.map(d => d.color)))
  return colors.filter(c => isColorConnected(puzzle, paths, c)).length
}

export function totalColors(puzzle: Puzzle): number {
  return new Set(puzzle.dots.map(d => d.color)).size
}

/** Are two cells orthogonally adjacent? */
export function adjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}

/**
 * Core path-drawing logic.
 * Returns the new PathMap after attempting to extend `activeColor`'s path to cell (row, col).
 */
export function extendPath(
  puzzle: Puzzle,
  paths: PathMap,
  activeColor: string,
  row: number,
  col: number
): PathMap {
  const currentPath = paths[activeColor] ?? []
  if (currentPath.length === 0) return paths

  const lastCell = currentPath[currentPath.length - 1]
  const targetCell: Cell = [row, col]

  // Same cell: no-op
  if (lastCell[0] === row && lastCell[1] === col) return paths

  // Must be adjacent to last cell
  if (!adjacent(lastCell, targetCell)) return paths

  // Target is another color's ENDPOINT: can't enter
  const ep = isEndpoint(puzzle, row, col)
  if (ep && ep.color !== activeColor) return paths

  // Check if target is already in current path → backtrack
  const backIdx = currentPath.findIndex(([r, c]) => r === row && c === col)
  if (backIdx !== -1) {
    return {
      ...paths,
      [activeColor]: currentPath.slice(0, backIdx + 1),
    }
  }

  // Check if target has another color → clear that color
  const newPaths = { ...paths }
  for (const [color, path] of Object.entries(paths)) {
    if (color === activeColor) continue
    if (path.some(([r, c]) => r === row && c === col)) {
      newPaths[color] = []
    }
  }

  // Extend
  newPaths[activeColor] = [...currentPath, targetCell]
  return newPaths
}

/**
 * Start drawing: set activeColor's path to just the starting cell.
 * Returns [newPaths, startedColor] — startedColor is the color being drawn.
 */
export function startDraw(
  puzzle: Puzzle,
  paths: PathMap,
  row: number,
  col: number
): { newPaths: PathMap; activeColor: string | null } {
  // Dot → start fresh from that dot
  const ep = isEndpoint(puzzle, row, col)
  if (ep) {
    const newPaths: PathMap = { ...paths, [ep.color]: [[row, col]] }
    return { newPaths, activeColor: ep.color }
  }

  // Middle of an existing path → retrace from that cell
  for (const [color, path] of Object.entries(paths)) {
    const idx = path.findIndex(([r, c]) => r === row && c === col)
    if (idx !== -1) {
      return {
        newPaths: { ...paths, [color]: path.slice(0, idx + 1) },
        activeColor: color,
      }
    }
  }

  return { newPaths: paths, activeColor: null }
}

/** Build SVG path "d" attribute with rounded corners for a flow path */
export function buildSVGPath(cells: Cell[], cellSize: number): string {
  if (cells.length < 2) return ''
  const R = cellSize * 0.38

  function center(r: number, c: number) {
    return { x: c * cellSize + cellSize / 2, y: r * cellSize + cellSize / 2 }
  }

  const pts = cells.map(([r, c]) => center(r, c))

  let d = `M ${pts[0].x} ${pts[0].y}`

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const next = i < pts.length - 1 ? pts[i + 1] : null

    if (!next) {
      d += ` L ${curr.x} ${curr.y}`
    } else {
      const dx1 = curr.x - prev.x
      const dy1 = curr.y - prev.y
      const dx2 = next.x - curr.x
      const dy2 = next.y - curr.y
      const turning = dx1 !== dx2 || dy1 !== dy2

      if (turning) {
        const len1 = Math.hypot(dx1, dy1) || 1
        const len2 = Math.hypot(dx2, dy2) || 1
        const r = Math.min(R, len1 * 0.45, len2 * 0.45)
        const bx = curr.x - (dx1 / len1) * r
        const by = curr.y - (dy1 / len1) * r
        const ax = curr.x + (dx2 / len2) * r
        const ay = curr.y + (dy2 / len2) * r
        d += ` L ${bx} ${by} Q ${curr.x} ${curr.y} ${ax} ${ay}`
      } else {
        d += ` L ${curr.x} ${curr.y}`
      }
    }
  }

  return d
}
