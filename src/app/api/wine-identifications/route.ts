import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const db = prisma as any
  try {
    const identifications = await db.wineIdentification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: {
        user: { select: { username: true } },
        ratings: { select: { rating: true } },
        _count: { select: { comments: true, favorites: true } },
      },
    })
    return NextResponse.json({ identifications })
  } catch {
    return NextResponse.json({ identifications: [] })
  }
}
