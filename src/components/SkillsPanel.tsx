import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'
import SidebarFunGame from './SidebarFunGame'
import SidebarLogoutButton from './SidebarLogoutButton'

const GUILD_CHANNELS = [
  { icon: '❤️', label: 'Health',    dbEnum: 'HEALTH',    level: 72, href: '/skills/health',    sub: 'Wellness & Fitness' },
  { icon: '⚒️', label: 'Projects',  dbEnum: 'PROJECTS',  level: 18, href: '/skills/projects',  sub: 'Building & Creating' },
  { icon: '💼', label: 'Business',  dbEnum: 'BUSINESS',  level: 31, href: '/skills/business',  sub: 'Wine Sales & Strategy' },
  { icon: '👥', label: 'Community', dbEnum: 'COMMUNITY', level: 80, href: '/skills/community', sub: 'Group Discussions' },
  { icon: '🎣', label: 'Fishing',   dbEnum: 'FISHING',   level: 55, href: '/skills/fishing',   sub: 'Outdoor Adventures' },
  { icon: '🍳', label: 'Cooking',   dbEnum: 'FOOD',      level: 65, href: '/skills/food',      sub: 'Recipes & Pairings' },
  { icon: '🌱', label: 'Farming',   dbEnum: 'GARDENING', level: 45, href: '/skills/gardening', sub: 'Garden & Nature' },
  { icon: '🗺️', label: 'Adventure', dbEnum: 'TRAVEL',    level: 65, href: '/skills/travel',    sub: 'Adventures & Places' },
]


export default async function SkillsPanel() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  let totalXp = 0
  let userBadges: string[] = []
  const postCounts: Record<string, number> = {}

  try {
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
  const initials = session?.user?.name?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <aside className="w-[240px] shrink-0 flex flex-col border-r"
      style={{ borderColor: 'var(--border-dim)', background: '#0f0f18', minHeight: '100vh' }}>

      {/* ── Profile block ─────────────────────────────── */}
      <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-dim)' }}>

        {session?.user ? (
          <>
            {/* Logged-in: show user avatar + name + XP */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--gold)' }}>
                {initials}
              </div>
              <div>
                <div className="text-[8px] font-bold" style={{ color: 'var(--text-1)' }}>{session.user.name}</div>
                <div className="text-[6px] mt-0.5" style={{ color: 'var(--gold)' }}>Lv {userLevel} · {totalXp.toLocaleString()} XP</div>
              </div>
            </div>

            <div className="flex gap-1.5 mb-2">
              <Link href="/"
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[6.5px] font-bold transition-opacity hover:opacity-85"
                style={{
                  background: 'linear-gradient(135deg, rgba(200,155,60,0.2) 0%, rgba(200,155,60,0.08) 100%)',
                  border: '1px solid rgba(200,155,60,0.45)',
                  color: 'var(--gold)',
                }}>
                <span>🏠</span><span>Home</span>
              </Link>
              <SidebarLogoutButton />
            </div>

            {isAdmin && (
              <Link href="/admin"
                className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[6px] transition-opacity hover:opacity-80"
                style={{ background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.3)', color: 'var(--gold)' }}>
                ⚙ Admin Panel
              </Link>
            )}
          </>
        ) : (
          <>
            {/* Logged-out: login box */}
            <div className="rounded-xl p-3 mb-2"
              style={{
                background: 'linear-gradient(135deg, rgba(200,155,60,0.08) 0%, rgba(200,155,60,0.03) 100%)',
                border: '1px solid rgba(200,155,60,0.25)',
              }}>
              <div className="text-[7px] font-bold mb-1" style={{ color: 'var(--gold)' }}>⚔ Welcome, Adventurer</div>
              <div className="text-[6px] mb-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Log in to earn XP, post in channels, and track your progress.
              </div>
              <div className="flex gap-1.5">
                <Link href="/login" className="osrs-btn flex-1 text-[6.5px] py-1.5 text-center block">Login</Link>
                <Link href="/register" className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-[6.5px] transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                  Join
                </Link>
              </div>
            </div>

            <Link href="/"
              className="flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[6.5px] font-bold transition-opacity hover:opacity-85"
              style={{
                background: 'linear-gradient(135deg, rgba(200,155,60,0.2) 0%, rgba(200,155,60,0.08) 100%)',
                border: '1px solid rgba(200,155,60,0.45)',
                color: 'var(--gold)',
              }}>
              <span>🏠</span><span>Home</span>
            </Link>
          </>
        )}
      </div>

      {/* ── Middle: channels + fun zone ───────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="py-2 shrink-0">
          <div className="px-4 pb-1.5 pt-1">
            <span className="text-[6px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Communities</span>
          </div>

          {/* Quests — special channel entry (no XP level) */}
          <Link href="/quest-board" className="guild-channel">
            <span className="text-base shrink-0 w-6 text-center">📋</span>
            <div className="flex-1 min-w-0">
              <div className="text-[7px] truncate" style={{ color: 'var(--text-1)' }}>Quests</div>
              <div className="text-[5.5px] truncate" style={{ color: 'var(--text-3)' }}>Active Quest Log</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[6px] font-bold" style={{ color: 'var(--gold)' }}>4</div>
            </div>
          </Link>

          {/* Skill channels */}
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

        {/* Fun zone */}
        <SidebarFunGame />
      </div>

      {/* ── Badges — only when logged in ──────────── */}
      {session?.user && userBadges.length > 0 && (
        <div className="px-3 py-2 border-t shrink-0" style={{ borderColor: 'var(--border-dim)' }}>
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
