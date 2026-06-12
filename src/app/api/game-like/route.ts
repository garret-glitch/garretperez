import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { href } = await req.json()
  if (typeof href !== 'string' || !href) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const userId = session.user.id
  const existing = await (prisma as any).gameLike.findUnique({
    where: { userId_gameHref: { userId, gameHref: href } },
  })

  if (existing) {
    await (prisma as any).gameLike.delete({ where: { id: existing.id } })
  } else {
    await (prisma as any).gameLike.create({ data: { userId, gameHref: href } })
  }

  const count = await (prisma as any).gameLike.count({ where: { gameHref: href } })
  return NextResponse.json({ liked: !existing, count })
}
