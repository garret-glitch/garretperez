import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpProgress } from '@/lib/xp'
import Link from 'next/link'
import GardenGrid, { type PlantData } from './GardenGrid'
import GardeningPostForm from './GardeningPostForm'

export const dynamic = 'force-dynamic'

const S = {
  card:     '#16120e',
  border:   'rgba(200,155,60,0.24)',
  borderDim:'rgba(200,155,60,0.12)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
}

export default async function GardeningPage() {
  const session = await auth()

  let userXp = 0
  let plants: PlantData[] = []
  let posts: Array<{ id: string; title: string; body: string; createdAt: Date; user: { username: string } }> = []

  try {
    if (session?.user?.id) {
      const skill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'GARDENING' } },
      })
      userXp = skill?.xp ?? 0
    }
    plants = await (prisma as any).plant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    }) as PlantData[]
    posts = await prisma.post.findMany({
      where: { skill: 'GARDENING' },
      orderBy: { createdAt: 'desc' }, take: 20,
      include: { user: { select: { username: true } } },
    })
  } catch { /* DB not configured */ }

  const xp = xpProgress(userXp)

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: `2px solid rgba(200,155,60,0.38)`,
        padding: '28px 26px',
        position: 'relative', overflow: 'hidden',
        borderRadius: 4,
      }}>
        {/* double-border inner glow */}
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(200,155,60,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  background: 'rgba(200,155,60,0.08)', border: '2px solid rgba(200,155,60,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>🌱</div>
                <div>
                  <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#f0d898', letterSpacing: '0.06em', marginBottom: 5 }}>
                    Gardening
                  </h1>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, margin: 0 }}>
                    Track your plants, share tips &amp; grow together. Add a plant → +50 XP!
                  </p>
                </div>
              </div>

              {session?.user ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em' }}>
                      GARDENING XP
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>
                      {xp.currentXp.toLocaleString()} / {xp.neededXp.toLocaleString()} XP
                    </span>
                  </div>
                  <div style={{ height: 10, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(200,155,60,0.2)`, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${xp.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)', transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginTop: 4 }}>
                    {xp.percent}% to Level {xp.level + 1}
                  </div>
                </div>
              ) : (
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

            {/* Right: Level card */}
            {session?.user && (
              <div style={{
                flexShrink: 0, width: 200,
                background: S.card, border: `1px solid rgba(200,155,60,0.28)`,
                padding: '18px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.12em', marginBottom: 12 }}>
                  GARDENING SKILL
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 36, fontWeight: 800, color: S.gold, lineHeight: 1 }}>
                    {xp.level}
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.goldDim, letterSpacing: '0.08em' }}>
                    LVL
                  </span>
                </div>
                <div style={{ height: 5, background: 'rgba(200,155,60,0.1)', border: `1px solid rgba(200,155,60,0.18)`, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${xp.percent}%`, background: 'linear-gradient(90deg, #8a5c10, #c89b3c)' }} />
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3 }}>
                  {userXp.toLocaleString()} total XP
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MY GARDEN ───────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🪴</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              THE GARDEN
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        <GardenGrid initial={plants} userId={session?.user?.id ?? null} />
      </div>

      {/* ── GARDEN JOURNAL ──────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📖</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              GARDEN JOURNAL
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        {session?.user ? (
          <div style={{ marginBottom: 14 }}>
            <GardeningPostForm />
          </div>
        ) : (
          <div style={{
            background: S.card, border: `1px solid ${S.borderDim}`,
            padding: '20px 22px', borderRadius: 12, marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3 }}>
              <Link href="/login" style={{ color: S.gold, textDecoration: 'underline' }}>Log in</Link>
              {' '}to share tips and earn +50 XP per post.
            </span>
          </div>
        )}

        {posts.length === 0 ? (
          <div style={{
            background: S.card, border: `1px solid ${S.borderDim}`,
            padding: '28px', textAlign: 'center', borderRadius: 12,
            fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4,
          }}>
            No journal entries yet — be the first to share a gardening tip! 🌱
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(post => (
              <div
                key={post.id}
                className="plant-post-card"
                style={{
                  background: S.card,
                  border: `1px solid rgba(80,160,90,0.16)`,
                  borderLeft: `3px solid rgba(200,155,60,0.45)`,
                  borderRadius: '0 10px 10px 0',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 7, flexWrap: 'wrap' }}>
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
