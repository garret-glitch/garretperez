import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const LOWER_IS_BETTER = new Set(['matching'])

export async function GET(
  _req: Request,
  { params }: { params: { game: string } }
) {
  const { game } = params
  const session = await auth()

  try {
    const rows = await (prisma as any).gameBest.findMany({
      where: { game },
      include: { user: { select: { username: true } } },
      orderBy: LOWER_IS_BETTER.has(game)
        ? [{ score: 'asc' }, { updatedAt: 'asc' }]
        : [{ score: 'desc' }, { updatedAt: 'asc' }],
      take: 10,
    })

    const currentUserId = session?.user?.id ?? null
    const entries = rows.map((r: any, i: number) => ({
      rank: i + 1,
      username: r.user.username,
      score: r.score,
      isCurrentUser: r.userId === currentUserId,
    }))

    return NextResponse.json(entries)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json([])
  }
}
