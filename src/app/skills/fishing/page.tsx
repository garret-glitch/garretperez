import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import { getSkillBySlug } from '@/lib/skills'
import SkillHeroBar from '@/components/SkillHeroBar'
import SkillVisitTracker from '@/components/SkillVisitTracker'
import Link from 'next/link'
import type { SkillType } from '@prisma/client'
import FishingCatchForm from './FishingCatchForm'
import FishingFeed, { type FeedPost } from './FishingFeed'
import TackleBoxToggle from './TackleBoxToggle'

export const dynamic = 'force-dynamic'

/* ── Design tokens ─────────────────────────────────────────────── */
const S = {
  card:       '#12100e',
  elevated:   '#1c1812',
  borderDim:  'rgba(200,155,60,0.1)',
  border:     'rgba(200,155,60,0.18)',
  borderLit:  'rgba(200,155,60,0.4)',
  water:      '#c89b3c',
  waterDim:   '#7a5a20',
  gold:       '#c89b3c',
  goldDim:    '#7a5a20',
  text1:      '#f0d898',
  text2:      '#c8a870',
  text3:      '#907848',
  text4:      '#504030',
}

/* ── Gear list ─────────────────────────────────────────────────── */
interface GearItem { id: string; emoji: string; name: string; category: string; url: string }
const DEFAULT_GEAR: GearItem[] = [
  { id:'1', emoji:'🎣', name:'Spinning Rod',     category:'Rods',    url:'' },
  { id:'2', emoji:'⚙️', name:'Spinning Reel',    category:'Reels',   url:'' },
  { id:'3', emoji:'🪁', name:'Crankbaits',       category:'Lures',   url:'' },
  { id:'4', emoji:'🐛', name:'Live Bait Rigs',   category:'Bait',    url:'' },
  { id:'5', emoji:'🧵', name:'Mono Line 10lb',   category:'Line',    url:'' },
  { id:'6', emoji:'📦', name:'Tackle Box',       category:'Storage', url:'' },
  { id:'7', emoji:'🦟', name:'Insect Repellent', category:'Gear',    url:'' },
  { id:'8', emoji:'🎒', name:'Fishing Vest',     category:'Gear',    url:'' },
]

/* ── Stats helpers ─────────────────────────────────────────────── */
interface CatchStats {
  totalCatches: number
  biggestWeight: number
  biggestSpecies: string
  favBait: string
  topSpecies: string
}

function computeStats(bodies: string[]): CatchStats {
  let biggestWeight = 0
  let biggestSpecies = ''
  const baitCount:    Record<string,number> = {}
  const speciesCount: Record<string,number> = {}
  let totalCatches = 0

  for (const body of bodies) {
    try {
      const d = JSON.parse(body)
      if (!d.__catchData) continue
      totalCatches++
      if (d.weight) {
        const w = parseFloat(d.weight)
        if (w > biggestWeight) { biggestWeight = w; biggestSpecies = d.species ?? '' }
      }
      if (d.bait)    baitCount[d.bait]       = (baitCount[d.bait]       || 0) + 1
      if (d.species) speciesCount[d.species] = (speciesCount[d.species] || 0) + 1
    } catch { /* skip */ }
  }

  return {
    totalCatches,
    biggestWeight,
    biggestSpecies,
    favBait:    Object.entries(baitCount).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '—',
    topSpecies: Object.entries(speciesCount).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '—',
  }
}

/* ── Stat chip ─────────────────────────────────────────────────── */
function StatChip({ value, sub, label }: { value: string; sub?: string; label: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: S.elevated,
      border: `1px solid ${S.border}`,
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 800,
        color: S.text1, lineHeight: 1, letterSpacing: '-0.01em',
      }}>{value}</span>
      {sub && (
        <span style={{
          fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3,
          lineHeight: 1.3,
        }}>{sub}</span>
      )}
      <span style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 6,
        color: S.waterDim, letterSpacing: '0.12em', marginTop: 4,
      }}>{label}</span>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────── */
export default async function FishingPage() {
  const session = await auth()

  let communityXp   = 0
  let memberCount   = 0
  let stats: CatchStats = { totalCatches:0, biggestWeight:0, biggestSpecies:'', favBait:'—', topSpecies:'—' }
  let posts: FeedPost[] = []
  let gear: GearItem[] = DEFAULT_GEAR
  let tackleHidden = false

  try {
    const communityData = await getCommunityXpForSkill('FISHING' as SkillType)
    communityXp = communityData.xp
    memberCount  = communityData.memberCount

    const [allBodies, rawPosts, gearSetting, tackleSetting] = await Promise.all([
      (prisma as any).post.findMany({
        where: { skill: 'FISHING' },
        select: { body: true },
      }) as Promise<{ body: string }[]>,
      (prisma as any).post.findMany({
        where: { skill: 'FISHING' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          user:    { select: { username: true } },
          replies: { orderBy: { createdAt: 'asc' }, include: { user: { select: { username: true } } } },
          upvotes: { select: { userId: true } },
        },
      }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'fishing_gear' } }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'fishing_tackle_hidden' } }),
    ])

    stats = computeStats(allBodies.map((r: { body: string }) => r.body))

    posts = rawPosts.map((p: {
      id: string; title: string; body: string; imageUrl: string | null; createdAt: Date
      user: { username: string }
      replies: { id: string; body: string; createdAt: Date; user: { username: string } }[]
      upvotes: { userId: string }[]
    }) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      replies: p.replies.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    }))

    if (gearSetting?.value) {
      try { gear = JSON.parse(gearSetting.value) } catch { /* use default */ }
    }
    tackleHidden = tackleSetting?.value === '1'
  } catch { /* DB not configured */ }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {session?.user && <SkillVisitTracker skill={'FISHING' as SkillType} />}

      <SkillHeroBar
        skill={getSkillBySlug('fishing')!}
        communityXp={communityXp}
        memberCount={memberCount}
        postCount={stats.totalCatches}
        isLoggedIn={!!session?.user}
      />

      {/* ── Fishing Stats ───────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>📊</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.water, letterSpacing: '0.1em' }}>
              CATCH LOG STATS
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatChip
            value={stats.totalCatches.toString()}
            label="TOTAL CATCHES"
          />
          <StatChip
            value={stats.biggestWeight > 0 ? `${stats.biggestWeight} lbs` : '—'}
            sub={stats.biggestSpecies || undefined}
            label="BIGGEST CATCH"
          />
          <StatChip
            value={stats.topSpecies}
            label="TOP SPECIES"
          />
          <StatChip
            value={stats.favBait}
            label="FAVORITE BAIT"
          />
        </div>
      </div>

      {/* ── Tackle Box ──────────────────────────────────────── */}
      {(!tackleHidden || isAdmin) && (
      <div style={{
        background: S.card,
        border: `1px solid ${S.border}`,
        padding: '18px 18px 20px',
        opacity: tackleHidden ? 0.5 : 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚓</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              TACKLE BOX
            </span>
            <span style={{
              fontSize: 7, fontFamily: "'Press Start 2P', monospace", color: S.goldDim,
              background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.18)`,
              padding: '2px 7px', letterSpacing: '0.08em',
            }}>MY GEAR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && <TackleBoxToggle hidden={tackleHidden} />}
            {isAdmin && (
              <Link href="/admin" style={{ fontSize: 11, color: S.text3, fontFamily: 'Inter, sans-serif', textDecoration: 'none' }}>
                + Edit gear
              </Link>
            )}
          </div>
        </div>

        {!tackleHidden && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 10 }}>
          {gear.map(item => {
            const hasLink = item.url.trim().length > 0
            const tileBase: React.CSSProperties = {
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 5, padding: '12px 8px',
              background: S.elevated,
              border: `1px solid ${S.borderDim}`,
              cursor: hasLink ? 'pointer' : 'default',
              textDecoration: 'none',
            }
            if (hasLink) return (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" style={tileBase}
                className="gear-tile">
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c8b880', textAlign: 'center', lineHeight: 1.3 }}>{item.name}</span>
                <span style={{ fontSize: 9, color: S.goldDim, fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.06em' }}>{item.category}</span>
                <span style={{ fontSize: 9, color: '#7a6030' }}>↗</span>
              </a>
            )
            return (
              <div key={item.id} style={tileBase} className="gear-tile-dead">
                <span style={{ fontSize: 28, lineHeight: 1 }}>{item.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#5a5030', textAlign: 'center', lineHeight: 1.3 }}>{item.name}</span>
                <span style={{ fontSize: 9, color: '#2a2010', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.06em' }}>{item.category}</span>
                <span style={{ fontSize: 8, color: '#2a2010' }}>link soon</span>
              </div>
            )
          })}
        </div>
        )}
      </div>
      )}

      {/* ── Catch Log ───────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>🐟</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.water, letterSpacing: '0.1em' }}>
              CATCH LOG
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
        </div>

        {/* Post form or login CTA */}
        <div style={{ marginBottom: 24 }}>
          {session?.user ? (
            <FishingCatchForm />
          ) : (
            <div style={{
              background: S.card, border: `1px solid ${S.border}`,
              padding: '28px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🎣</div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700,
                color: S.text1, marginBottom: 8,
              }}>Share your catches with the guild</div>
              <div style={{
                fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, marginBottom: 22,
              }}>
                Log catches with photos, species, size, bait &amp; conditions — earn <strong style={{ color: S.gold }}>+50 Fishing XP</strong> per post.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login" style={{
                  padding: '11px 22px', background: 'transparent',
                  border: `1px solid rgba(200,155,60,0.35)`, color: S.water,
                  fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                }}>Log In</Link>
                <Link href="/register" style={{
                  padding: '11px 22px',
                  background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                  color: '#0a0600', fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                }}>🛡 Create Account</Link>
              </div>
            </div>
          )}
        </div>

        {/* Feed */}
        <FishingFeed
          posts={posts}
          currentUserId={session?.user?.id}
          isLoggedIn={!!session?.user}
        />
      </div>
    </div>
  )
}
