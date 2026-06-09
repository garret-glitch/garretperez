import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'
import SidebarFunGame from './SidebarFunGame'

const GUILD_CHANNELS = [
  { icon: '❤️', label: 'Health',    dbEnum: 'HEALTH',    href: '/skills/health',    color: '#7a2020' },
  { icon: '⚒️', label: 'Projects',  dbEnum: 'PROJECTS',  href: '/skills/projects',  color: '#3a3020' },
  { icon: '💼', label: 'Business',  dbEnum: 'BUSINESS',  href: '/skills/business',  color: '#2a3a18' },
  { icon: '👥', label: 'Community', dbEnum: 'COMMUNITY', href: '/skills/community', color: '#2a3060' },
  { icon: '🎣', label: 'Fishing',   dbEnum: 'FISHING',   href: '/skills/fishing',   color: '#1a4a5a' },
  { icon: '🍳', label: 'Cooking',   dbEnum: 'FOOD',      href: '/skills/food',      color: '#6a3010' },
  { icon: '🌱', label: 'Gardening', dbEnum: 'GARDENING', href: '/skills/gardening', color: '#1e4a1e' },
  { icon: '🗺️', label: 'Adventure', dbEnum: 'TRAVEL',    href: '/skills/travel',    color: '#5a4010' },
]

export default async function SkillsPanel() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  let userBadges: string[] = []
  const postCounts: Record<string, number> = {}
  const adminSkillLevels: Record<string, number> = {}

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

    if (session?.user?.id) {
      const badges = await (prisma as any).userBadge.findMany({
        where: { userId: session.user.id },
        select: { badge: true },
      })
      userBadges = badges.map((b: { badge: string }) => b.badge)
    }
  } catch { /* DB not ready */ }

  return (
    <aside className="w-[240px] shrink-0 flex flex-col border-r"
      style={{ borderColor: '#5a3818', background: '#1a0e06', minHeight: '100vh' }}>

      {/* ── Battlements ───────────────────────────────── */}
      <div className="castle-battlements" />

      {/* ── Admin link (only when admin) ──────────────── */}
      {isAdmin && (
        <div className="px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#5a3818' }}>
          <Link href="/admin"
            className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[6px] transition-opacity hover:opacity-80"
            style={{ background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', color: '#c89b3c' }}>
            ⚙ Admin Panel
          </Link>
        </div>
      )}

      {/* ── Channels + fun zone ───────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="py-2 shrink-0">

          {/* Home button */}
          <Link href="/" className="guild-channel mb-1">
            <span className="shrink-0 flex items-center justify-center text-base rounded-lg"
              style={{ width: 28, height: 28, background: '#3a2010', borderRadius: 8 }}>🏠</span>
            <div className="flex-1 min-w-0">
              <div className="text-[7px] truncate" style={{ color: '#f0d898' }}>Home</div>
            </div>
          </Link>

          <div className="px-4 pb-1.5 pt-1">
            <span className="text-[6px] uppercase tracking-widest" style={{ color: '#a07848' }}>⚔ Communities</span>
          </div>

          {/* Quests */}
          <Link href="/quest-board" className="guild-channel">
            <span className="shrink-0 flex items-center justify-center text-base rounded-lg"
              style={{ width: 28, height: 28, background: '#2a2010', borderRadius: 8 }}>📋</span>
            <div className="flex-1 min-w-0">
              <div className="text-[7px] truncate" style={{ color: '#f0d898' }}>Quests</div>
            </div>
            <div className="text-[6px] font-bold" style={{ color: '#c89b3c' }}>4</div>
          </Link>

          {/* Skill channels */}
          {GUILD_CHANNELS.map(ch => (
            <Link key={ch.href} href={ch.href} className="guild-channel">
              <span className="shrink-0 flex items-center justify-center text-base"
                style={{ width: 28, height: 28, background: ch.color, borderRadius: 8 }}>{ch.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] truncate" style={{ color: '#f0d898' }}>{ch.label}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[6px] font-bold" style={{ color: '#c89b3c' }}>{adminSkillLevels[ch.dbEnum] ?? 1}</div>
                {(postCounts[ch.dbEnum] ?? 0) > 0 && (
                  <div className="text-[5px]" style={{ color: '#a07848' }}>{postCounts[ch.dbEnum]}p</div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Fun zone */}
        <SidebarFunGame />
      </div>

      {/* ── Badges — only when logged in ──────────────── */}
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
