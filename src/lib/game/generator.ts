import { Puzzle, Dot, Cell, Difficulty, COLOR_KEYS, ColorKey } from './types'

// ── Seeded random ─────────────────────────────────────────────────────────────

export class RNG {
  private s: number
  constructor(seed: number) {
    this.s = (seed ^ 0x9e3779b9) >>> 0
    if (this.s === 0) this.s = 1
    // warm up
    for (let i = 0; i < 8; i++) this.next()
  }
  next(): number {
    let s = this.s
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    this.s = s >>> 0
    return (s >>> 0) / 0x100000000
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1))
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
}

// ── Hamiltonian path via Warnsdorff's heuristic ───────────────────────────────

function hamiltonianPath(size: number, rng: RNG): Cell[] | null {
  const n = size * size
  const visited = new Uint8Array(n)

  function idx(r: number, c: number) { return r * size + c }
  function neighbors(r: number, c: number): Cell[] {
    return ([ [r-1,c],[r+1,c],[r,c-1],[r,c+1] ] as Cell[])
      .filter(([nr,nc]) => nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[idx(nr,nc)])
  }

  const startR = rng.int(0, size - 1)
  const startC = rng.int(0, size - 1)

  let r = startR, c = startC
  const path: Cell[] = []

  while (path.length < n) {
    visited[idx(r, c)] = 1
    path.push([r, c])

    const nbrs = neighbors(r, c)
    if (nbrs.length === 0) break

    // Warnsdorff: prefer cells with fewest onward neighbors; random tiebreak
    const scored = nbrs.map(([nr, nc]) => ({
      pos: [nr, nc] as Cell,
      w: neighbors(nr, nc).length,
      t: rng.next(),
    }))
    scored.sort((a, b) => a.w !== b.w ? a.w - b.w : a.t - b.t)
    ;[r, c] = scored[0].pos
  }

  return path.length === n ? path : null
}

// Serpentine fallback (always works, less interesting)
function serpentine(size: number): Cell[] {
  const path: Cell[] = []
  for (let row = 0; row < size; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < size; col++) path.push([row, col])
    } else {
      for (let col = size - 1; col >= 0; col--) path.push([row, col])
    }
  }
  return path
}

function getPath(size: number, rng: RNG): Cell[] {
  for (let i = 0; i < 50; i++) {
    const p = hamiltonianPath(size, rng)
    if (p) return p
  }
  return serpentine(size)
}

// ── Puzzle generation ─────────────────────────────────────────────────────────

function difficultyParams(diff: Difficulty): { size: number; numColors: number } {
  switch (diff) {
    case 'beginner': return { size: 5, numColors: 3 }
    case 'easy':     return { size: 6, numColors: 4 }
    case 'medium':   return { size: 7, numColors: 5 }
    case 'hard':     return { size: 9, numColors: 7 }
    case 'expert':   return { size: 10, numColors: 9 }
  }
}

export function generatePuzzle(diff: Difficulty, seed: number): Puzzle {
  const rng = new RNG(seed)
  const { size, numColors } = difficultyParams(diff)
  const path = getPath(size, rng)
  const n = path.length
  const minSeg = Math.max(3, Math.floor(n / numColors * 0.4))

  // Random cut points
  const cuts: number[] = []
  for (let i = 1; i < numColors; i++) {
    const base = Math.floor(n * i / numColors)
    const spread = Math.floor(n / numColors * 0.25)
    let cut = base + rng.int(-spread, spread)
    cut = Math.max(
      (cuts.length > 0 ? cuts[cuts.length - 1] : 0) + minSeg,
      Math.min(n - (numColors - i) * minSeg, cut)
    )
    cuts.push(cut)
  }

  // Build segments
  const colorOrder = rng.shuffle([...COLOR_KEYS].slice(0, numColors)) as ColorKey[]
  const solution: Record<string, Cell[]> = {}
  const dots: Dot[] = []

  let prev = 0
  for (let i = 0; i < numColors; i++) {
    const end = i < numColors - 1 ? cuts[i] : n
    const seg = path.slice(prev, end)
    const color = colorOrder[i]
    solution[color] = seg
    dots.push({ color, row: seg[0][0], col: seg[0][1] })
    dots.push({ color, row: seg[seg.length - 1][0], col: seg[seg.length - 1][1] })
    prev = end
  }

  return { id: `${diff}-${seed}`, size, dots, difficulty: diff, solution }
}

// ── Daily puzzle ──────────────────────────────────────────────────────────────

export function getDailySeed(): number {
  const d = new Date()
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function getDailyPuzzle(): Puzzle {
  const seed = getDailySeed()
  // Rotate difficulty by day
  const diffs: Difficulty[] = ['easy', 'medium', 'medium', 'hard', 'medium', 'easy', 'hard']
  const diff = diffs[new Date().getDay()]
  return generatePuzzle(diff, seed)
}

// ── Classic puzzle sets ───────────────────────────────────────────────────────

export function getClassicPuzzles(diff: Difficulty, count = 30): Puzzle[] {
  return Array.from({ length: count }, (_, i) =>
    generatePuzzle(diff, i * 997 + 1)
  )
}

export function getChallengePuzzles(count = 20): Puzzle[] {
  const diffs: Difficulty[] = ['hard', 'expert', 'expert', 'hard', 'expert']
  return Array.from({ length: count }, (_, i) =>
    generatePuzzle(diffs[i % diffs.length], i * 1337 + 42)
  )
}

export function getEndlessPuzzle(index: number, baseDiff: Difficulty = 'medium'): Puzzle {
  // Slowly increase difficulty
  const diffs: Difficulty[] = ['beginner', 'easy', 'medium', 'hard', 'expert']
  const diffIdx = Math.min(diffs.indexOf(baseDiff) + Math.floor(index / 5), diffs.length - 1)
  return generatePuzzle(diffs[diffIdx], index * 521 + 7)
}
