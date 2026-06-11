import { prisma } from './prisma'
import { SkillType } from '@prisma/client'

export async function getCommunityXpAll(): Promise<Record<string, number>> {
  const rows = await prisma.userSkill.groupBy({
    by: ['skill'],
    _sum: { xp: true },
  })
  const result: Record<string, number> = {}
  for (const row of rows) result[row.skill] = row._sum.xp ?? 0
  return result
}

export async function getCommunityXpForSkill(skill: SkillType): Promise<{ xp: number; memberCount: number }> {
  const agg = await prisma.userSkill.aggregate({
    where: { skill, xp: { gt: 0 } },
    _sum: { xp: true },
    _count: { userId: true },
  })
  return { xp: agg._sum.xp ?? 0, memberCount: agg._count.userId }
}
