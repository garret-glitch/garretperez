import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'
import { SKILLS } from '@/lib/skills'
import { BADGE_META } from '@/lib/badges'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { username: string }
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth()

  let user: any = null
  let skills: any[] = []
  let posts: any[] = []
  let badges: any[] = []

  try {
    user = await prisma.user.findUnique({
      where: { username: params.username },
      select: {
        id: true, username: true, createdAt: true, role: true, banned: true,
      },
    })
    if (!user) notFound()

    ;[skills, posts, badges] = await Promise.all([
      prisma.userSkill.findMany({ where: { userId: user.id } }),
      prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, skill: true, createdAt: true },
      }),
      (prisma as any).userBadge.findMany({
        where: { userId: user.id },
        select: { badge: true, awardedAt: true },
      }),
    ])
  } catch {
    notFound()
  }

  const totalXp = skills.reduce((s: number, sk: any) => s + sk.xp, 0)
  const totalLevel = skills.reduce((s: number, sk: any) => s + xpToLevel(sk.xp), 0)
  const isOwnProfile = session?.user?.name === params.username

  return (
    <div className="space-y-4">
      {/* Profile card */}
      <div className="osrs-panel-dark rounded-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#282828] border-2 border-[#4a4a4a] flex items-center justify-center text-2xl shrink-0">
            🧙
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[13px] text-[#e0e0e0] font-bold">{user.username}</h1>
              {user.role === 'ADMIN' && (
                <span className="text-[6px] bg-[#4a3000] text-[#ffe066] px-1.5 py-0.5 rounded border border-[#ffe066]">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[7px] text-[#707070] mt-0.5">
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-2 flex gap-4">
              <div className="text-center">
                <div className="text-[11px] text-[#ffe066] font-bold">{totalLevel}</div>
                <div className="text-[6px] text-[#707070]">Total Level</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-[#ffe066] font-bold">{totalXp.toLocaleString()}</div>
                <div className="text-[6px] text-[#707070]">Total XP</div>
              </div>
              <div className="text-center">
                <div className="text-[11px] text-[#ffe066] font-bold">{posts.length}</div>
                <div className="text-[6px] text-[#707070]">Posts</div>
              </div>
            </div>
          </div>
        </div>
        {isOwnProfile && (
          <p className="mt-3 text-[7px] text-[#707070]">This is your profile.</p>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {badges.map((b: any) => {
              const meta = BADGE_META[b.badge]
              if (!meta) return null
              return (
                <div
                  key={b.badge}
                  title={meta.desc}
                  className="flex items-center gap-1 bg-[#282828] border border-[#4a4a4a] rounded-lg px-2 py-1"
                >
                  <span className="text-sm">{meta.icon}</span>
                  <span className="text-[7px] text-[#c0c0c0]">{meta.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Skills</h2>
        <div className="grid grid-cols-3 gap-3">
          {SKILLS.map(s => {
            const sk = skills.find((sk: any) => sk.skill === s.dbEnum)
            const xp = sk?.xp ?? 0
            const level = xpToLevel(xp)
            return (
              <Link key={s.slug} href={s.href} className="skill-cell" style={{ background: s.color }}>
                <span className="text-2xl leading-none">{s.icon}</span>
                <span className="text-[7px] leading-tight text-center" style={{ color: '#e8d8b0' }}>{s.label}</span>
                <span className="text-[8px] font-bold" style={{ color: '#ffd060' }}>Lv {level}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent posts */}
      {posts.length > 0 && (
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Recent Posts</h2>
          <div className="space-y-1.5">
            {posts.map((p: any) => {
              const s = SKILLS.find(sk => sk.dbEnum === p.skill)
              return (
                <Link key={p.id} href={s?.href ?? '/'} className="flex items-center gap-2 bg-[#282828] hover:bg-[#323232] rounded-lg px-3 py-2">
                  <span className="text-sm shrink-0">{s?.icon ?? '📝'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] text-[#d0d0d0] truncate">{p.title}</div>
                    <div className="text-[6px] text-[#707070]">{s?.label} · {new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
