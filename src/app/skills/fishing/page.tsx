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

interface GearItem {
  id: string
  emoji: string
  name: string
  category: string
  url: string
}

const DEFAULT_GEAR: GearItem[] = [
  { id: '1', emoji: '🎣', name: 'Spinning Rod',   category: 'Rods',     url: '' },
  { id: '2', emoji: '⚙️', name: 'Spinning Reel',  category: 'Reels',    url: '' },
  { id: '3', emoji: '🪁', name: 'Crankbaits',     category: 'Lures',    url: '' },
  { id: '4', emoji: '🐛', name: 'Live Bait Rigs', category: 'Bait',     url: '' },
  { id: '5', emoji: '🧵', name: 'Mono Line 10lb', category: 'Line',     url: '' },
  { id: '6', emoji: '📦', name: 'Tackle Box',     category: 'Storage',  url: '' },
  { id: '7', emoji: '🦟', name: 'Insect Repellent', category: 'Gear',   url: '' },
  { id: '8', emoji: '🎒', name: 'Fishing Vest',   category: 'Gear',     url: '' },
]

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
    id: string; title: string; body: string; imageUrl?: string | null; createdAt: Date
    user: { username: string }
    replies: Array<{ id: string; body: string; createdAt: Date; user: { username: string } }>
    upvotes: Array<{ userId: string }>
  }> = []
  let totalMembers = 0
  let gear: GearItem[] = DEFAULT_GEAR

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
    const gearSetting = await (prisma as any).siteSetting.findUnique({ where: { key: 'fishing_gear' } })
    if (gearSetting?.value) {
      try { gear = JSON.parse(gearSetting.value) } catch { /* use default */ }
    }
  } catch {
    // DB not configured
  }

  const totalPosts = posts.length
  const isAdmin = session?.user?.role === 'ADMIN'

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
        <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(200,155,60,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{
              width: 54, height: 54, flexShrink: 0,
              background: 'rgba(200,155,60,0.08)', border: '2px solid rgba(200,155,60,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>🎣</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#f0d898', letterSpacing: '0.06em' }}>
                  Fishing
                </span>
                <span style={{
                  fontSize: 8, fontFamily: "'Press Start 2P', monospace", color: '#8a6830',
                  background: 'rgba(200,155,60,0.1)', border: '1px solid rgba(200,155,60,0.28)',
                  padding: '3px 8px', letterSpacing: '0.1em',
                }}>GUILD CHANNEL</span>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#8a7050', margin: 0, lineHeight: 1.5 }}>
                Fishing trips, outdoor adventures &amp; tips from the water.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: session?.user ? 14 : 0 }}>
            <span style={{ fontSize: 12, color: '#6a5030' }}>
              <span style={{ color: '#a08048', fontWeight: 600 }}>👥 {totalMembers}</span>{' '}members
            </span>
            <span style={{ width: 1, height: 12, background: 'rgba(200,155,60,0.2)', display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#6a5030' }}>
              <span style={{ color: '#a08048', fontWeight: 600 }}>🎣 {totalPosts}</span>{' '}posts
            </span>
            {session?.user && (
              <>
                <span style={{ width: 1, height: 12, background: 'rgba(200,155,60,0.2)', display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#60aa60', fontWeight: 600 }}>● Online</span>
              </>
            )}
          </div>
          {session?.user && (
            <div style={{ maxWidth: 320 }}>
              <XpBar xp={userXp} skillName="Fishing" />
            </div>
          )}
        </div>
      </div>

      {/* ── Tackle Box ──────────────────────────────────────── */}
      <div style={{
        background: '#0d0d14',
        border: '2px solid rgba(200,155,60,0.22)',
        borderTop: 'none', borderBottom: 'none',
        padding: '18px 18px 20px',
      }}>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚓</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#c89b3c', letterSpacing: '0.1em' }}>
              TACKLE BOX
            </span>
            <span style={{
              fontSize: 8, fontFamily: "'Press Start 2P', monospace", color: '#5a4020',
              background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.18)',
              padding: '2px 7px', letterSpacing: '0.08em',
            }}>MY GEAR</span>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              style={{ fontSize: 11, color: '#6a5030', fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}
            >
              + Edit gear
            </Link>
          )}
        </div>

        {/* App icon grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
          {gear.map(item => {
            const hasLink = item.url.trim().length > 0
            if (hasLink) {
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gear-tile"
                >
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#c8b880', textAlign: 'center', lineHeight: 1.3 }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 9, color: '#5a4820', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.06em' }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: 9, color: '#7a6030' }}>↗</span>
                </a>
              )
            }
            return (
              <div key={item.id} className="gear-tile gear-tile-dead">
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7a6840', textAlign: 'center', lineHeight: 1.3 }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 9, color: '#3a2e18', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.06em' }}>
                  {item.category}
                </span>
                <span style={{ fontSize: 8, color: '#3a2e18' }}>link soon</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Feed area ───────────────────────────────────────── */}
      <div style={{
        background: '#0d0d14',
        border: '2px solid rgba(200,155,60,0.22)',
        borderTop: '1px solid rgba(200,155,60,0.12)',
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
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e6e0', marginBottom: 4 }}>Join the Guild</div>
                <div style={{ fontSize: 13, color: '#7a6040' }}>Share your catches, tips, and fishing spots with the community.</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href="/login" style={{
                  display: 'inline-block', padding: '9px 18px',
                  background: 'transparent', border: '1px solid rgba(200,155,60,0.35)',
                  color: '#c89b3c', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                }}>Log In</Link>
                <Link href="/register" style={{
                  display: 'inline-block', padding: '9px 18px',
                  background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                  color: '#0a0600', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}>🛡 Join</Link>
              </div>
            </div>
          )}
        </div>

        {/* Posts feed */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#3a2e20' }}>
            No catches yet — be the first to post! 🎣
          </div>
        ) : (
          <div>
            {posts.map((post, idx) => {
              const upvoteCount = post.upvotes.length
              const hasUpvoted  = session?.user?.id
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
                      fontSize: 14, fontWeight: 700, color: '#d8c890', fontFamily: 'Inter, sans-serif',
                    }}>
                      {post.user.username.slice(0, 2).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Username + time */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <Link href={`/profile/${post.user.username}`} style={{ fontSize: 14, fontWeight: 700, color: '#c89b3c', textDecoration: 'none' }}>
                          {post.user.username}
                        </Link>
                        <span style={{ fontSize: 11, color: '#3e3020' }}>
                          {timeAgo(new Date(post.createdAt))}
                        </span>
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e6e0', marginBottom: 6, lineHeight: 1.45 }}>
                        {post.title}
                      </div>

                      {/* Body */}
                      <div style={{ fontSize: 14, color: '#a09880', lineHeight: 1.7, marginBottom: post.imageUrl ? 10 : 12, whiteSpace: 'pre-wrap' }}>
                        {post.body}
                      </div>

                      {/* Post image */}
                      {post.imageUrl && (
                        <div style={{ marginBottom: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.imageUrl}
                            alt="Post photo"
                            style={{
                              maxWidth: '100%', maxHeight: 420, display: 'block',
                              border: '1px solid rgba(200,155,60,0.2)',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}

                      {/* Reactions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: post.replies.length > 0 || session?.user ? 10 : 0 }}>
                        <UpvoteButton postId={post.id} count={upvoteCount} upvoted={hasUpvoted} />
                        {post.replies.length > 0 && (
                          <span style={{ fontSize: 12, color: '#4a3820' }}>
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
                                fontSize: 9, fontWeight: 700, color: '#d8c890', fontFamily: 'Inter, sans-serif',
                              }}>
                                {reply.user.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                                  <Link href={`/profile/${reply.user.username}`} style={{ fontSize: 12, fontWeight: 600, color: '#c89b3c', textDecoration: 'none' }}>
                                    {reply.user.username}
                                  </Link>
                                  <span style={{ fontSize: 10, color: '#322418' }}>
                                    {timeAgo(new Date(reply.createdAt))}
                                  </span>
                                </div>
                                <div style={{ fontSize: 13, color: '#7a6848', lineHeight: 1.6 }}>
                                  {reply.body}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

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
