import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [totalUsers, totalPosts, totalRecipes, xpAgg, recentUsers, topPostersRaw, postsBySkillRaw, allUsers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.recipe.count(),
    prisma.userSkill.aggregate({ _sum: { xp: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, username: true, createdAt: true } }),
    prisma.user.findMany({
      orderBy: { posts: { _count: 'desc' } },
      take: 5,
      select: { username: true, _count: { select: { posts: true } } },
    }),
    prisma.post.groupBy({ by: ['skill'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
    prisma.user.findMany({ select: { username: true, skills: { select: { xp: true } } } }),
  ])

  const topPosters = topPostersRaw.map(u => ({ username: u.username, postCount: u._count.posts }))
  const postsBySkill = postsBySkillRaw.map((g: any) => ({ skill: g.skill, count: g._count.id }))
  const topXpUsers = allUsers
    .map(u => ({ username: u.username, totalXp: u.skills.reduce((s, sk) => s + sk.xp, 0) }))
    .sort((a, b) => b.totalXp - a.totalXp)
    .slice(0, 5)

  return NextResponse.json({
    totalUsers,
    totalPosts,
    totalRecipes,
    totalXp: xpAgg._sum.xp ?? 0,
    recentUsers,
    topPosters,
    postsBySkill,
    topXpUsers,
  })
}
