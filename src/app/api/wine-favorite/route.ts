import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wineId } = await req.json()
  if (!wineId) return NextResponse.json({ error: 'Missing wineId' }, { status: 400 })

  const db = prisma as any
  const existing = await db.wineFavorite.findUnique({
    where: { userId_wineId: { userId: session.user.id, wineId } },
  })

  if (existing) {
    await db.wineFavorite.delete({ where: { id: existing.id } })
    return NextResponse.json({ favorited: false })
  }

  await db.wineFavorite.create({ data: { userId: session.user.id, wineId } })
  return NextResponse.json({ favorited: true })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ favorited: false, favorites: [] })

  const { searchParams } = new URL(req.url)
  const wineId = searchParams.get('wineId')
  const db = prisma as any

  if (wineId) {
    const fav = await db.wineFavorite.findUnique({
      where: { userId_wineId: { userId: session.user.id, wineId } },
    })
    return NextResponse.json({ favorited: !!fav })
  }

  const favorites = await db.wineFavorite.findMany({
    where: { userId: session.user.id },
    include: { wine: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ favorites })
}
