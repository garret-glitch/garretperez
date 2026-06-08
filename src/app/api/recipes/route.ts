import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_PER_POST } from '@/lib/xp'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { title, description, ingredients, instructions } = await req.json()

    if (!title?.trim() || !ingredients || !instructions?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const ingredientList = Array.isArray(ingredients) ? ingredients : [ingredients]

    await prisma.$transaction([
      prisma.recipe.create({
        data: {
          userId: session.user.id,
          title: title.trim().slice(0, 120),
          description: (description ?? '').trim().slice(0, 200),
          ingredients: JSON.stringify(ingredientList.filter((i: string) => i.trim())),
          instructions: instructions.trim(),
        },
      }),
      prisma.userSkill.update({
        where: { userId_skill: { userId: session.user.id, skill: 'FOOD' } },
        data: { xp: { increment: XP_PER_POST } },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Recipe error:', error)
    return NextResponse.json({ error: 'Failed to create recipe.' }, { status: 500 })
  }
}
