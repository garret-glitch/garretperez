import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'
import SidebarFunGame from './SidebarFunGame'
import SkillsPanelClient, { DEFAULT_CHAN_ORDER, type ChanKey } from './SkillsPanelClient'

export default async function SkillsPanel() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  let userBadges: string[] = []
  const postCounts: Record<string, number> = {}
  const adminSkillLevels: Record<string, number> = {}
  let channelOrder: ChanKey[] = DEFAULT_CHAN_ORDER

  try {
    const rows = await prisma.post.groupBy({ by: ['skill'], _count: { id: true } })
    for (const r of rows) postCounts[r.skill] = r._count.id

    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { skills: { select: { skill: true, xp: true } } },
    })
    if (adminUser?.skills) {
      for (const sk of adminUser.skills) {
        adminSkillLevels[sk.skill] = xpToLevel(sk.xp)
      }
    }

    const orderSetting = await (prisma as any).siteSetting.findUnique({
      where: { key: 'skills:order' },
    })
    if (orderSetting?.value) {
      try {
        const parsed = JSON.parse(orderSetting.value)
        if (Array.isArray(parsed) && parsed.length > 0) channelOrder = parsed
      } catch { /* use default */ }
    }

    if (session?.user?.id) {
      const badges = await (prisma as any).userBadge.findMany({
        where: { userId: session.user.id },
        select: { badge: true },
      })
      userBadges = badges.map((b: { badge: string }) => b.badge)
    }
  } catch { /* DB not ready */ }

  return (
    <aside
      className="w-[240px] shrink-0 flex flex-col border-r"
      style={{ borderColor: '#5a3818', background: '#1a0e06', minHeight: '100vh' }}
    >
      <div className="castle-battlements" />

      {isAdmin && (
        <div className="px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#5a3818' }}>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[6px] transition-opacity hover:opacity-80"
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
            levels={adminSkillLevels}
            postCounts={isAdmin ? postCounts : {}}
            isAdmin={isAdmin}
          />
        </div>
        <SidebarFunGame />
      </div>

      {session?.user && userBadges.length > 0 && (
        <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: '#5a3818' }}>
          <div className="flex flex-wrap gap-1">
            {userBadges.map(b => {
              const m = BADGE_META[b]
              return m ? <span key={b} title={m.label} className="text-sm cursor-default">{m.icon}</span> : null
            })}
          </div>
        </div>
      )}
    </aside>
  )
}
