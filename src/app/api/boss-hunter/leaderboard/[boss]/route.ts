import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Top 10 fastest kills for a boss (0-2). Multiple runs per user are allowed.
export async function GET(_req: Request, { params }: { params: { boss: string } }) {
  const boss = parseInt(params.boss, 10)
  if (Number.isNaN(boss) || boss < 0 || boss > 2) return NextResponse.json([])

  const session = await auth()
  try {
    const rows = await (prisma as any).bossRun.findMany({
      where: { boss },
      include: { user: { select: { username: true } } },
      orderBy: [{ timeMs: 'asc' }, { createdAt: 'asc' }],
      take: 10,
    })
    const uid = session?.user?.id ?? null
    const entries = rows.map((r: any, i: number) => ({
      rank: i + 1,
      username: r.user.username,
      timeMs: r.timeMs,
      isCurrentUser: r.userId === uid,
    }))
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Boss leaderboard error:', error)
    return NextResponse.json([])
  }
}
