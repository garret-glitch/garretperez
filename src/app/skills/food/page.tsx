import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpProgress } from '@/lib/xp'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import CommunityLevelCard from '@/components/CommunityLevelCard'
import Link from 'next/link'
import WineFavoriteButton from './WineFavoriteButton'
import FoodRecipeForm from './FoodRecipeForm'
import FoodPostForm from './FoodPostForm'

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
    tagColor: 'rgba(180,40,60,0.7)',
    glowColor: 'rgba(160,30,50,0.28)',
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
    tagColor: 'rgba(160,30,60,0.7)',
    glowColor: 'rgba(140,20,50,0.28)',
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
    tagColor: 'rgba(140,20,40,0.75)',
    glowColor: 'rgba(120,10,30,0.32)',
    notes: 'Blackberry, huckleberry, and toasted oak on the nose. Spiced plum, dark chocolate, velvety tannins and a long satisfying finish.',
    pairings: ['🥩 Ribeye', '🍖 Lamb', '🧀 Aged Cheddar', '🍝 Bolognese', '🍔 Burgers'],
  },
  {
    id: 'matua',
    name: 'Matua Sauvignon Blanc',
    image: 'https://www.kenswineguide.com/images_wine/Matua-2023-Sauvignon-Blanc.gif',
    noMask: true,
    origin: 'Marlborough, New Zealand',
    varietal: '100% Sauvignon Blanc',
    abv: '13%',
    tag: 'CRISP WHITE',
    tagColor: 'rgba(50,130,70,0.7)',
    glowColor: 'rgba(40,100,50,0.2)',
    notes: 'Vibrant passion fruit, lemon citrus, and gooseberry on the nose. Crisp green melon, lime zest, and cut grass with a clean zesty finish.',
    pairings: ['🦞 Seafood', '🐟 Grilled Fish', '🥗 Fresh Salads', '🧀 Goat Cheese', '🌿 Herb Dishes'],
  },
]

/* ── Page ──────────────────────────────────────────────────── */
export default async function FoodPage() {
  const session = await auth()

  let userXp = 0
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
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FOOD' } },
      })
      userXp = userSkill?.xp ?? 0
    }
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

  const xp = xpProgress(userXp)

  return (
    <div style={{ color: S.text1, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HERO HEADER ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(160deg, #181410 0%, #201c14 55%, #181410 100%)',
        border: `2px solid rgba(200,155,60,0.38)`,
        padding: '28px 26px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 5, border: '1px solid rgba(200,155,60,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left: title + subtitle + XP bar */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                <div style={{
                  width: 52, height: 52, flexShrink: 0,
                  background: 'rgba(200,155,60,0.08)', border: '2px solid rgba(200,155,60,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                }}>🍷</div>
                <div>
                  <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#f0d898', letterSpacing: '0.06em', marginBottom: 5 }}>
                    Food &amp; Wine
                  </h1>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, margin: 0 }}>
                    Share recipes, wine picks &amp; food tips. Add a recipe → +50 XP!
                  </p>
                </div>
              </div>

              {/* XP bar (full-width, shown for everyone as a teaser; only meaningful for logged-in users) */}
              {session?.user ? (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.1em' }}>
                      FOOD &amp; WINE XP
                    </span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2 }}>
                      {xp.currentXp.toLocaleString()} / {xp.neededXp.toLocaleString()} XP
                    </span>
                  </div>
                  <div style={{ height: 10, background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(200,155,60,0.2)`, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${xp.percent}%`,
                      background: 'linear-gradient(90deg, #8a5c10, #c89b3c)',
                      transition: 'width 0.8s ease',
                    }} />
                  </div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text4, marginTop: 4 }}>
                    {xp.percent}% to Level {xp.level + 1}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                  <Link href="/login" style={{
                    padding: '9px 18px', background: 'transparent',
                    border: `1px solid rgba(200,155,60,0.35)`, color: S.gold,
                    fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}>Log In</Link>
                  <Link href="/register" style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                    color: '#0a0600', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none', fontFamily: 'Inter, sans-serif',
                  }}>🛡 Join &amp; Earn XP</Link>
                </div>
              )}
            </div>

            {/* Right: stat cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
              {session?.user && (
                <div style={{
                  width: 200,
                  background: S.card, border: `1px solid rgba(200,155,60,0.28)`,
                  padding: '18px 20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: S.goldDim, letterSpacing: '0.12em', marginBottom: 12 }}>
                    MY SKILL
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
              <CommunityLevelCard xp={communityXp} memberCount={communityMemberCount} />
            </div>
          </div>
        </div>
      </div>

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

        <div className="grid sm:grid-cols-2 gap-6">
          {WINES.map(wine => (
            <div
              key={wine.id}
              className="wine-card"
              style={{
                background: S.card,
                border: `2px solid rgba(200,155,60,0.28)`,
                borderRadius: 16, overflow: 'hidden',
                boxShadow: `0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,155,60,0.06)`,
              }}
            >
              {/* ── Bottle stage ── */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: `
                  radial-gradient(ellipse 60% 80% at 50% 80%, ${wine.glowColor ?? 'rgba(120,20,40,0.22)'} 0%, transparent 70%),
                  radial-gradient(ellipse 80% 60% at 50% 30%, rgba(200,155,60,0.06) 0%, transparent 65%),
                  linear-gradient(180deg, #0c0a08 0%, #14100c 60%, #0e0b09 100%)
                `,
                minHeight: 280,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 24,
              }}>
                {/* Gold accent line at top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, rgba(200,155,60,0.5) 40%, rgba(200,155,60,0.5) 60%, transparent)`,
                }} />

                {/* Wine type tag — top left */}
                <div style={{
                  position: 'absolute', top: 16, left: 18,
                  background: wine.tagColor, backdropFilter: 'blur(4px)',
                  color: '#f0e8d8',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  padding: '5px 10px', letterSpacing: '0.08em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}>
                  {wine.tag}
                </div>

                {/* Favorite — top right */}
                <div style={{ position: 'absolute', top: 10, right: 12 }}>
                  <WineFavoriteButton label={wine.name} />
                </div>

                {/* Bottle image — the hero */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wine.image}
                  alt={wine.name}
                  className="wine-bottle"
                  style={{
                    height: 210, width: 'auto', maxWidth: 140,
                    objectFit: 'contain', display: 'block',
                    filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.75)) drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                    ...(wine.noMask ? {} : {
                      maskImage: 'radial-gradient(ellipse 46% 88% at 50% 48%, black 18%, transparent 68%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 46% 88% at 50% 48%, black 18%, transparent 68%)',
                    }),
                    position: 'relative', zIndex: 1,
                  }}
                />

                {/* Subtle floor reflection */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent)',
                  pointerEvents: 'none',
                }} />
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '22px 24px 26px' }}>
                {/* Name */}
                <h3 style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 20, fontWeight: 800,
                  color: S.text1, marginBottom: 10, lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                }}>
                  {wine.name}
                </h3>

                {/* Meta pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                  {[wine.origin, wine.varietal].map(t => (
                    <span key={t} style={{
                      fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3,
                      background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.16)`,
                      padding: '4px 10px', borderRadius: 4,
                    }}>{t}</span>
                  ))}
                  <span style={{
                    fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.gold,
                    fontWeight: 700, background: 'rgba(200,155,60,0.1)',
                    border: '1px solid rgba(200,155,60,0.25)', padding: '4px 10px', borderRadius: 4,
                  }}>
                    {wine.abv} ABV
                  </span>
                </div>

                {/* Tasting notes */}
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text2,
                  lineHeight: 1.78, marginBottom: 20,
                }}>
                  {wine.notes}
                </p>

                {/* Pairings */}
                <div style={{ borderTop: `1px solid rgba(200,155,60,0.1)`, paddingTop: 18 }}>
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                    color: S.goldDim, letterSpacing: '0.14em', marginBottom: 12,
                  }}>
                    PAIRS WITH
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {wine.pairings.map(p => (
                      <span
                        key={p}
                        className="food-pill"
                        style={{
                          fontFamily: 'Inter, sans-serif', fontSize: 13, color: S.text2,
                          background: 'rgba(200,155,60,0.07)', border: `1px solid rgba(200,155,60,0.2)`,
                          padding: '5px 12px', borderRadius: 20,
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

