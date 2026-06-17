import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Record a Boss Hunter fastest-kill run. Users may submit many runs per boss.
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // super admins (who can play with god mode) never post to the leaderboards
  if (session.user.superAdmin) {
    return NextResponse.json({ success: false, skipped: 'superadmin' })
  }

  const body = await req.json().catch(() => null)
  const boss = body?.boss
  const timeMs = body?.timeMs
  if (typeof boss !== 'number' || !Number.isInteger(boss) || boss < 0 || boss > 2) {
    return NextResponse.json({ error: 'Invalid boss' }, { status: 400 })
  }
  if (typeof timeMs !== 'number' || !Number.isFinite(timeMs) || timeMs < 1000 || timeMs > 3_600_000) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }

  const ms = Math.round(timeMs)
  try {
    await (prisma as any).bossRun.create({ data: { userId: session.user.id, boss, timeMs: ms } })
    // global rank of this time for this boss
    const faster = await (prisma as any).bossRun.count({ where: { boss, timeMs: { lt: ms } } })
    return NextResponse.json({ success: true, rank: faster + 1 })
  } catch (error) {
    console.error('Boss run submission error:', error)
    return NextResponse.json({ error: 'Failed to save run' }, { status: 500 })
  }
}
