import { GameSettings, DEFAULT_SETTINGS, HighScoreEntry } from './types'

const SETTINGS_KEY   = 'lumina_settings'
const PROGRESS_KEY   = 'lumina_progress'
const ENDLESS_KEY    = 'lumina_endless'
const HIGHSCORES_KEY = 'lumina_highscores'
const TUTORIAL_KEY   = 'lumina_tutorial_seen'
const NAME_KEY       = 'lumina_player_name'

export interface Progress {
  completed: string[]
  bestTimes: Record<string, number>
}

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: GameSettings) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { completed: [], bestTimes: {} }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : { completed: [], bestTimes: {} }
  } catch {
    return { completed: [], bestTimes: {} }
  }
}

export function saveProgress(p: Progress) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
}

export function markCompleted(puzzleId: string, seconds: number) {
  const p = loadProgress()
  if (!p.completed.includes(puzzleId)) p.completed.push(puzzleId)
  if (!p.bestTimes[puzzleId] || seconds < p.bestTimes[puzzleId]) {
    p.bestTimes[puzzleId] = seconds
  }
  saveProgress(p)
}

export function isCompleted(puzzleId: string): boolean {
  return loadProgress().completed.includes(puzzleId)
}

export function loadEndlessIndex(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(ENDLESS_KEY) || '0', 10)
}

export function saveEndlessIndex(n: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENDLESS_KEY, String(n))
}

// ── High Scores ────────────────────────────────────────────────────────────────

export function loadHighScores(): HighScoreEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HIGHSCORES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function _saveHighScores(scores: HighScoreEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HIGHSCORES_KEY, JSON.stringify(scores.slice(0, 10)))
}

export function addHighScore(entry: HighScoreEntry): number {
  const scores = loadHighScores()
  scores.push(entry)
  scores.sort((a, b) => b.score - a.score)
  const rank = scores.indexOf(entry) + 1
  _saveHighScores(scores)
  return rank
}

export function isHighScore(score: number): boolean {
  if (score <= 0) return false
  const scores = loadHighScores()
  return scores.length < 10 || score > (scores[scores.length - 1]?.score ?? 0)
}

// ── Tutorial ───────────────────────────────────────────────────────────────────

export function hasTutorialBeenShown(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(TUTORIAL_KEY) === '1'
}

export function markTutorialShown() {
  if (typeof window === 'undefined') return
  localStorage.setItem(TUTORIAL_KEY, '1')
}

// ── Player name ────────────────────────────────────────────────────────────────

export function loadPlayerName(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(NAME_KEY) || ''
}

export function savePlayerName(name: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(NAME_KEY, name)
}
