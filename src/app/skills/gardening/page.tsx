import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import { getSkillBySlug } from '@/lib/skills'
import SkillHeroBar from '@/components/SkillHeroBar'
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

  let headshot = ''
  let communityXp = 0
  let communityMemberCount = 0
  let plants: PlantData[] = []
  let posts: Array<{ id: string; title: string; body: string; createdAt: Date; user: { username: string } }> = []

  try {
    const [communityData, headshotRow] = await Promise.all([
      getCommunityXpForSkill('GARDENING'),
      (prisma as any).siteSetting.findUnique({ where: { key: 'headshot' } }),
    ])
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    headshot = headshotRow?.value ?? ''
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

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 22 }}>

      <SkillHeroBar
        skill={getSkillBySlug('gardening')!}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        postCount={posts.length}
        isLoggedIn={!!session?.user}
        headshot={headshot}
      />

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

