// ── XP amounts — defaults; admin can override via SiteSetting key `xp:EVENT_TYPE` ──
export const XP_DEFAULTS = {
  DAILY_LOGIN:    10,
  TAB_CLICK:       2,
  SKILL_OPEN:      5,
  POST_VIEW:       1,
  POST_CREATE:    50,
  COMMENT:        20,
  RECIPE_ADD:     50,
  PHOTO_UPLOAD:   25,
  MINIGAME_PLAY:  10,
  MINIGAME_WIN:   25,
  PROJECT_START:  50,
  PROJECT_UPDATE: 25,
  MILESTONE:     100,
  TIME_SPENT:     10,
} as const

export type XpEventType = keyof typeof XP_DEFAULTS

// Human-readable labels for admin UI
export const XP_LABELS: Record<XpEventType, string> = {
  DAILY_LOGIN:    'Daily Login',
  TAB_CLICK:      'Main Tab Click',
  SKILL_OPEN:     'Open Skill Tab',
  POST_VIEW:      'View Post',
  POST_CREATE:    'Create Post',
  COMMENT:        'Comment / Reply',
  RECIPE_ADD:     'Add Recipe',
  PHOTO_UPLOAD:   'Upload Photo',
  MINIGAME_PLAY:  'Play Mini-Game',
  MINIGAME_WIN:   'Win Mini-Game',
  PROJECT_START:  'Start Project',
  PROJECT_UPDATE: 'Update Project',
  MILESTONE:      'Complete Milestone',
  TIME_SPENT:     '5 Min on Site',
}

// Per-day COUNT limits for high-frequency events (undefined = no count limit)
export const XP_COUNT_LIMITS: Partial<Record<XpEventType, number>> = {
  POST_VIEW:     20,
  MINIGAME_PLAY:  3,
}

// These events use (type + key) uniqueness per day — once per unique key
export const XP_UNIQUE_KEY_EVENTS = new Set<XpEventType>([
  'TAB_CLICK',
  'TIME_SPENT',
])

// ── Legacy named exports (backward-compat with existing routes) ────────────────
export const XP_PER_POST    = XP_DEFAULTS.POST_CREATE
export const XP_PER_REPLY   = XP_DEFAULTS.COMMENT
export const XP_PER_WIN     = XP_DEFAULTS.MINIGAME_WIN
export const XP_PER_LOGIN   = XP_DEFAULTS.DAILY_LOGIN
export const XP_PER_VISIT   = XP_DEFAULTS.SKILL_OPEN
export const XP_PER_UPVOTE_RECEIVED = 15
export const MAX_LEVEL = 9999

// ── Level math ─────────────────────────────────────────────────────────────────
export function xpToLevel(xp: number): number {
  if (xp <= 0) return 1
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1
}

export function levelToXp(level: number): number {
  return Math.floor(100 * Math.pow(level - 1, 1.5))
}

export function xpProgress(xp: number): {
  level: number
  currentXp: number
  neededXp: number
  percent: number
} {
  const level = xpToLevel(xp)
  const thisLevelXp = levelToXp(level)
  const nextLevelXp = levelToXp(level + 1)
  const currentXp = xp - thisLevelXp
  const neededXp = nextLevelXp - thisLevelXp
  return {
    level,
    currentXp,
    neededXp,
    percent: Math.min(100, Math.floor((currentXp / neededXp) * 100)),
  }
}
