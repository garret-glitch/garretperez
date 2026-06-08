import { prisma } from './prisma'

export const BADGE_META: Record<string, { icon: string; label: string; desc: string }> = {
  FOUNDER:          { icon: '👑', label: 'Founder',         desc: 'One of the first members' },
  TOP_POSTER:       { icon: '📣', label: 'Top Poster',      desc: 'Posted 10+ times' },
  PROJECT_HELPER:   { icon: '🔧', label: 'Project Helper',  desc: 'Posted in Projects' },
  HALLOWEEN_CREW:   { icon: '🎃', label: 'Halloween Crew',  desc: 'Part of the haunted house community' },
  GARDENER:         { icon: '🌱', label: 'Gardener',        desc: 'Posted in Farming' },
  CRAFTSMAN:        { icon: '⚒️', label: 'Craftsman',       desc: 'Posted in Projects 3+ times' },
  GAME_WINNER:      { icon: '🏆', label: 'Game Winner',     desc: 'Won a mini-game' },
  DAILY_ADVENTURER: { icon: '🌅', label: 'Daily Adventurer',desc: 'Used the daily login bonus' },
  CHEF:             { icon: '👨‍🍳', label: 'Chef',            desc: 'Added a recipe' },
  FIRST_POST:       { icon: '📝', label: 'First Post',      desc: 'Made your first post' },
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
  trigger: 'post' | 'reply' | 'game' | 'recipe' | 'login' | 'visit'
) {
  try {
    if (trigger === 'post') {
      const count = await prisma.post.count({ where: { userId } })
      if (count >= 1) await award(userId, 'FIRST_POST')
      if (count >= 10) await award(userId, 'TOP_POSTER')

      const projectPost = await prisma.post.findFirst({ where: { userId, skill: 'PROJECTS' } })
      if (projectPost) await award(userId, 'PROJECT_HELPER')

      const projectCount = await prisma.post.count({ where: { userId, skill: 'PROJECTS' } })
      if (projectCount >= 3) await award(userId, 'CRAFTSMAN')

      const gardenPost = await prisma.post.findFirst({ where: { userId, skill: 'GARDENING' } })
      if (gardenPost) await award(userId, 'GARDENER')

      const communityPost = await prisma.post.findFirst({ where: { userId, skill: 'COMMUNITY' } })
      if (communityPost) await award(userId, 'HALLOWEEN_CREW')
    }

    if (trigger === 'game') await award(userId, 'GAME_WINNER')
    if (trigger === 'recipe') await award(userId, 'CHEF')
    if (trigger === 'login') await award(userId, 'DAILY_ADVENTURER')

    // Founder badge for early users (first 10)
    const userCount = await prisma.user.count()
    if (userCount <= 10) await award(userId, 'FOUNDER')
  } catch {
    // Non-critical
  }
}
