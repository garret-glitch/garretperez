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
      <div className="osrs-panel">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🍳</span>
          <h1 className="text-[14px] text-[#3c2a1e] font-bold">Cooking</h1>
        </div>
        <p className="text-[8px] text-[#5c3d1e]">
          Share recipes and earn XP. Add a recipe → +50 Cooking XP!
        </p>
        {session?.user && (
          <div className="mt-3">
            <XpBar xp={userXp} skillName="Cooking" />
          </div>
        )}
      </div>

      {session?.user ? (
        <RecipeForm />
      ) : (
        <div className="osrs-panel-dark text-[8px] text-[#ffe066] text-center py-3">
          <Link href="/login" className="text-[#ff981f] hover:underline">Login</Link>
          {' '}to add recipes and earn XP!
        </div>
      )}

      {recipes.length > 0 && (
        <div>
          <h2 className="text-[10px] text-[#ffcc44] mb-2">📜 Recipes</h2>
          <div className="space-y-3">
            {recipes.map(recipe => {
              let ingredients: string[] = []
              try {
                ingredients = JSON.parse(recipe.ingredients)
              } catch {
                ingredients = recipe.ingredients.split('\n').filter(Boolean)
              }
              return (
                <div key={recipe.id} className="osrs-panel-dark">
                  <h3 className="text-[10px] text-[#ff981f] font-bold">{recipe.title}</h3>
                  <p className="text-[7px] text-[#c5a882]">
                    by {recipe.user.username} · {new Date(recipe.createdAt).toLocaleDateString()}
                  </p>
                  {recipe.description && (
                    <p className="text-[8px] text-[#ffe066] mt-1">{recipe.description}</p>
                  )}
                  <div className="mt-2">
                    <p className="text-[7px] text-[#ffcc44] font-bold">Ingredients:</p>
                    <ul className="text-[7px] text-[#ffe066] list-disc list-inside mt-1 space-y-0.5">
                      {ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                    </ul>
                  </div>
                  <div className="mt-2">
                    <p className="text-[7px] text-[#ffcc44] font-bold">Instructions:</p>
                    <p className="text-[7px] text-[#ffe066] mt-1 whitespace-pre-wrap leading-relaxed">
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
        <h2 className="text-[10px] text-[#ffcc44] mb-2">💬 Food Discussions</h2>
        {session?.user && <PostForm skillEnum="FOOD" />}
        {!session?.user && posts.length === 0 && (
          <div className="osrs-panel text-[8px] text-[#5c3d1e] text-center py-4">
            No food discussions yet.
          </div>
        )}
        {posts.length > 0 && (
          <div className="space-y-3 mt-3">
            {posts.map(post => (
              <div key={post.id} className="osrs-panel-dark">
                <h3 className="text-[10px] text-[#ff981f] font-bold">{post.title}</h3>
                <p className="text-[7px] text-[#c5a882]">
                  by {post.user.username} · {new Date(post.createdAt).toLocaleDateString()}
                </p>
                <p className="text-[9px] text-[#ffe066] mt-2 whitespace-pre-wrap leading-relaxed">
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
