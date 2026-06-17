import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const LOWER_IS_BETTER = new Set(['matching'])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // super admins (who can play with god mode) never post to the leaderboards
  if (session.user.superAdmin) {
    return NextResponse.json({ updated: false, skipped: 'superadmin' })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body.game !== 'string' || typeof body.score !== 'number') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { game, score } = body
  const userId = session.user.id

  try {
    const existing = await (prisma as any).gameBest.findUnique({
      where: { userId_game: { userId, game } },
    })

    const lowerBetter = LOWER_IS_BETTER.has(game)
    const shouldUpdate = !existing ||
      (lowerBetter ? score < existing.score : score > existing.score)

    if (shouldUpdate) {
      await (prisma as any).gameBest.upsert({
        where: { userId_game: { userId, game } },
        update: { score },
        create: { userId, game, score },
      })
      return NextResponse.json({ updated: true })
    }

    return NextResponse.json({ updated: false })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
