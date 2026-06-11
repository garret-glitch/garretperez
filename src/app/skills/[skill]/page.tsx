import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillBySlug } from '@/lib/skills'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import CommunityLevelCard from '@/components/CommunityLevelCard'
import { SkillType } from '@prisma/client'
import PostForm from '@/components/PostForm'
import ReplyForm from '@/components/ReplyForm'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import UpvoteButton from '@/components/UpvoteButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface Props {
  params: { skill: string }
}

export default async function SkillPage({ params }: Props) {
  const skillMeta = getSkillBySlug(params.skill)
  if (!skillMeta) notFound()

  const session = await auth()

  let communityXp = 0
  let communityMemberCount = 0
  let posts: Array<{
    id: string; title: string; body: string; imageUrl?: string | null; createdAt: Date
    user: { username: string }
    replies: Array<{ id: string; body: string; createdAt: Date; user: { username: string } }>
    upvotes: Array<{ userId: string }>
  }> = []

  try {
    const [communityData, postRows] = await Promise.all([
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
    ])
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    posts = postRows

    } catch {
    // DB not configured
  }

  return (
    <div className="space-y-4">
      {/* Award visit XP once per day */}
      {session?.user && <SkillVisitTracker skill={skillMeta.dbEnum} />}

      {/* ── Hero banner ─────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: '2px solid rgba(200,155,60,0.38)',
        padding: '24px 22px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(200,155,60,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top row: icon + title + cards */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 48, height: 48, flexShrink: 0,
                  background: 'rgba(200,155,60,0.08)', border: '2px solid rgba(200,155,60,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>{skillMeta.icon}</div>
                <div>
                  <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#f0d898', letterSpacing: '0.06em', marginBottom: 4 }}>
                    {skillMeta.label}
                  </h1>
                  {skillMeta.description && (
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7a5e3c', margin: 0 }}>
                      {skillMeta.description}
                    </p>
                  )}
                </div>
              </div>

              {!session?.user && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Link href="/login" style={{
                    padding: '9px 18px', background: 'transparent',
                    border: '1px solid rgba(200,155,60,0.35)', color: '#c89b3c',
                    fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                  }}>Log In</Link>
                  <Link href="/register" style={{
                    padding: '9px 18px', background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                    color: '#0a0600', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                  }}>🛡 Join &amp; Earn XP</Link>
                </div>
              )}
            </div>

            {/* Right: level cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <CommunityLevelCard xp={communityXp} memberCount={communityMemberCount} />
            </div>
          </div>
        </div>
      </div>

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
          {posts.map(post => {
            const upvoteCount = post.upvotes.length
            const hasUpvoted = session?.user?.id
              ? post.upvotes.some((u: { userId: string }) => u.userId === session.user!.id)
              : false
            return (
              <div key={post.id} className="osrs-panel-dark rounded-xl" style={{ overflow: 'hidden' }}>
                {/* Event banner image */}
                {post.imageUrl && (
                  <div style={{ position: 'relative', width: '100%', maxHeight: 320, overflow: 'hidden' }}>
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      style={{ width: '100%', height: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, transparent 40%, rgba(13,11,9,0.92) 100%)',
                    }} />
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
                <p className="text-[9px] text-[#d8d8d8] mt-2 leading-relaxed whitespace-pre-wrap">
                  {post.body}
                </p>
                </div>

                {/* Replies */}
                {post.replies.length > 0 && (
                  <div className="mt-3 border-t border-[#3d3d3d] pt-2 space-y-2">
                    {post.replies.map(reply => (
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
