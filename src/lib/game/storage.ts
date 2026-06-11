import { GameSettings, DEFAULT_SETTINGS } from './types'

const SETTINGS_KEY = 'lumina_settings'
const PROGRESS_KEY = 'lumina_progress'
const ENDLESS_KEY  = 'lumina_endless'

export interface Progress {
  completed: string[]      // puzzle IDs
  bestTimes: Record<string, number>  // puzzleId → seconds
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
