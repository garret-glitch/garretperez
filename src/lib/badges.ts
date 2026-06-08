import { prisma } from './prisma'
import { xpToLevel } from './xp'

export const BADGE_META: Record<string, { icon: string; label: string }> = {
  FIRST_POST:       { icon: '📝', label: 'First Post' },
  LEVEL_10:         { icon: '⭐', label: 'Level 10' },
  LEVEL_50:         { icon: '🌟', label: 'Level 50' },
  GAME_WINNER:      { icon: '🏆', label: 'Game Winner' },
  DAILY_ADVENTURER: { icon: '🌅', label: 'Daily Adventurer' },
  CHEF:             { icon: '👨‍🍳', label: 'Chef' },
}

async function award(userId: string, badge: string) {
  try {
    await (prisma as any).userBadge.upsert({
      where: { userId_badge: { userId, badge } },
      create: { userId, badge },
      update: {},
    })
  } catch {
    // Badge already awarded or DB error — safe to ignore
  }
}

export async function checkBadges(
  userId: string,
  trigger: 'post' | 'reply' | 'game' | 'recipe' | 'login'
) {
  try {
    if (trigger === 'post') {
      const count = await prisma.post.count({ where: { userId } })
      if (count >= 1) await award(userId, 'FIRST_POST')
    }

    if (trigger === 'game') {
      await award(userId, 'GAME_WINNER')
    }

    if (trigger === 'recipe') {
      await award(userId, 'CHEF')
    }

    if (trigger === 'login') {
      await award(userId, 'DAILY_ADVENTURER')
    }

    // Check level milestones after any XP award
    const skills = await prisma.userSkill.findMany({ where: { userId } })
    const maxLevel = skills.reduce((max, s) => Math.max(max, xpToLevel(s.xp)), 0)
    if (maxLevel >= 10) await award(userId, 'LEVEL_10')
    if (maxLevel >= 50) await award(userId, 'LEVEL_50')
  } catch {
    // Non-critical — badges failing should never break the main action
  }
}
