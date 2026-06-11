import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import CommunityLevelCard from '@/components/CommunityLevelCard'
import Link from 'next/link'
import MarketDashboard from './MarketDashboard'
import BusinessPostForm from './BusinessPostForm'

export const dynamic = 'force-dynamic'

const S = {
  card:     '#16120e',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.24)',
  borderDim:'rgba(200,155,60,0.12)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
}

export default async function BusinessPage() {
  const session = await auth()

  let communityXp = 0
  let communityMemberCount = 0
  let posts: Array<{
    id: string; title: string; body: string
    createdAt: Date; user: { username: string }
  }> = []

  try {
    const communityData = await getCommunityXpForSkill('BUSINESS')
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    posts = await prisma.post.findMany({
      where: { skill: 'BUSINESS' },
      orderBy: { createdAt: 'desc' }, take: 20,
      include: { user: { select: { username: true } } },
    })
  } catch { /* DB not configured */ }

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: `2px solid rgba(200,155,60,0.38)`,
        padding: '28px 26px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(200,155,60,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  background: 'rgba(200,155,60,0.08)', border: '2px solid rgba(200,155,60,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>💼</div>
                <div>
                  <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#f0d898', letterSpacing: '0.06em', marginBottom: 5 }}>
                    Business
                  </h1>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, margin: 0 }}>
                    Live markets, finance talk &amp; business insights. Post → +50 XP!
                  </p>
                </div>
              </div>

              {!session?.user && (
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <Link href="/login" style={{ padding: '9px 18px', background: 'transparent', border: `1px solid rgba(200,155,60,0.35)`, color: S.gold, fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                    Log In
                  </Link>
                  <Link href="/register" style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)', color: '#0a0600', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                    🛡 Join &amp; Earn XP
                  </Link>
                </div>
              )}
            </div>

            {/* Right: stat cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              <CommunityLevelCard xp={communityXp} memberCount={communityMemberCount} />
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE MARKET DATA ─────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              LIVE MARKET DATA
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>
        <MarketDashboard />
      </div>

      {/* ── BUSINESS DISCUSSIONS ─────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              BUSINESS DISCUSSIONS
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        {session?.user ? (
          <div style={{ marginBottom: 16 }}>
            <BusinessPostForm />
          </div>
        ) : (
          <div style={{
            background: S.card, border: `1px solid ${S.border}`,
            padding: '24px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 600, color: S.text1, marginBottom: 4 }}>
                Join the business conversation
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text3 }}>
                Log in to share insights and earn +50 Business XP per post.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/login" style={{ padding: '10px 20px', background: 'transparent', border: `1px solid rgba(200,155,60,0.35)`, color: S.gold, fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                Log In
              </Link>
              <Link href="/register" style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)', color: '#0a0600', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}>
                🛡 Join Free
              </Link>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div style={{
            background: S.card, border: `1px solid ${S.borderDim}`,
            padding: '28px', textAlign: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4,
          }}>
            No business discussions yet — be the first to post!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(post => (
              <div
                key={post.id}
                className="food-post-card"
                style={{
                  background: S.card, border: `1px solid rgba(200,155,60,0.16)`,
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: S.text1 }}>
                    {post.title}
                  </h3>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, whiteSpace: 'nowrap' }}>
                    by {post.user.username} · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {post.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

