import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { getCommunityXpAll } from '@/lib/community-xp'
import Link from 'next/link'
import SidebarFunGame from './SidebarFunGame'
import SkillsPanelClient, { DEFAULT_CHAN_ORDER, type ChanKey } from './SkillsPanelClient'

export default async function SkillsPanel() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  const postCounts: Record<string, number> = {}
  const adminSkillLevels: Record<string, number> = {}
  const communityLevels: Record<string, number> = {}
  let channelOrder: ChanKey[] = DEFAULT_CHAN_ORDER

  try {
    const [postRows, adminUser, communityXpMap, orderSetting] = await Promise.all([
      prisma.post.groupBy({ by: ['skill'], _count: { id: true } }),
      prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { skills: { select: { skill: true, xp: true } } },
      }),
      getCommunityXpAll(),
      (prisma as any).siteSetting.findUnique({ where: { key: 'skills:order' } }),
    ])

    for (const r of postRows) postCounts[r.skill] = r._count.id
    if (adminUser?.skills) {
      for (const sk of adminUser.skills) adminSkillLevels[sk.skill] = xpToLevel(sk.xp)
    }
    for (const [skill, xp] of Object.entries(communityXpMap)) {
      communityLevels[skill] = xpToLevel(xp as number)
    }
    if (orderSetting?.value) {
      try {
        const parsed = JSON.parse(orderSetting.value)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out stale keys (e.g. HEALTH) that no longer exist in CHAN
          const filtered = parsed.filter((k: string) => DEFAULT_CHAN_ORDER.includes(k as ChanKey))
          if (filtered.length > 0) {
            // Append any newly-added keys not in the saved order
            const missing = DEFAULT_CHAN_ORDER.filter(k => !filtered.includes(k))
            channelOrder = [...filtered, ...missing]
          }
        }
      } catch { /* use default */ }
    }

  } catch { /* DB not ready */ }

  return (
    <aside
      className="w-[240px] flex-1 flex flex-col border-r"
      style={{ borderColor: '#5a3818', background: '#1a0e06' }}
    >
      <div className="castle-battlements" />

      {isAdmin && (
        <div className="px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#5a3818' }}>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[10px] transition-opacity hover:opacity-80"
            style={{ background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', color: '#c89b3c' }}
          >
            ⚙ Admin Panel
          </Link>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="py-2 shrink-0">
          <SkillsPanelClient
            initialOrder={channelOrder}
            communityLevels={communityLevels}
            postCounts={isAdmin ? postCounts : {}}
            isAdmin={isAdmin}
          />
        </div>
        <SidebarFunGame />
      </div>

    </aside>
  )
}
