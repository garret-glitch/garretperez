import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import { getSkillBySlug } from '@/lib/skills'
import SkillHeroBar from '@/components/SkillHeroBar'
import Link from 'next/link'
import WineFavoriteButton from './WineFavoriteButton'
import FoodRecipeForm from './FoodRecipeForm'
import FoodPostForm from './FoodPostForm'
import WineIdentifier from './WineIdentifier'
import AdminWineSection from './AdminWineSection'
import WineImageEditor from './WineImageEditor'

export const dynamic = 'force-dynamic'

/* ── Design tokens ─────────────────────────────────────────── */
const S = {
  bg:       '#0e0a08',
  card:     '#16120e',
  cardAlt:  '#13100c',
  elevated: '#1c1610',
  borderDim:'rgba(200,155,60,0.12)',
  border:   'rgba(200,155,60,0.24)',
  borderLit:'rgba(200,155,60,0.55)',
  gold:     '#c89b3c',
  goldDim:  '#7a5a20',
  wine:     '#7a1428',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  text4:    '#4a3820',
}

/* ── Tag color config (used for both hardcoded + DB wines) ─── */
const TAG_CONFIG: Record<string, { tagSolid: string; glowColor: string }> = {
  'SWEET RED':   { tagSolid: 'rgba(139,21,32,0.92)',  glowColor: 'rgba(160,30,50,0.35)' },
  'BOLD RED':    { tagSolid: 'rgba(90,14,24,0.95)',   glowColor: 'rgba(120,10,30,0.4)'  },
  'ORGANIC RED': { tagSolid: 'rgba(107,32,16,0.92)',  glowColor: 'rgba(100,20,30,0.32)' },
  'CRISP WHITE': { tagSolid: 'rgba(26,90,48,0.92)',   glowColor: 'rgba(40,110,55,0.22)' },
  'RICH WHITE':  { tagSolid: 'rgba(122,80,16,0.92)',  glowColor: 'rgba(160,110,10,0.28)'},
  'ROSÉ':        { tagSolid: 'rgba(139,32,80,0.92)',  glowColor: 'rgba(160,40,80,0.28)' },
  'SPARKLING':   { tagSolid: 'rgba(58,74,138,0.92)',  glowColor: 'rgba(60,80,140,0.25)' },
}
const DEFAULT_TAG = { tagSolid: 'rgba(100,40,20,0.9)', glowColor: 'rgba(100,40,20,0.25)' }

/* ── Wine data ─────────────────────────────────────────────── */
const WINES = [
  {
    id: 'llano',
    name: 'Llano Estacado Sweet Red',
    image: 'https://www.wolfexpressliquor.com/cdn/shop/files/50-LLANOESTACADOSWEETREDWINE750ML-Photoroom_d157d2f8-9c0d-4949-ae77-cce948e82bc8.jpg',
    origin: 'Texas',
    varietal: 'Syrah, Merlot & Cab',
    abv: '12.4%',
    tag: 'SWEET RED',
    notes: 'Blackberry and cherry aromas with soft tannins and a hint of mint. Medium-sweet, smooth finish. Best value Texas red under $11.',
    pairings: ['🦃 Turkey', '🥩 Brisket', '🌶️ Tex-Mex', '🧀 Cheese', '🍫 Chocolate'],
  },
  {
    id: 'stella',
    name: 'Stella Rosa Black',
    image: 'https://wineonsale.com/cdn/shop/products/Stella_Rosa_Black_bottle_1_1024x.jpg?v=1606254236',
    origin: 'Piedmont, Italy',
    varietal: 'Semi-Sweet Sparkling',
    abv: '5%',
    tag: 'SWEET RED',
    notes: 'Ripe blackberry, blueberry, and raspberry with lush floral aromatics. Naturally sparkling, smooth sweetness — best served well chilled.',
    pairings: ['🍫 Chocolate', '🧀 Manchego', '🍓 Berries', '🍰 Cheesecake', '🌭 Bratwurst'],
  },
  {
    id: 'juggernaut',
    name: 'Juggernaut Cabernet Sauvignon',
    image: 'https://wineonsale.com/cdn/shop/products/Juggernaut_Hillside_Cabernet_Sauvignon_2018_bottle_1024x.png?v=1605128623',
    origin: 'California',
    varietal: '100% Cabernet Sauvignon',
    abv: '14.5%',
    tag: 'BOLD RED',
    notes: 'Blackberry, huckleberry, and toasted oak on the nose. Spiced plum, dark chocolate, velvety tannins and a long satisfying finish.',
    pairings: ['🥩 Ribeye', '🍖 Lamb', '🧀 Aged Cheddar', '🍝 Bolognese', '🍔 Burgers'],
  },
  {
    id: 'matua',
    name: 'Matua Sauvignon Blanc',
    image: 'https://www.kenswineguide.com/images_wine/Matua-2023-Sauvignon-Blanc.gif',
    origin: 'Marlborough, New Zealand',
    varietal: '100% Sauvignon Blanc',
    abv: '13%',
    tag: 'CRISP WHITE',
    notes: 'Vibrant passion fruit, lemon citrus, and gooseberry on the nose. Crisp green melon, lime zest, and cut grass with a clean zesty finish.',
    pairings: ['🦞 Seafood', '🐟 Grilled Fish', '🥗 Fresh Salads', '🧀 Goat Cheese', '🌿 Herb Dishes'],
  },
  {
    id: 'bonterra',
    name: 'Bonterra Cabernet Sauvignon',
    image: '/wines/bonterra-cab.webp',
    origin: 'Mendocino County, California',
    varietal: '100% Cabernet Sauvignon',
    abv: '13.5%',
    tag: 'ORGANIC RED',
    notes: 'Dark cherry, plum, and cedar on the nose. Smooth blackcurrant fruit with a touch of vanilla oak and firm but approachable tannins. Certified organic.',
    pairings: ['🥩 Grilled Steak', '🍖 Lamb Chops', '🧀 Aged Gouda', '🍄 Mushroom Pasta', '🫒 Charcuterie'],
  },
  {
    id: 'breadandbutter',
    name: 'Bread & Butter Chardonnay',
    image: '/wines/bread-and-butter-chard.jpg',
    origin: 'California',
    varietal: '100% Chardonnay',
    abv: '13.5%',
    tag: 'RICH WHITE',
    notes: 'Creamy vanilla, toasted brioche, and ripe peach on the nose. Lush stone fruit with a buttery mid-palate and a smooth, lingering oak finish.',
    pairings: ['🦞 Lobster', '🍗 Roast Chicken', '🧀 Brie', '🍝 Cream Pasta', '🐟 Salmon'],
  },
  {
    id: 'bogle',
    name: 'Bogle Chardonnay',
    image: '/wines/bogle-chard.jpg',
    origin: 'California',
    varietal: '100% Chardonnay',
    abv: '13.5%',
    tag: 'CRISP WHITE',
    notes: 'Apple, pear, and light citrus on the nose with subtle vanilla oak. Bright and food-friendly with a clean, refreshing finish. Exceptional everyday value.',
    pairings: ['🍗 Grilled Chicken', '🦐 Shrimp', '🥗 Caesar Salad', '🧀 Mild Cheese', '🐟 Fish Tacos'],
  },
]

/* ── Page ──────────────────────────────────────────────────── */
export default async function FoodPage() {
  const session = await auth()

  let communityXp = 0
  let communityMemberCount = 0
  let recipes: Array<{
    id: string; title: string; description: string
    ingredients: string; instructions: string
    createdAt: Date; user: { username: string }
  }> = []
  let posts: Array<{
    id: string; title: string; body: string
    createdAt: Date; user: { username: string }
  }> = []

  let dbWines: Array<{ id: string; name: string; image: string; origin: string; varietal: string; abv: string; tag: string; notes: string; pairings: string }> = []
  let wineImageOverrides: Record<string, string> = {}

  try {
    const communityData = await getCommunityXpForSkill('FOOD')
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' }, take: 20,
      include: { user: { select: { username: true } } },
    })
    posts = await prisma.post.findMany({
      where: { skill: 'FOOD' },
      orderBy: { createdAt: 'desc' }, take: 10,
      include: { user: { select: { username: true } } },
    })
    dbWines = await (prisma as any).featuredWine.findMany({ orderBy: { createdAt: 'asc' } })
    const overrideRows = await (prisma as any).siteSetting.findMany({
      where: { key: { startsWith: 'wine-img-' } },
    }) as Array<{ key: string; value: string }>
    wineImageOverrides = Object.fromEntries(overrideRows.map((r: { key: string; value: string }) => [r.key.replace('wine-img-', ''), r.value]))
  } catch { /* DB not configured */ }

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <SkillHeroBar
        skill={getSkillBySlug('food')!}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        postCount={posts.length}
        isLoggedIn={!!session?.user}
      />

      {/* ── FEATURED WINES ───────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🍷</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              FEATURED WINES
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        {/* Combined hardcoded + admin-added wines */}
        {(() => {
          type WineEntry = { id: string; name: string; image: string; origin: string; varietal: string; abv: string; tag: string; notes: string; pairings: string[]; fromDb?: boolean }
          const allWines: WineEntry[] = [
            ...WINES.map(w => ({ ...w, image: wineImageOverrides[w.id] ?? w.image })),
            ...dbWines.map(w => ({ ...w, pairings: JSON.parse(w.pairings || '[]') as string[], fromDb: true })),
          ]
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {allWines.map(wine => {
                const tc = TAG_CONFIG[wine.tag] ?? DEFAULT_TAG
                return (
                  <div
                    key={wine.id}
                    className="wine-card"
                    style={{
                      background: '#0a0810',
                      border: `1px solid rgba(200,155,60,0.18)`,
                      borderRadius: 12, overflow: 'hidden',
                      boxShadow: `0 8px 40px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)`,
                      display: 'flex', flexDirection: 'column', position: 'relative',
                    }}
                  >
                    {/* ── Image — fills top half edge-to-edge ── */}
                    <div className="wine-img-top" style={{ position: 'relative', overflow: 'hidden', height: 280 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={wine.image}
                        alt={wine.name}
                        style={{
                          position: 'absolute', inset: 0,
                          width: '100%', height: '100%',
                          objectFit: 'cover', objectPosition: 'center',
                          display: 'block',
                        }}
                      />
                      {/* Bottom fade so info panel blends in */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #09070e 0%, transparent 100%)', pointerEvents: 'none', zIndex: 1 }} />

                      {/* Left-edge ribbon */}
                      <div style={{ position: 'absolute', top: 16, left: 0, zIndex: 3, background: tc.tagSolid, padding: '6px 13px', borderRadius: '0 4px 4px 0', fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#f5ede0', letterSpacing: '0.1em', boxShadow: '2px 2px 10px rgba(0,0,0,0.55)' }}>
                        {wine.tag}
                      </div>

                      {/* Favorite */}
                      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 3 }}>
                        <WineFavoriteButton label={wine.name} />
                      </div>

                      {/* ABV */}
                      <div style={{ position: 'absolute', bottom: 14, right: 13, zIndex: 3, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: 'rgba(200,155,60,0.85)', textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
                        {wine.abv} ABV
                      </div>

                      {/* Admin: edit image button on every card */}
                      {session?.user?.role === 'ADMIN' && (
                        <WineImageEditor wineId={wine.id} isDb={wine.fromDb} />
                      )}

                      {/* Admin delete (DB wines only) */}
                      {wine.fromDb && session?.user?.role === 'ADMIN' && (
                        <AdminWineSection wineId={wine.id} deleteOnly />
                      )}
                    </div>

                    {/* ── Info panel ── */}
                    <div className="wine-card-body" style={{ padding: '15px 16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, background: '#09070e', borderTop: `1px solid rgba(200,155,60,0.1)` }}>
                      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 800, color: S.text1, lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0 }}>
                        {wine.name}
                      </h3>

                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        {[wine.origin, wine.varietal].map(t => (
                          <span key={t} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text3, background: 'rgba(200,155,60,0.06)', border: `1px solid rgba(200,155,60,0.14)`, padding: '3px 8px', borderRadius: 4 }}>{t}</span>
                        ))}
                      </div>

                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text2, lineHeight: 1.68, margin: 0, flex: 1, fontStyle: 'italic' }}>
                        {wine.notes}
                      </p>

                      {wine.pairings.length > 0 && (
                        <div style={{ borderTop: `1px solid rgba(200,155,60,0.09)`, paddingTop: 11 }}>
                          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 5.5, color: S.goldDim, letterSpacing: '0.14em', marginBottom: 8 }}>PAIRS WITH</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {wine.pairings.map(p => (
                              <span key={p} className="food-pill" style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text2, background: 'rgba(200,155,60,0.06)', border: `1px solid rgba(200,155,60,0.17)`, padding: '4px 9px', borderRadius: 20 }}>{p}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Admin add wine */}
        {session?.user?.role === 'ADMIN' && (
          <div style={{ marginTop: 20 }}>
            <AdminWineSection />
          </div>
        )}
      </div>

      {/* ── AI WINE IDENTIFIER (admin only) ─────────────────── */}
      {session?.user?.role === 'ADMIN' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📸</span>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
                WINE IDENTIFIER
              </span>
            </div>
            <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          </div>
          <WineIdentifier />
        </div>
      )}

      {/* ── RECIPE FORM ──────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🍴</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              COMMUNITY RECIPES
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        {session?.user ? (
          <FoodRecipeForm />
        ) : (
          <div style={{
            background: S.card, border: `1px solid ${S.border}`,
            padding: '28px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🍴</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 600, color: S.text1, marginBottom: 8 }}>
              Share your favorite recipes
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, marginBottom: 20 }}>
              Log in to add recipes and earn +50 Food &amp; Wine XP per recipe.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link href="/login" style={{
                padding: '11px 22px', background: 'transparent',
                border: `1px solid rgba(200,155,60,0.35)`, color: S.gold,
                fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>Log In</Link>
              <Link href="/register" style={{
                padding: '11px 22px', background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                color: '#0a0600', fontSize: 14, fontWeight: 700, textDecoration: 'none', fontFamily: 'Inter, sans-serif',
              }}>🛡 Create Account</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── RECIPE CARDS ─────────────────────────────────────── */}
      {recipes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {recipes.map(recipe => {
            let ingredients: string[] = []
            try { ingredients = JSON.parse(recipe.ingredients) }
            catch { ingredients = recipe.ingredients.split('\n').filter(Boolean) }
            return (
              <div
                key={recipe.id}
                className="recipe-card"
                style={{
                  background: S.card, border: `1px solid rgba(200,155,60,0.18)`,
                  borderLeft: `3px solid rgba(130,20,48,0.6)`,
                  borderRadius: 10, padding: '22px 24px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 17, fontWeight: 700, color: S.text1, marginBottom: 4, lineHeight: 1.3 }}>
                      {recipe.title}
                    </h3>
                    {recipe.description && (
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, fontStyle: 'italic', marginBottom: 4 }}>
                        {recipe.description}
                      </p>
                    )}
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4 }}>
                      by {recipe.user.username} · {new Date(recipe.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(200,155,60,0.08)', border: `1px solid rgba(200,155,60,0.2)`,
                    padding: '6px 12px', flexShrink: 0,
                    fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim,
                    letterSpacing: '0.06em',
                  }}>
                    🍴 RECIPE
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${S.borderDim}`, paddingTop: 16 }}>
                  <div className="food-form-grid" style={{ gap: 20 }}>
                    {/* Ingredients */}
                    <div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em', marginBottom: 10 }}>
                        INGREDIENTS
                      </div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {ingredients.map((ing, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{ color: S.gold, fontSize: 10, marginTop: 3, flexShrink: 0 }}>◆</span>
                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.5 }}>{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Instructions */}
                    <div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em', marginBottom: 10 }}>
                        INSTRUCTIONS
                      </div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2, lineHeight: 1.75, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {recipe.instructions}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── FOOD DISCUSSIONS ─────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: S.gold, letterSpacing: '0.1em' }}>
              FOOD DISCUSSIONS
            </span>
          </div>
          <div style={{ height: 1, flex: 1, background: 'rgba(200,155,60,0.15)' }} />
        </div>

        {session?.user && (
          <div style={{ marginBottom: 16 }}>
            <FoodPostForm />
          </div>
        )}

        {posts.length === 0 && !session?.user && (
          <div style={{
            background: S.card, border: `1px solid ${S.borderDim}`,
            padding: '28px', textAlign: 'center',
            fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text4,
          }}>
            No food discussions yet —{' '}
            <Link href="/login" style={{ color: S.gold, textDecoration: 'underline' }}>log in</Link>
            {' '}to start one!
          </div>
        )}

        {posts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map(post => (
              <div
                key={post.id}
                className="food-post-card"
                style={{
                  background: S.card, border: `1px solid rgba(200,155,60,0.16)`,
                  borderRadius: 8, padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: S.text1 }}>
                    {post.title}
                  </h3>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, whiteSpace: 'nowrap' }}>
                    by {post.user.username} · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

