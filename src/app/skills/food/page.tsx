import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import XpBar from '@/components/XpBar'
import RecipeForm from '@/components/RecipeForm'
import PostForm from '@/components/PostForm'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FoodPage() {
  const session = await auth()

  let userXp = 0
  let recipes: Array<{
    id: string; title: string; description: string
    ingredients: string; instructions: string
    createdAt: Date; user: { username: string }
  }> = []
  let posts: Array<{ id: string; title: string; body: string; createdAt: Date; user: { username: string } }> = []

  try {
    if (session?.user?.id) {
      const userSkill = await prisma.userSkill.findUnique({
        where: { userId_skill: { userId: session.user.id, skill: 'FOOD' } },
      })
      userXp = userSkill?.xp ?? 0
    }
    recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { username: true } } },
    })
    posts = await prisma.post.findMany({
      where: { skill: 'FOOD' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { username: true } } },
    })
  } catch {
    // DB not configured
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🍷</span>
          <h1 className="text-[14px] text-[#1a1a1a] font-bold">Food &amp; Wine</h1>
        </div>
        <p className="text-[8px] text-[#3d3d3d]">
          Share recipes, wine picks and food tips. Add a recipe → +50 XP!
        </p>
        {session?.user && (
          <div className="mt-3">
            <XpBar xp={userXp} skillName="Food & Wine" />
          </div>
        )}
      </div>

      {/* ── Featured Wines ──────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }}>🍷</span>
          <span style={{ fontSize: 7, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Featured Wines
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">

          {/* Llano Estacado Sweet Red */}
          <div className="osrs-panel-dark rounded-xl" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <img src="https://www.wolfexpressliquor.com/cdn/shop/files/50-LLANOESTACADOSWEETREDWINE750ML-Photoroom_d157d2f8-9c0d-4949-ae77-cce948e82bc8.jpg" alt="Llano Estacado Sweet Red" style={{ width: 58, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0d898', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Llano Estacado Sweet Red</div>
                <div style={{ fontSize: 9, color: '#9a7848', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Texas · Syrah, Merlot &amp; Cab · 12.4% ABV</div>
                <p className="body-text" style={{ fontSize: 10, color: '#c8b890', lineHeight: 1.65, margin: 0 }}>
                  Blackberry and cherry aromas with soft tannins and a hint of mint. Medium-sweet, smooth finish. Best value Texas red under $11.
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 8 }}>
              <div style={{ fontSize: 6, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.12em', marginBottom: 6 }}>PAIRS WITH</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['🦃 Turkey', '🥩 Brisket', '🌶️ Tex-Mex', '🧀 Cheese', '🍫 Chocolate'].map(p => (
                  <span key={p} className="body-text" style={{ fontSize: 10, color: '#b09060', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)', padding: '3px 8px' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Stella Rosa Black */}
          <div className="osrs-panel-dark rounded-xl" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <img src="https://wineonsale.com/cdn/shop/products/Stella_Rosa_Black_bottle_1_1024x.jpg?v=1606254236" alt="Stella Rosa Black" style={{ width: 58, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0d898', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Stella Rosa Black</div>
                <div style={{ fontSize: 9, color: '#9a7848', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Piedmont, Italy · Semi-Sweet Sparkling · 5% ABV</div>
                <p className="body-text" style={{ fontSize: 10, color: '#c8b890', lineHeight: 1.65, margin: 0 }}>
                  Ripe blackberry, blueberry, and raspberry with lush floral aromatics. Naturally sparkling, smooth sweetness — best served well chilled.
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 8 }}>
              <div style={{ fontSize: 6, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.12em', marginBottom: 6 }}>PAIRS WITH</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['🍫 Chocolate', '🧀 Manchego', '🍓 Berries', '🍰 Cheesecake', '🍕 Bratwurst'].map(p => (
                  <span key={p} className="body-text" style={{ fontSize: 10, color: '#b09060', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)', padding: '3px 8px' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Juggernaut Cabernet Sauvignon */}
          <div className="osrs-panel-dark rounded-xl" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <img src="https://wineonsale.com/cdn/shop/products/Juggernaut_Hillside_Cabernet_Sauvignon_2018_bottle_1024x.png?v=1605128623" alt="Juggernaut Cabernet Sauvignon" style={{ width: 58, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0d898', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Juggernaut Cabernet Sauvignon</div>
                <div style={{ fontSize: 9, color: '#9a7848', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>California · 100% Cabernet Sauvignon · 14.5% ABV</div>
                <p className="body-text" style={{ fontSize: 10, color: '#c8b890', lineHeight: 1.65, margin: 0 }}>
                  Blackberry, huckleberry, and toasted oak on the nose. Spiced plum, black currant, and dark chocolate on the palate with velvety tannins and a long finish.
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 8 }}>
              <div style={{ fontSize: 6, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.12em', marginBottom: 6 }}>PAIRS WITH</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['🥩 Ribeye', '🍖 Lamb', '🧀 Aged Cheddar', '🍝 Bolognese', '🍔 Burgers'].map(p => (
                  <span key={p} className="body-text" style={{ fontSize: 10, color: '#b09060', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)', padding: '3px 8px' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Matua Sauvignon Blanc */}
          <div className="osrs-panel-dark rounded-xl" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <img src="https://www.kenswineguide.com/images_wine/Matua-2023-Sauvignon-Blanc.gif" alt="Matua Sauvignon Blanc" style={{ width: 58, flexShrink: 0, objectFit: 'contain' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f0d898', fontFamily: 'Inter, sans-serif', marginBottom: 2 }}>Matua Sauvignon Blanc</div>
                <div style={{ fontSize: 9, color: '#9a7848', fontFamily: 'Inter, sans-serif', marginBottom: 6 }}>Marlborough, New Zealand · 100% Sauvignon Blanc · 13% ABV</div>
                <p className="body-text" style={{ fontSize: 10, color: '#c8b890', lineHeight: 1.65, margin: 0 }}>
                  Vibrant passion fruit, lemon citrus, and gooseberry on the nose. Crisp green melon, lime zest, and cut grass on the palate with a clean, zesty finish.
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(200,155,60,0.18)', paddingTop: 8 }}>
              <div style={{ fontSize: 6, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", letterSpacing: '0.12em', marginBottom: 6 }}>PAIRS WITH</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {['🦞 Seafood', '🐟 Grilled Fish', '🥗 Fresh Salads', '🧀 Goat Cheese', '🌿 Herb Dishes'].map(p => (
                  <span key={p} className="body-text" style={{ fontSize: 10, color: '#b09060', background: 'rgba(200,155,60,0.07)', border: '1px solid rgba(200,155,60,0.2)', padding: '3px 8px' }}>{p}</span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {session?.user ? (
        <RecipeForm />
      ) : (
        <div className="osrs-panel-dark rounded-xl text-[8px] text-[#d8d8d8] text-center py-3">
          <Link href="/login" className="text-[#a0bcd0] hover:underline">Login</Link>
          {' '}to add recipes and earn XP!
        </div>
      )}

      {recipes.length > 0 && (
        <div>
          <h2 className="text-[10px] text-[#c0c0c0] mb-2">📜 Recipes</h2>
          <div className="space-y-3">
            {recipes.map(recipe => {
              let ingredients: string[] = []
              try {
                ingredients = JSON.parse(recipe.ingredients)
              } catch {
                ingredients = recipe.ingredients.split('\n').filter(Boolean)
              }
              return (
                <div key={recipe.id} className="osrs-panel-dark rounded-xl">
                  <h3 className="text-[10px] text-[#c8c8c8] font-bold">{recipe.title}</h3>
                  <p className="text-[7px] text-[#909090]">
                    by {recipe.user.username} · {new Date(recipe.createdAt).toLocaleDateString()}
                  </p>
                  {recipe.description && (
                    <p className="text-[8px] text-[#d8d8d8] mt-1">{recipe.description}</p>
                  )}
                  <div className="mt-2">
                    <p className="text-[7px] text-[#b8b8b8] font-bold">Ingredients:</p>
                    <ul className="text-[7px] text-[#d8d8d8] list-disc list-inside mt-1 space-y-0.5">
                      {ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  </div>
                  <div className="mt-2">
                    <p className="text-[7px] text-[#b8b8b8] font-bold">Instructions:</p>
                    <p className="text-[7px] text-[#d8d8d8] mt-1 whitespace-pre-wrap leading-relaxed">
                      {recipe.instructions}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[10px] text-[#c0c0c0] mb-2">💬 Food Discussions</h2>
        {session?.user && <PostForm skillEnum="FOOD" />}
        {!session?.user && posts.length === 0 && (
          <div className="osrs-panel rounded-xl text-[8px] text-[#3d3d3d] text-center py-4">
            No food discussions yet.
          </div>
        )}
        {posts.length > 0 && (
          <div className="space-y-3 mt-3">
            {posts.map(post => (
              <div key={post.id} className="osrs-panel-dark rounded-xl">
                <h3 className="text-[10px] text-[#c8c8c8] font-bold">{post.title}</h3>
                <p className="text-[7px] text-[#909090]">
                  by {post.user.username} · {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="text-[9px] text-[#d8d8d8] mt-2 whitespace-pre-wrap leading-relaxed">
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
