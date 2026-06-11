import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BuilderClient from './BuilderClient'
import type { PageBlock, BlockLiveData } from '@/types/builder'
import { xpToLevel, xpProgress } from '@/lib/xp'

export const dynamic = 'force-dynamic'

export default async function BuilderPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  // Fetch blocks for the homepage
  const rawBlocks = await (prisma as any).pageBlock.findMany({
    where: { pageSlug: 'home' },
    orderBy: { order: 'asc' },
  })

  type RawBlock = { id: string; pageSlug: string; type: string; order: number; colSpan: number; colStart: number; visible: boolean; config: string; styles: string }
  const parseBlocks = (rows: RawBlock[]): PageBlock[] => rows.map(b => ({
    ...b,
    type: b.type as PageBlock['type'],
    colSpan: b.colSpan as 1 | 2 | 3,
    colStart: b.colStart as 1 | 2 | 3,
    config: (() => { try { return JSON.parse(b.config) } catch { return {} } })(),
    styles: (() => { try { return JSON.parse(b.styles) } catch { return {} } })(),
  }))

  let blocks: PageBlock[] = parseBlocks(rawBlocks)

  // Live data for dynamic blocks
  const allSettings = await (prisma as any).siteSetting.findMany()
  const settingsMap: Record<string, string> = {}
  for (const s of allSettings) settingsMap[s.key] = s.value

  // Auto-create the hero block if it doesn't exist yet
  if (!blocks.some(b => b.type === 'hero')) {
    try {
      await (prisma as any).pageBlock.create({
        data: {
          pageSlug: 'home',
          type: 'hero',
          order: -1,
          colSpan: 3,
          colStart: 1,
          visible: true,
          config: JSON.stringify({
            heroTitle:       settingsMap.hero_title       ?? 'Sales Supervisor · Builder · Family Man',
            heroLocation:    settingsMap.hero_location    ?? 'Houston, TX',
            contactPhone:    settingsMap.contact_phone    ?? '(346) 604-1635',
            contactEmail:    settingsMap.contact_email    ?? 'gis.owner@gmail.com',
            contactLinkedin: settingsMap.contact_linkedin ?? 'garretperez',
          }),
          styles: JSON.stringify({}),
        },
      })
      const refreshed = await (prisma as any).pageBlock.findMany({
        where: { pageSlug: 'home' },
        orderBy: { order: 'asc' },
      })
      blocks = parseBlocks(refreshed)
    } catch { /* already exists or race condition */ }
  }

  let recentPosts: Record<string, unknown>[] = []
  try {
    recentPosts = await (prisma as any).post.findMany({
      orderBy: { createdAt: 'desc' }, take: 8,
      include: {
        user: { select: { username: true } },
        upvotes: { select: { userId: true } },
        replies: { select: { id: true } },
      },
    })
  } catch { /* relation tables may not exist yet */ }

  let dbProjects: Record<string, unknown>[] = []
  try {
    dbProjects = await (prisma as any).project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], take: 3,
    })
  } catch { /* project table may not exist yet */ }

  let quests: Record<string, unknown>[] = []
  try {
    quests = await (prisma as any).quest.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    })
  } catch { /* quest table may not exist yet */ }

  const totalMembers = await prisma.user.count()
  const totalPosts = await prisma.post.count()
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { skills: { select: { xp: true } } },
  })
  const garretTotalXp = adminUser?.skills?.reduce((s: number, sk: { xp: number }) => s + sk.xp, 0) ?? 0
  const garretTotalLevel = adminUser?.skills?.reduce((s: number, sk: { xp: number }) => s + xpToLevel(sk.xp), 0) ?? 9

  const liveData: BlockLiveData = {
    dbProjects,
    recentPosts: recentPosts.map((p: { createdAt: Date } & Record<string, unknown>) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    hasSession: true,
    userBadges: [],
    contactPhone: settingsMap.contact_phone ?? '(346) 604-1635',
    contactEmail: settingsMap.contact_email ?? 'gis.owner@gmail.com',
    contactLinkedin: settingsMap.contact_linkedin ?? 'garretperez',
    quests,
    heroHeadshot: settingsMap.headshot ?? '',
    heroTotalMembers: totalMembers,
    heroTotalPosts: totalPosts,
    heroGarretLevel: garretTotalLevel,
    heroGarretXpBar: xpProgress(garretTotalXp),
  }

  return (
    <BuilderClient
      initialBlocks={blocks}
      liveData={liveData}
      showMigrate={blocks.length === 0}
    />
  )
}
