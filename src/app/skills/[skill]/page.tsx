import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillBySlug } from '@/lib/skills'
import { SkillType } from '@prisma/client'
import XpBar from '@/components/XpBar'
import PostForm from '@/components/PostForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { skill: string }
}

export default async function SkillPage({ params }: Props) {
  const skillMeta = getSkillBySlug(params.skill)
  if (!skillMeta) notFound()

  const session = await auth()

  let userXp = 0
  let posts: Array<{ id: string; title: string; body: string; createdAt: Date; user: { username: string } }> = []

  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: skillMeta.dbEnum as SkillType } },
      })
      userXp = userSkill?.xp ?? 0
    }
    posts = await prisma.post.findMany({
      where: { skill: skillMeta.dbEnum as SkillType },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { username: true } } },
    })
  } catch {
    // DB not configured
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{skillMeta.icon}</span>
          <h1 className="text-[14px] text-[#3c2a1e] font-bold">{skillMeta.label}</h1>
        </div>
        <p className="text-[8px] text-[#5c3d1e]">{skillMeta.description}</p>
        {session?.user && (
          <div className="mt-3">
            <XpBar xp={userXp} skillName={skillMeta.label} />
          </div>
        )}
      </div>

      {session?.user ? (
        <PostForm skillEnum={skillMeta.dbEnum} />
      ) : (
        <div className="osrs-panel-dark text-[8px] text-[#ffe066] text-center py-3">
          <Link href="/login" className="text-[#ff981f] hover:underline">Login</Link>
          {' '}or{' '}
          <Link href="/register" className="text-[#ff981f] hover:underline">register</Link>
          {' '}to post and earn XP!
        </div>
      )}

      {posts.length === 0 ? (
        <div className="osrs-panel text-[8px] text-[#5c3d1e] text-center py-6">
          No posts yet — be the first adventurer!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="osrs-panel-dark">
              <h3 className="text-[10px] text-[#ff981f] font-bold">{post.title}</h3>
              <p className="text-[7px] text-[#c5a882] mt-0.5">
                by {post.user.username} · {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <p className="text-[9px] text-[#ffe066] mt-2 leading-relaxed whitespace-pre-wrap">
                {post.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
