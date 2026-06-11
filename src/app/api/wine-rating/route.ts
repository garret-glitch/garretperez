import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { wineId, rating, note } = await req.json()
  if (!wineId || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const db = prisma as any
  const result = await db.wineRating.upsert({
    where: { userId_wineId: { userId: session.user.id, wineId } },
    update: { rating, note: note ? String(note).trim().slice(0, 500) : null },
    create: {
      userId: session.user.id,
      wineId,
      rating,
      note: note ? String(note).trim().slice(0, 500) : null,
    },
  })

  return NextResponse.json({ success: true, rating: result })
}
