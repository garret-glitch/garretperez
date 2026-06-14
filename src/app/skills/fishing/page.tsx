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
import AdminSpotSection from './AdminSpotSection'
import AdminTackleItemSection from './AdminTackleItemSection'

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

/* ── Spot / tackle colour maps ─────────────────────────────────── */
const SPOT_CONFIG: Record<string, { tagSolid: string }> = {
  'RIVER':     { tagSolid: 'rgba(22,90,55,0.92)'  },
  'LAKE':      { tagSolid: 'rgba(18,55,110,0.92)' },
  'OCEAN':     { tagSolid: 'rgba(10,30,80,0.95)'  },
  'POND':      { tagSolid: 'rgba(30,80,40,0.92)'  },
  'CREEK':     { tagSolid: 'rgba(20,75,65,0.92)'  },
  'RESERVOIR': { tagSolid: 'rgba(25,55,90,0.92)'  },
  'BEACH':     { tagSolid: 'rgba(130,80,20,0.92)' },
  'BAY':       { tagSolid: 'rgba(15,40,90,0.92)'  },
}
const DEFAULT_SPOT = { tagSolid: 'rgba(40,60,80,0.92)' }

const TACKLE_CONFIG: Record<string, { tagSolid: string }> = {
  'Rods':        { tagSolid: 'rgba(100,55,20,0.92)' },
  'Reels':       { tagSolid: 'rgba(55,60,70,0.95)'  },
  'Lures':       { tagSolid: 'rgba(160,65,15,0.92)' },
  'Bait':        { tagSolid: 'rgba(70,80,30,0.92)'  },
  'Line':        { tagSolid: 'rgba(40,75,110,0.92)' },
  'Accessories': { tagSolid: 'rgba(80,50,30,0.92)'  },
}
const DEFAULT_TACKLE = { tagSolid: 'rgba(60,50,30,0.92)' }

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
          fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2,
          lineHeight: 1.3,
        }}>{sub}</span>
      )}
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700,
        color: S.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4,
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
  let tackleHidden = false
  let statsHidden = false
  let spots: Array<{ id: string; name: string; image: string; location: string; type: string; notes: string; tips: string }> = []
  let tackleItems: Array<{ id: string; name: string; image: string; brand: string; category: string; notes: string; url: string }> = []

  try {
    const communityData = await getCommunityXpForSkill('FISHING' as SkillType)
    communityXp = communityData.xp
    memberCount  = communityData.memberCount

    const [allBodies, rawPosts, tackleSetting, statsSetting, rawSpots, rawTackleItems] = await Promise.all([
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
      (prisma as any).siteSetting.findUnique({ where: { key: 'fishing_tackle_hidden' } }),
      (prisma as any).siteSetting.findUnique({ where: { key: 'fishing_stats_hidden' } }),
      (prisma as any).fishingSpot.findMany({ orderBy: { createdAt: 'asc' } }),
      (prisma as any).fishingTackle.findMany({ orderBy: { createdAt: 'asc' } }),
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

    tackleHidden = tackleSetting?.value === '1'
    statsHidden  = statsSetting?.value === '1'
    spots = rawSpots
    tackleItems = rawTackleItems
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
      {(!statsHidden || isAdmin) && (
      <div style={{ opacity: statsHidden ? 0.5 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>📊</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: S.water, letterSpacing: '0.1em' }}>
              CATCH LOG STATS
            </span>
            {isAdmin && <TackleBoxToggle hidden={statsHidden} settingKey="fishing_stats_hidden" />}
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
        </div>

        {!statsHidden && (
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
        )}
      </div>
      )}

      {/* ── Favorite Locations ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>📍</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: S.water, letterSpacing: '0.1em' }}>
              FAVORITE SPOTS
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.12)' }} />
        </div>

        {spots.length === 0 && !isAdmin && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No spots added yet.</div>
        )}

        {spots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginBottom: 16 }}>
            {spots.map(spot => {
              const sc = SPOT_CONFIG[spot.type] ?? DEFAULT_SPOT
              const speciesList = spot.tips ? spot.tips.split(',').map((t: string) => t.trim()).filter(Boolean) : []
              return (
                <div key={spot.id} style={{ background: '#0a0810', border: '1px solid rgba(200,155,60,0.18)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ position: 'relative', overflow: 'hidden', height: 240 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spot.image} alt={spot.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #09070e 0%, transparent 100%)', pointerEvents: 'none', zIndex: 1 }} />
                    <div style={{ position: 'absolute', top: 16, left: 0, zIndex: 3, background: sc.tagSolid, padding: '7px 14px', borderRadius: '0 4px 4px 0', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 11, color: '#f5ede0', letterSpacing: '0.06em', boxShadow: '2px 2px 10px rgba(0,0,0,0.55)' }}>
                      {spot.type}
                    </div>
                    {isAdmin && <AdminSpotSection spotId={spot.id} deleteOnly />}
                  </div>
                  <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, background: '#09070e', borderTop: '1px solid rgba(200,155,60,0.1)' }}>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 800, color: S.text1, lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>{spot.name}</h3>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2, background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.14)', padding: '4px 10px', borderRadius: 4, alignSelf: 'flex-start' }}>{spot.location}</span>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.65, margin: 0, flex: 1 }}>{spot.notes}</p>
                    {speciesList.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(200,155,60,0.09)', paddingTop: 10 }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 11, color: S.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Best Species</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {speciesList.map((s: string) => (
                            <span key={s} style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2, background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.17)', padding: '4px 10px', borderRadius: 20 }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: spots.length > 0 ? 4 : 0 }}>
            <AdminSpotSection />
          </div>
        )}
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
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: S.gold, letterSpacing: '0.1em' }}>
              TACKLE BOX
            </span>
            <span style={{
              fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: S.goldDim,
              background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.18)`,
              padding: '3px 9px', letterSpacing: '0.06em',
            }}>MY GEAR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isAdmin && <TackleBoxToggle hidden={tackleHidden} settingKey="fishing_tackle_hidden" />}
          </div>
        </div>

        {!tackleHidden && (
        <div>
          {tackleItems.length === 0 && !isAdmin && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: S.text4, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>No tackle added yet.</div>
          )}
          {tackleItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginBottom: 16 }}>
              {tackleItems.map(item => {
                const tc = TACKLE_CONFIG[item.category] ?? DEFAULT_TACKLE
                return (
                  <div key={item.id} style={{ background: '#0a0810', border: '1px solid rgba(200,155,60,0.18)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <div style={{ position: 'relative', overflow: 'hidden', height: 240 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #09070e 0%, transparent 100%)', pointerEvents: 'none', zIndex: 1 }} />
                      <div style={{ position: 'absolute', top: 16, left: 0, zIndex: 3, background: tc.tagSolid, padding: '7px 14px', borderRadius: '0 4px 4px 0', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 11, color: '#f5ede0', letterSpacing: '0.06em', boxShadow: '2px 2px 10px rgba(0,0,0,0.55)' }}>
                        {item.category}
                      </div>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: 14, right: 13, zIndex: 3, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: 'rgba(200,155,60,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.9)', textDecoration: 'none' }}>
                          Buy ↗
                        </a>
                      )}
                      {isAdmin && <AdminTackleItemSection itemId={item.id} deleteOnly />}
                    </div>
                    <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8, background: '#09070e', borderTop: '1px solid rgba(200,155,60,0.1)' }}>
                      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 800, color: S.text1, lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>{item.name}</h3>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2, background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.14)', padding: '4px 10px', borderRadius: 4, alignSelf: 'flex-start' }}>{item.brand}</span>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.65, margin: 0, flex: 1 }}>{item.notes}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {isAdmin && (
            <div style={{ marginTop: tackleItems.length > 0 ? 4 : 0 }}>
              <AdminTackleItemSection />
            </div>
          )}
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
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: S.water, letterSpacing: '0.1em' }}>
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
