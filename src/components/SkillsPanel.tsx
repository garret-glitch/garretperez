import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'

const GUILD_CHANNELS = [
  { icon: '❤️', label: 'Health',    dbEnum: 'HEALTH',    level: 72, href: '/skills/health',    sub: 'Wellness & Fitness' },
  { icon: '⚒️', label: 'Projects',  dbEnum: 'PROJECTS',  level: 18, href: '/skills/projects',  sub: 'Building & Creating' },
  { icon: '🎣', label: 'Fishing',   dbEnum: 'FISHING',   level: 55, href: '/skills/fishing',   sub: 'Outdoor Adventures' },
  { icon: '💼', label: 'Business',  dbEnum: 'BUSINESS',  level: 31, href: '/skills/business',  sub: 'Wine Sales & Strategy' },
  { icon: '🍳', label: 'Cooking',   dbEnum: 'FOOD',      level: 65, href: '/skills/food',      sub: 'Recipes & Pairings' },
  { icon: '👥', label: 'Community', dbEnum: 'COMMUNITY', level: 80, href: '/skills/community', sub: 'Group Discussions' },
  { icon: '🌱', label: 'Farming',   dbEnum: 'GARDENING', level: 45, href: '/skills/gardening', sub: 'Garden & Nature' },
  { icon: '🎮', label: 'Fun',       dbEnum: 'FUN',       level: 88, href: '/skills/fun',       sub: 'Games & Entertainment' },
  { icon: '🗺️', label: 'Travel',    dbEnum: 'TRAVEL',    level: 65, href: '/skills/travel',    sub: 'Adventures & Places' },
]

const GARRET_TOTAL = GUILD_CHANNELS.reduce((s, c) => s + c.level, 0)

export default async function SkillsPanel() {
  const session = await auth()

  let totalXp = 0
  let userBadges: string[] = []
  const postCounts: Record<string, number> = {}

  try {
    // Post count per skill for channel stats
    const rows = await prisma.post.groupBy({ by: ['skill'], _count: { id: true } })
    for (const r of rows) postCounts[r.skill] = r._count.id

    if (session?.user?.id) {
      const skills = await prisma.userSkill.findMany({ where: { userId: session.user.id } })
      totalXp = skills.reduce((s, sk) => s + sk.xp, 0)
      const badges = await (prisma as any).userBadge.findMany({
        where: { userId: session.user.id },
        select: { badge: true },
      })
      userBadges = badges.map((b: { badge: string }) => b.badge)
    }
  } catch { /* DB not ready */ }

  const userLevel = xpToLevel(totalXp)

  return (
    <aside className="w-[240px] shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border-dim)', background: '#0f0f18', minHeight: 'calc(100vh - 41px)' }}>

      {/* Garret profile block */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-dim)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
            GP
          </div>
          <div>
            <div className="text-[8px] font-bold" style={{ color: 'var(--text-1)' }}>Garret Perez</div>
            <div className="text-[6px] mt-0.5" style={{ color: 'var(--gold)' }}>Total Level {GARRET_TOTAL}</div>
          </div>
        </div>
        <Link href="/" className="guild-channel rounded-md text-[7px] px-2 py-1.5 flex items-center gap-2" style={{ borderLeft: 'none', background: 'var(--bg-elevated)', color: 'var(--text-2)' }}>
          <span>🏠</span><span>Home</span>
        </Link>
      </div>

      {/* Guild channels */}
      <div className="flex-1 py-2">
        <div className="px-4 pb-1.5 pt-1">
          <span className="text-[6px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Communities</span>
        </div>
        {GUILD_CHANNELS.map(ch => (
          <Link key={ch.href} href={ch.href} className="guild-channel">
            <span className="text-base shrink-0 w-6 text-center">{ch.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[7px] truncate" style={{ color: 'var(--text-1)' }}>{ch.label}</div>
              <div className="text-[5.5px] truncate" style={{ color: 'var(--text-3)' }}>{ch.sub}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[6px] font-bold" style={{ color: 'var(--gold)' }}>{ch.level}</div>
              {(postCounts[ch.dbEnum] ?? 0) > 0 && (
                <div className="text-[5px]" style={{ color: 'var(--text-3)' }}>{postCounts[ch.dbEnum]}p</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* User level block */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border-dim)' }}>
        {session?.user ? (
          <div className="text-center">
            <div className="text-[6px] mb-1" style={{ color: 'var(--text-3)' }}>{session.user.name}</div>
            <div className="text-[20px] font-bold leading-none" style={{ color: 'var(--gold)' }}>{userLevel}</div>
            <div className="text-[5px] mt-0.5 mb-2" style={{ color: 'var(--text-3)' }}>{totalXp.toLocaleString()} XP</div>
            {userBadges.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {userBadges.map(b => {
                  const m = BADGE_META[b]
                  return m ? <span key={b} title={m.label} className="text-sm cursor-default">{m.icon}</span> : null
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="text-[6px] leading-relaxed mb-2" style={{ color: 'var(--text-3)' }}>Join to earn XP</div>
            <div className="flex gap-1">
              <Link href="/register" className="osrs-btn flex-1 text-[6px] py-1">Join</Link>
              <Link href="/login" className="osrs-btn flex-1 text-[6px] py-1">Login</Link>
            </div>
          </div>
        )}

        {/* Quests link */}
        <Link href="/quest-board" className="guild-channel mt-2 rounded-md text-[7px] px-2 py-1.5 flex items-center gap-2" style={{ borderLeft: 'none', background: 'var(--bg-elevated)', color: 'var(--text-2)' }}>
          <span>📋</span><span>Quest Board</span>
        </Link>
      </div>
    </aside>
  )
}
