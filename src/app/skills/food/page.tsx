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

      {/* ── Featured Wine ───────────────────────────────── */}
      <div className="osrs-panel-dark rounded-xl" style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>🍷</span>
          <span style={{ fontSize: 7, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Featured Wine
          </span>
        </div>

        {/* Bottle + Info */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <img
            src="https://www.wolfexpressliquor.com/cdn/shop/files/50-LLANOESTACADOSWEETREDWINE750ML-Photoroom_d157d2f8-9c0d-4949-ae77-cce948e82bc8.jpg"
            alt="Llano Estacado Sweet Red Wine"
            style={{ width: 72, flexShrink: 0, objectFit: 'contain', display: 'block' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f0d898', fontFamily: 'Inter, sans-serif', marginBottom: 3 }}>
              Llano Estacado Sweet Red
            </div>
            <div style={{ fontSize: 9, color: '#9a7848', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
              Texas · Syrah, Merlot &amp; Cabernet Blend · 12.4% ABV
            </div>
            <p className="body-text" style={{ fontSize: 11, color: '#c8b890', lineHeight: 1.7, margin: 0 }}>
              Alluring blackberry and cherry aromas lead into a medium-sweet palate with soft, round tannins and a hint of mint in the finish.
              Rich plum in the glass, smooth on the palate — an approachable Texas red that bridges sweet whites and dry reds without compromise.
              Under $11 and consistently one of the best values in the Lone Star state.
            </p>
          </div>
        </div>

        {/* Pairings */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(200,155,60,0.2)' }}>
          <div style={{ fontSize: 6.5, color: '#c89b3c', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 9 }}>
            Pairs Well With
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[
              '🦃 Turkey & Chicken',
              '🥩 Brisket & Beef',
              '🍕 Italian',
              '🌶️ Tex-Mex',
              '🧀 Cheese Boards',
              '🍫 Dark Chocolate',
            ].map(pair => (
              <span
                key={pair}
                className="body-text"
                style={{
                  fontSize: 11, color: '#b09060',
                  background: 'rgba(200,155,60,0.07)',
                  border: '1px solid rgba(200,155,60,0.22)',
                  padding: '4px 10px',
                }}
              >
                {pair}
              </span>
            ))}
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
