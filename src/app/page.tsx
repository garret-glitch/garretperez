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

  try {
    recentPosts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { username: true } } },
    })
  } catch {
    // DB not configured yet
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <div className="text-center py-2">
          <div className="text-3xl mb-2">⚔</div>
          <h1 className="text-[13px] text-[#3c2a1e] font-bold leading-relaxed">
            Garret&apos;s World
          </h1>
          <p className="text-[8px] text-[#5c3d1e] mt-2 leading-relaxed">
            A community blog where doing things earns XP!
          </p>
          {session?.user ? (
            <p className="mt-3 text-[9px] text-[#3c2a1e]">
              Welcome back,{' '}
              <span className="text-[#8b4513] font-bold">{session.user.name}</span>!
            </p>
          ) : (
            <div className="flex justify-center gap-2 mt-4">
              <Link href="/login" className="osrs-btn">Login</Link>
              <Link href="/register" className="osrs-btn">Join Free</Link>
            </div>
          )}
        </div>
      </div>

      <div className="osrs-panel-dark">
        <h2 className="text-[10px] text-[#ff981f] font-bold mb-3">⚡ How to Earn XP</h2>
        <ul className="space-y-1.5 text-[8px] text-[#ffe066]">
          <li>📝 Post in any skill section → <span className="text-[#ffcc44]">+50 XP</span></li>
          <li>🍳 Add a recipe to Cooking → <span className="text-[#ffcc44]">+50 XP</span></li>
          <li>🍷 Win Wine Trivia (7+/10) → <span className="text-[#ffcc44]">+25 XP</span></li>
          <li>🃏 Complete Matching Game → <span className="text-[#ffcc44]">+25 XP</span></li>
          <li>🌅 Login daily → <span className="text-[#ffcc44]">+10 XP bonus</span></li>
        </ul>
        <p className="text-[7px] text-[#c5a882] mt-3">
          Click any skill in the panel → to get started!
        </p>
      </div>

      {recentPosts.length > 0 ? (
        <div>
          <h2 className="text-[10px] text-[#ffcc44] mb-2">📜 Recent Activity</h2>
          <div className="space-y-2">
            {recentPosts.map(post => {
              const skill = getSkillByEnum(post.skill)
              return (
                <Link
                  key={post.id}
                  href={skill?.href ?? '/'}
                  className="osrs-panel-dark block hover:bg-[#3d2a18] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg shrink-0">{skill?.icon ?? '📝'}</span>
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#ff981f] truncate">{post.title}</div>
                      <div className="text-[7px] text-[#c5a882]">
                        {post.user.username} · {skill?.label} · {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="osrs-panel text-center py-4">
          <p className="text-[8px] text-[#5c3d1e]">
            No posts yet! Click a skill on the right →
          </p>
        </div>
      )}
    </div>
  )
}
