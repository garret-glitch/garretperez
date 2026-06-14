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
    tagColor: '#8b1520',
    tagSolid: 'rgba(139,21,32,0.92)',
    glowColor: 'rgba(160,30,50,0.35)',
    score: 92,
    editTag: 'HOUSE FAVE',
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
    tagColor: '#6e1040',
    tagSolid: 'rgba(110,16,64,0.92)',
    glowColor: 'rgba(140,20,60,0.32)',
    score: 88,
    editTag: 'CROWD PLEASER',
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
    tagColor: '#5a0e18',
    tagSolid: 'rgba(90,14,24,0.95)',
    glowColor: 'rgba(120,10,30,0.4)',
    score: 94,
    editTag: 'MUST HAVE',
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
    tagColor: '#1a5a30',
    tagSolid: 'rgba(26,90,48,0.92)',
    glowColor: 'rgba(40,110,55,0.22)',
    score: 91,
    editTag: 'DAILY SIP',
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
    tagColor: '#6b2010',
    tagSolid: 'rgba(107,32,16,0.92)',
    glowColor: 'rgba(100,20,30,0.32)',
    score: 90,
    editTag: 'CERTIFIED',
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
    tagColor: '#7a5010',
    tagSolid: 'rgba(122,80,16,0.92)',
    glowColor: 'rgba(160,110,10,0.28)',
    score: 89,
    editTag: 'HOUSE FAVE',
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
    tagColor: '#6a4a12',
    tagSolid: 'rgba(106,74,18,0.92)',
    glowColor: 'rgba(140,100,10,0.25)',
    score: 87,
    editTag: 'BEST VALUE',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WINES.map(wine => (
            <div
              key={wine.id}
              className="wine-card"
              style={{
                background: '#0a0810',
                border: `1px solid rgba(200,155,60,0.18)`,
                borderRadius: 12, overflow: 'hidden',
                boxShadow: `0 8px 40px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5)`,
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* ── Bottle showcase ── */}
              <div style={{
                position: 'relative', overflow: 'hidden', height: 320,
                background: `
                  radial-gradient(ellipse 75% 55% at 50% 80%, ${wine.glowColor} 0%, transparent 68%),
                  radial-gradient(ellipse 90% 30% at 50% 46%, rgba(90,52,8,0.13) 0%, transparent 100%),
                  linear-gradient(180deg, #080612 0%, #14091a 18%, #1c1020 40%, #160c10 65%, #0a0607 100%)
                `,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>

                {/* Vineyard horizon atmospheric layer */}
                <div style={{
                  position: 'absolute', top: '24%', left: 0, right: 0, height: '22%',
                  background: 'radial-gradient(ellipse 80% 100% at 50% 50%, rgba(95,55,8,0.1) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Ground shadow / depth fog */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%',
                  background: 'linear-gradient(to top, rgba(4,2,8,0.82) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Left-edge ribbon — wine type */}
                <div style={{
                  position: 'absolute', top: 18, left: 0, zIndex: 3,
                  background: wine.tagSolid,
                  padding: '6px 13px 6px 13px',
                  borderRadius: '0 4px 4px 0',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                  color: '#f5ede0', letterSpacing: '0.1em',
                  boxShadow: '2px 2px 10px rgba(0,0,0,0.55)',
                }}>
                  {wine.tag}
                </div>

                {/* Favorite — top right */}
                <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}>
                  <WineFavoriteButton label={wine.name} />
                </div>

                {/* Bottle image — hero, full label visible */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wine.image}
                  alt={wine.name}
                  className="wine-bottle"
                  style={{
                    height: 230, width: 'auto', maxWidth: 145,
                    objectFit: 'contain', display: 'block',
                    filter: 'drop-shadow(0 14px 32px rgba(0,0,0,0.92)) drop-shadow(0 4px 12px rgba(0,0,0,0.7))',
                    position: 'relative', zIndex: 2,
                  }}
                />

                {/* Score — bottom left */}
                <div style={{ position: 'absolute', bottom: 14, left: 15, zIndex: 3 }}>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 24,
                    color: S.gold, lineHeight: 1,
                    textShadow: '0 0 18px rgba(200,155,60,0.5), 0 2px 4px rgba(0,0,0,0.8)',
                  }}>
                    {wine.score}
                  </div>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 5,
                    color: 'rgba(200,155,60,0.5)', letterSpacing: '0.1em', marginTop: 4,
                  }}>
                    PTS
                  </div>
                </div>

                {/* ABV — bottom right */}
                <div style={{
                  position: 'absolute', bottom: 16, right: 15, zIndex: 3,
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                  color: 'rgba(200,155,60,0.65)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                }}>
                  {wine.abv} ABV
                </div>
              </div>

              {/* ── Info panel ── */}
              <div style={{
                padding: '15px 16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10,
                background: '#09070e',
                borderTop: `1px solid rgba(200,155,60,0.1)`,
              }}>

                {/* Editorial tag + name row */}
                <div>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
                    color: wine.tagColor, letterSpacing: '0.12em', marginBottom: 6,
                    textTransform: 'uppercase',
                  }}>
                    ★ {wine.editTag}
                  </div>
                  <h3 style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 800,
                    color: S.text1, lineHeight: 1.3, letterSpacing: '-0.01em', margin: 0,
                  }}>
                    {wine.name}
                  </h3>
                </div>

                {/* Origin + Varietal pills */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {[wine.origin, wine.varietal].map(t => (
                    <span key={t} style={{
                      fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text3,
                      background: 'rgba(200,155,60,0.06)', border: `1px solid rgba(200,155,60,0.14)`,
                      padding: '3px 8px', borderRadius: 4,
                    }}>{t}</span>
                  ))}
                </div>

                {/* Tasting notes */}
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text2,
                  lineHeight: 1.68, margin: 0, flex: 1,
                  fontStyle: 'italic',
                }}>
                  {wine.notes}
                </p>

                {/* Pairings */}
                <div style={{ borderTop: `1px solid rgba(200,155,60,0.09)`, paddingTop: 11 }}>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
                    color: S.goldDim, letterSpacing: '0.14em', marginBottom: 8,
                  }}>
                    PAIRS WITH
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {wine.pairings.map(p => (
                      <span
                        key={p}
                        className="food-pill"
                        style={{
                          fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text2,
                          background: 'rgba(200,155,60,0.06)', border: `1px solid rgba(200,155,60,0.17)`,
                          padding: '4px 9px', borderRadius: 20,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

