import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const spots = await (prisma as any).fishingSpot.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(spots)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, image, location, type, notes, tips } = await req.json()
  if (!name || !image || !location || !type || !notes) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const spot = await (prisma as any).fishingSpot.create({ data: { name, image, location, type, notes, tips: tips ?? '' } })
  return NextResponse.json(spot, { status: 201 })
}
