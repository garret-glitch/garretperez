import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillBySlug } from '@/lib/skills'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import { SkillType } from '@prisma/client'
import SkillHeroBar from '@/components/SkillHeroBar'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import PostForm from '@/components/PostForm'
import ReplyForm from '@/components/ReplyForm'
import UpvoteButton from '@/components/UpvoteButton'
import CoolItemsSection from '@/components/CoolItemsSection'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function CoolItemsPage() {
  const skillMeta = getSkillBySlug('cool-items')!
  const session = await auth()

  let communityXp = 0
  let communityMemberCount = 0
  let posts: any[] = []
  let items: any[] = []

  try {
    const [communityData, postRows, rawItems] = await Promise.all([
      getCommunityXpForSkill(skillMeta.dbEnum as SkillType),
      (prisma as any).post.findMany({
        where: { skill: skillMeta.dbEnum as SkillType },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { username: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { username: true } } },
          },
          upvotes: { select: { userId: true } },
        },
      }),
      (prisma as any).coolItem.findMany({
        include: { user: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    posts = postRows
    items = rawItems.map((item: any) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: undefined,
    }))
  } catch { /* DB not ready */ }

  const uid = session?.user?.id ?? null
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="space-y-4">
      {session?.user && <SkillVisitTracker skill={skillMeta.dbEnum} />}

      <SkillHeroBar
        skill={skillMeta}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        postCount={posts.length}
        isLoggedIn={!!session?.user}
      />

      {/* Cool Items showcase */}
      <CoolItemsSection items={items} userId={uid} isAdmin={isAdmin} />

      {/* Posts */}
      {session?.user ? (
        <PostForm skillEnum={skillMeta.dbEnum} />
      ) : (
        <div className="osrs-panel-dark rounded-xl text-[8px] text-[#d8d8d8] text-center py-3">
          <Link href="/login" className="text-[#a0bcd0] hover:underline">Login</Link>
          {' '}or{' '}
          <Link href="/register" className="text-[#a0bcd0] hover:underline">register</Link>
          {' '}to post and earn XP!
        </div>
      )}

      {posts.length === 0 ? (
        <div className="osrs-panel rounded-xl text-[8px] text-center py-6" style={{ color: 'var(--text-2)' }}>
          No posts yet — be the first adventurer!
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post: any) => {
            const upvoteCount = post.upvotes.length
            const hasUpvoted = uid
              ? post.upvotes.some((u: { userId: string }) => u.userId === uid)
              : false
            return (
              <div key={post.id} className="osrs-panel-dark rounded-xl" style={{ overflow: 'hidden' }}>
                {post.imageUrl && (
                  <div style={{ position: 'relative', width: '100%', maxHeight: 320, overflow: 'hidden' }}>
                    <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(13,11,9,0.92) 100%)' }} />
                  </div>
                )}
                <div style={{ padding: post.imageUrl ? '14px 16px 0' : undefined }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[10px] text-[#c8c8c8] font-bold">{post.title}</h3>
                      <p className="text-[7px] text-[#909090] mt-0.5">
                        by{' '}
                        <Link href={`/profile/${post.user.username}`} className="text-[#a0bcd0] hover:underline">
                          {post.user.username}
                        </Link>
                        {' '}· {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <UpvoteButton postId={post.id} count={upvoteCount} upvoted={hasUpvoted} />
                  </div>
                  <p className="text-[9px] text-[#d8d8d8] mt-2 leading-relaxed whitespace-pre-wrap break-words">
                    {post.body}
                  </p>
                </div>
                {post.replies.length > 0 && (
                  <div className="mt-3 border-t border-[#3d3d3d] pt-2 space-y-2">
                    {post.replies.map((reply: any) => (
                      <div key={reply.id} className="pl-3 border-l-2 border-[#4a4a4a]">
                        <p className="text-[7px] text-[#909090]">
                          <Link href={`/profile/${reply.user.username}`} className="text-[#a0bcd0] hover:underline">
                            {reply.user.username}
                          </Link>
                          {' '}· {new Date(reply.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-[8px] text-[#c8c8c8] mt-0.5 leading-relaxed">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                {session?.user && <ReplyForm postId={post.id} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
