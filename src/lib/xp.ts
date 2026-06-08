export const XP_PER_POST = 10
export const XP_PER_REPLY = 5
export const XP_PER_WIN = 20
export const XP_PER_LOGIN = 5
export const MAX_LEVEL = 9999

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
