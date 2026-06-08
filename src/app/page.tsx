import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillByEnum } from '@/lib/skills'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()

  let recentPosts: Array<{
    id: string; title: string; skill: string; createdAt: Date
    user: { username: string }
  }> = []

  let totalPosts = 0
  let totalUsers = 0

  try {
    recentPosts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { username: true } } },
    })
    totalPosts = await prisma.post.count()
    totalUsers = await prisma.user.count()
  } catch {
    // DB not configured yet
  }

  return (
    <div className="space-y-4">

      {/* Hero */}
      <div className="osrs-panel-dark rounded-xl">
        <div className="px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-14 h-14 rounded-lg border-2 border-[#5a5a5a] bg-[#282828] flex items-center justify-center text-2xl">
              ⚔
            </div>
            <div className="flex-1">
              <h1 className="text-[13px] text-[#e0e0e0] font-bold leading-snug">
                Garret&apos;s World
                <span className="blink text-[#ffe066] ml-1">_</span>
              </h1>
              <p className="text-[7px] text-[#909090] mt-1.5 leading-relaxed">
                I&apos;m Garret Perez — a sales professional in the wine industry, a builder,
                creator, father, and lifelong learner. This site is part contact card, part
                community, and part RPG profile. Explore my skills, join conversations, gain XP,
                and level up with the community.
              </p>
            </div>
          </div>

          {/* Site stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Members', value: totalUsers, icon: '👥' },
              { label: 'Posts',   value: totalPosts, icon: '📝' },
              { label: 'Skills',  value: 9,          icon: '⚒️' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#282828] rounded-lg px-2 py-2 text-center border border-[#3d3d3d]">
                <div className="text-base leading-none mb-1">{stat.icon}</div>
                <div className="text-[14px] text-[#ffe066] font-bold leading-none">{stat.value}</div>
                <div className="text-[6px] text-[#707070] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Auth CTA */}
          {session?.user ? (
            <div className="mt-4 bg-[#282828] rounded-lg px-3 py-2 border border-[#3d3d3d] flex items-center gap-2">
              <span className="text-sm">🧙</span>
              <div>
                <span className="text-[8px] text-[#c0c0c0]">Welcome back, </span>
                <span className="text-[8px] text-[#ffe066] font-bold">{session.user.name}</span>
                <span className="text-[8px] text-[#c0c0c0]">! Click a skill to post and earn XP.</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <Link href="/register" className="osrs-btn flex-1 text-center text-[8px] py-2">
                ✨ Join Free
              </Link>
              <Link href="/login" className="osrs-btn flex-1 text-center text-[8px] py-2">
                🔑 Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* XP Quest Log */}
      <div className="osrs-panel rounded-xl">
        <h2 className="text-[9px] text-[#1a1a1a] font-bold mb-3 flex items-center gap-1.5">
          📜 Quest Log
          <span className="text-[6px] text-[#3d3d3d] font-normal">— how to earn XP</span>
        </h2>
        <ul className="space-y-2">
          {[
            { icon: '📝', action: 'Post in any skill section',  xp: '+10 XP' },
            { icon: '💬', action: 'Reply to a post',            xp: '+5 XP' },
            { icon: '🍳', action: 'Add a recipe to Cooking',    xp: '+10 XP' },
            { icon: '🍷', action: 'Win Wine Trivia (7+ / 10)',  xp: '+20 XP' },
            { icon: '🃏', action: 'Complete Matching Game',     xp: '+20 XP' },
            { icon: '🌅', action: 'Daily login bonus',          xp: '+5 XP' },
          ].map(task => (
            <li key={task.action} className="flex items-center gap-2">
              <span className="text-xs w-4 h-4 border border-[#5a5a5a] bg-[#2a2a2a] shrink-0 flex items-center justify-center text-[7px] text-[#5a5a5a] rounded-sm">□</span>
              <span className="text-base shrink-0">{task.icon}</span>
              <span className="text-[7px] text-[#2a2a2a] flex-1 leading-tight">{task.action}</span>
              <span className="text-[7px] text-[#2a6a2a] font-bold whitespace-nowrap">{task.xp}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-2 border-t border-[#6a6a6a]">
          <p className="text-[6px] text-[#3d3d3d]">
            🏆 Earn badges: First Post · Level 10 · Game Winner · Chef · Daily Adventurer
          </p>
        </div>
      </div>

      {/* Recent activity */}
      {recentPosts.length > 0 ? (
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-3 flex items-center gap-1.5">
            💬 Recent Activity
            <span className="blink text-[#ffe066]">▮</span>
          </h2>
          <div className="space-y-1.5">
            {recentPosts.map(post => {
              const skill = getSkillByEnum(post.skill)
              const ms = Date.now() - new Date(post.createdAt).getTime()
              const mins = Math.floor(ms / 60000)
              const timeAgo = mins < 60 ? `${mins}m ago`
                : mins < 1440 ? `${Math.floor(mins / 60)}h ago`
                : `${Math.floor(mins / 1440)}d ago`
              return (
                <Link
                  key={post.id}
                  href={skill?.href ?? '/'}
                  className="block bg-[#282828] hover:bg-[#323232] transition-colors rounded-lg px-3 py-2 border border-[#3d3d3d]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{skill?.icon ?? '📝'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] text-[#d0d0d0] truncate">{post.title}</div>
                      <div className="text-[6px] text-[#707070] mt-0.5">
                        <span className="text-[#a0a0a0]">{post.user.username}</span>
                        {' · '}{skill?.label}
                      </div>
                    </div>
                    <span className="text-[6px] text-[#606060] shrink-0 ml-1">{timeAgo}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="osrs-panel-dark rounded-xl text-center py-6">
          <div className="text-2xl mb-2">🗿</div>
          <p className="text-[8px] text-[#707070]">
            No posts yet — click a skill on the left to get started!
          </p>
        </div>
      )}

      {/* Skills quick-nav */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-3">🗺️ Explore Skills</h2>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: '❤️', label: 'Health',    href: '/skills/health',    desc: 'Wellness & fitness' },
            { icon: '⚒️', label: 'Projects',  href: '/skills/projects',  desc: 'Builds & tech' },
            { icon: '🎣', label: 'Fishing',   href: '/skills/fishing',   desc: 'Outdoor adventures' },
            { icon: '💼', label: 'Business',  href: '/skills/business',  desc: 'Wine sales & leadership' },
            { icon: '🍳', label: 'Cooking',   href: '/skills/food',      desc: 'Recipes & pairings' },
            { icon: '👥', label: 'Community', href: '/skills/community', desc: 'Group discussions' },
            { icon: '🌱', label: 'Farming',   href: '/skills/gardening', desc: 'Garden & outdoors' },
            { icon: '🎮', label: 'Fun',       href: '/skills/fun',       desc: 'Mini-games' },
            { icon: '🗺️', label: 'Travel',    href: '/skills/travel',    desc: 'Adventures & places' },
          ].map(s => (
            <Link key={s.href} href={s.href} className="skill-cell rounded-lg" title={s.desc}>
              <span className="text-base leading-none">{s.icon}</span>
              <span className="text-[6px] text-[#c0c0c0] mt-0.5 text-center block">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
