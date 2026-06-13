import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import { getSkillBySlug } from '@/lib/skills'
import { SkillType } from '@prisma/client'
import SkillHeroBar from '@/components/SkillHeroBar'
import PostForm from '@/components/PostForm'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import UpvoteButton from '@/components/UpvoteButton'
import ReplyForm from '@/components/ReplyForm'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const TravelMapClient = nextDynamic(() => import('./TravelMapClient'), { ssr: false })

export default async function TravelPage() {
  const skillMeta = getSkillBySlug('travel')!

  const session = await auth()
  const userId = session?.user?.id

  let communityXp = 0
  let communityMemberCount = 0
  let posts: Array<{
    id: string; title: string; body: string; imageUrl?: string | null; createdAt: Date
    user: { username: string }
    replies: Array<{ id: string; body: string; createdAt: Date; user: { username: string } }>
    upvotes: Array<{ userId: string }>
  }> = []
  let initialPins: Array<{
    id: string; userId: string; name: string; reason: string; emoji: string; x: number; y: number; createdAt: string
  }> = []

  try {
    const [communityData, postRows, pinRows] = await Promise.all([
      getCommunityXpForSkill('TRAVEL' as SkillType),
      (prisma as any).post.findMany({
        where: { skill: 'TRAVEL' },
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
      userId
        ? (prisma as any).travelPin.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    posts = postRows
    initialPins = pinRows.map((p: any) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    }))
  } catch {
    // DB not configured
  }

  return (
    <div className="space-y-4">
      {session?.user && <SkillVisitTracker skill="TRAVEL" />}

      <SkillHeroBar
        skill={skillMeta}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        postCount={posts.length}
        isLoggedIn={!!session?.user}
      />

      {/* ── WORLD MAP ── */}
      <TravelMapClient
        initialPins={initialPins}
        isLoggedIn={!!session?.user}
        userId={userId ?? undefined}
      />

      {/* ── COMMUNITY POSTS ── */}
      <div className="rp-card" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <h2 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: 'var(--text-1)',
            margin: 0,
            flex: 1,
          }}>
            Adventure Log
          </h2>
          {posts.length > 0 && (
            <span className="body-text" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {posts.length} {posts.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {/* Post form */}
        {session?.user && (
          <div style={{ marginBottom: 24 }}>
            <PostForm skillEnum="TRAVEL" />
          </div>
        )}

        {!session?.user && (
          <div style={{
            marginBottom: 24,
            padding: '14px 18px',
            background: 'rgba(200,155,60,0.05)',
            border: '1px dashed rgba(200,155,60,0.22)',
            borderRadius: 10,
            textAlign: 'center',
          }}>
            <span className="body-text" style={{ fontSize: 12, color: 'var(--text-3)' }}>
              <Link href="/login" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Log in</Link>
              {' '}to share your adventure stories and earn XP ✈️
            </span>
          </div>
        )}

        {/* Posts list */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✈️</div>
            <p className="body-text" style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No adventure logs yet — be the first to share!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {posts.map(post => (
              <div key={post.id} className="post-card" style={{ borderRadius: 12, padding: 16 }}>
                {/* Post header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: 'var(--gold)',
                  }}>
                    {post.user.username}
                  </span>
                  <span className="body-text" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    · {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: 'var(--text-1)',
                  margin: '0 0 8px',
                  lineHeight: 1.6,
                }}>
                  {post.title}
                </h3>

                <p className="body-text" style={{
                  fontSize: 13,
                  color: 'var(--text-2)',
                  margin: '0 0 12px',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                }}>
                  {post.body}
                </p>

                {/* Upvote */}
                {session?.user && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <UpvoteButton
                      postId={post.id}
                      count={post.upvotes.length}
                      upvoted={post.upvotes.some(u => u.userId === userId)}
                    />
                  </div>
                )}

                {/* Replies */}
                {post.replies.length > 0 && (
                  <div style={{
                    marginTop: 12,
                    borderTop: '1px solid var(--border-dim)',
                    paddingTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    {post.replies.map(reply => (
                      <div key={reply.id} style={{
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: 8,
                        padding: '8px 12px',
                      }}>
                        <div style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 6,
                          color: 'var(--gold)',
                          marginBottom: 5,
                        }}>
                          {reply.user.username}
                        </div>
                        <p className="body-text" style={{
                          fontSize: 12,
                          color: 'var(--text-2)',
                          margin: 0,
                          lineHeight: 1.6,
                        }}>
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {session?.user && <ReplyForm postId={post.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
