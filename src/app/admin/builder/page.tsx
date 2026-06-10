import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BuilderClient from './BuilderClient'
import type { PageBlock, BlockLiveData } from '@/types/builder'

export const dynamic = 'force-dynamic'

export default async function BuilderPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/login')

  // Fetch blocks for the homepage
  const rawBlocks = await (prisma as any).pageBlock.findMany({
    where: { pageSlug: 'home' },
    orderBy: { order: 'asc' },
  })

  const blocks: PageBlock[] = rawBlocks.map((b: { id: string; pageSlug: string; type: string; order: number; colSpan: number; colStart: number; visible: boolean; config: string; styles: string }) => ({
    ...b,
    type: b.type as PageBlock['type'],
    colSpan: b.colSpan as 1 | 2 | 3,
    colStart: b.colStart as 1 | 2 | 3,
    config: (() => { try { return JSON.parse(b.config) } catch { return {} } })(),
    styles: (() => { try { return JSON.parse(b.styles) } catch { return {} } })(),
  }))

  // Live data for dynamic blocks
  const allSettings = await (prisma as any).siteSetting.findMany()
  const settingsMap: Record<string, string> = {}
  for (const s of allSettings) settingsMap[s.key] = s.value

  const recentPosts = await (prisma as any).post.findMany({
    orderBy: { createdAt: 'desc' }, take: 8,
    include: {
      user: { select: { username: true } },
      upvotes: { select: { userId: true } },
      replies: { select: { id: true } },
    },
  })

  const dbProjects = await (prisma as any).project.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }], take: 3,
  })

  const quests = await (prisma as any).quest.findMany({
    where: { active: true }, orderBy: { order: 'asc' },
  })

  const liveData: BlockLiveData = {
    dbProjects,
    recentPosts: recentPosts.map((p: { createdAt: Date } & Record<string, unknown>) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    hasSession: true,
    userBadges: [],
    quests,
    contactPhone: settingsMap.contact_phone ?? '(346) 604-1635',
    contactEmail: settingsMap.contact_email ?? 'gis.owner@gmail.com',
    contactLinkedin: settingsMap.contact_linkedin ?? 'garretperez',
  }

  return (
    <BuilderClient
      initialBlocks={blocks}
      liveData={liveData}
      showMigrate={blocks.length === 0}
    />
  )
}
