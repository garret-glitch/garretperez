import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import UpvoteButton from '@/components/UpvoteButton'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import Link from 'next/link'
import type { SkillType } from '@prisma/client'
import FishingPostForm, { getAvatarColor, getAvatarBorder } from './FishingPostForm'
import FishingReplyForm from './FishingReplyForm'

export const dynamic = 'force-dynamic'

function timeAgo(date: Date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function FishingPage() {
  const session = await auth()

  let userXp = 0
  let posts: Array<{
    id: string; title: string; body: string; createdAt: Date
    user: { username: string }
    replies: Array<{ id: string; body: string; createdAt: Date; user: { username: string } }>
    upvotes: Array<{ userId: string }>
  }> = []
  let totalMembers = 0

  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FISHING' as SkillType } },
      })
      userXp = userSkill?.xp ?? 0
    }
    posts = await (prisma as any).post.findMany({
      where: { skill: 'FISHING' },
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
    })
    totalMembers = await prisma.user.count()
  } catch {
    // DB not configured
  }

  const totalPosts = posts.length

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#e8e6e0' }}>
      {session?.user && <SkillVisitTracker skill={'FISHING' as SkillType} />}

      {/* ── Channel Banner ──────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: '2px solid rgba(200,155,60,0.38)',
        borderBottom: '2px solid rgba(200,155,60,0.45)',
        padding: '22px 20px 18px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Inner hairline — classic double-border */}
        <div style={{
          position: 'absolute', inset: 4,
          border: '1px solid rgba(200,155,60,0.1)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 54, height: 54, flexShrink: 0,
              background: 'rgba(200,155,60,0.08)',
              border: '2px solid rgba(200,155,60,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>
              🎣
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14, color: '#f0d898', letterSpacing: '0.06em',
                }}>
                  Fishing
                </span>
                <span style={{
                  fontSize: 8, fontFamily: "'Press Start 2P', monospace",
                  color: '#8a6830', background: 'rgba(200,155,60,0.1)',
                  border: '1px solid rgba(200,155,60,0.28)',
                  padding: '3px 8px', letterSpacing: '0.1em',
                }}>
                  GUILD CHANNEL
                </span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a7050', margin: 0, lineHeight: 1.5 }}>
                Fishing trips, outdoor adventures &amp; tips from the water.
              </p>
            </div>
          </div>

          {/* Stats chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: session?.user ? 14 : 0 }}>
            <span style={{ fontSize: 12, color: '#6a5030', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ color: '#a08048', fontWeight: 600 }}>👥 {totalMembers}</span>{' '}members
            </span>
            <span style={{ width: 1, height: 12, background: 'rgba(200,155,60,0.2)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#6a5030', fontFamily: 'Inter, sans-serif' }}>
              <span style={{ color: '#a08048', fontWeight: 600 }}>🎣 {totalPosts}</span>{' '}posts
            </span>
            {session?.user && (
              <>
                <span style={{ width: 1, height: 12, background: 'rgba(200,155,60,0.2)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#60aa60', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>● Online</span>
              </>
            )}
          </div>

          {/* XP bar */}
          {session?.user && (
            <div style={{ maxWidth: 320 }}>
              <XpBar xp={userXp} skillName="Fishing" />
            </div>
          )}
        </div>
      </div>

      {/* ── Feed area ───────────────────────────────────────── */}
      <div style={{
        background: '#0d0d14',
        border: '2px solid rgba(200,155,60,0.22)',
        borderTop: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>

        {/* Post form or login CTA */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(200,155,60,0.1)' }}>
          {session?.user ? (
            <FishingPostForm username={session.user.name ?? 'User'} />
          ) : (
            <div style={{
              background: '#13131c', border: '1px solid rgba(200,155,60,0.18)',
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e6e0', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
                  Join the Guild
                </div>
                <div style={{ fontSize: 13, color: '#7a6040', fontFamily: 'Inter, sans-serif' }}>
                  Share your catches, tips, and fishing spots with the community.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/login" style={{
                  display: 'inline-block', padding: '9px 18px',
                  background: 'transparent', border: '1px solid rgba(200,155,60,0.35)',
                  color: '#c89b3c', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                }}>
                  Log In
                </Link>
                <Link href="/register" style={{
                  display: 'inline-block', padding: '9px 18px',
                  background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                  color: '#0a0600', fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                }}>
                  🛡 Join
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Posts feed */}
        {posts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#3a2e20',
          }}>
            No catches yet — be the first to post! 🎣
          </div>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const upvoteCount = post.upvotes.length
              const hasUpvoted = session?.user?.id
                ? post.upvotes.some((u: { userId: string }) => u.userId === session.user!.id)
                : false
              return (
                <div
                  key={post.id}
                  style={{
                    padding: '18px 18px 14px',
                    background: idx % 2 !== 0 ? 'rgba(200,155,60,0.025)' : 'transparent',
                    borderBottom: '1px solid rgba(200,155,60,0.07)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: getAvatarColor(post.user.username),
                      border: `2px solid ${getAvatarBorder(post.user.username)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#d8c890',
                      fontFamily: 'Inter, sans-serif',
                    }}>
                      {post.user.username.slice(0, 2).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Username + timestamp */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <Link href={`/profile/${post.user.username}`} style={{
                          fontSize: 14, fontWeight: 700, color: '#c89b3c', textDecoration: 'none',
                          fontFamily: 'Inter, sans-serif',
                        }}>
                          {post.user.username}
                        </Link>
                        <span style={{ fontSize: 11, color: '#3e3020', fontFamily: 'Inter, sans-serif' }}>
                          {timeAgo(new Date(post.createdAt))}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{
                        fontSize: 15, fontWeight: 600, color: '#e8e6e0', marginBottom: 6, lineHeight: 1.45,
                        fontFamily: 'Inter, sans-serif',
                      }}>
                        {post.title}
                      </div>

                      {/* Body */}
                      <div style={{
                        fontSize: 14, color: '#a09880', lineHeight: 1.7, marginBottom: 12,
                        whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif',
                      }}>
                        {post.body}
                      </div>

                      {/* Reactions row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: post.replies.length > 0 || session?.user ? 10 : 0 }}>
                        <UpvoteButton postId={post.id} count={upvoteCount} upvoted={hasUpvoted} />
                        {post.replies.length > 0 && (
                          <span style={{ fontSize: 12, color: '#4a3820', fontFamily: 'Inter, sans-serif' }}>
                            💬 {post.replies.length} {post.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>

                      {/* Reply thread */}
                      {post.replies.length > 0 && (
                        <div style={{ paddingLeft: 14, borderLeft: '2px solid rgba(200,155,60,0.2)', marginBottom: 8 }}>
                          {post.replies.map(reply => (
                            <div key={reply.id} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                background: getAvatarColor(reply.user.username),
                                border: `1.5px solid ${getAvatarBorder(reply.user.username)}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 700, color: '#d8c890',
                                fontFamily: 'Inter, sans-serif',
                              }}>
                                {reply.user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                                  <Link href={`/profile/${reply.user.username}`} style={{
                                    fontSize: 12, fontWeight: 600, color: '#c89b3c',
                                    textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                                  }}>
                                    {reply.user.username}
                                  </Link>
                                  <span style={{ fontSize: 10, color: '#322418', fontFamily: 'Inter, sans-serif' }}>
                                    {timeAgo(new Date(reply.createdAt))}
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, color: '#7a6848', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}>
                                  {reply.body}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {session?.user && <FishingReplyForm postId={post.id} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
