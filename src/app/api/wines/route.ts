import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const wines = await (prisma as any).featuredWine.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(wines)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { name, image, origin, varietal, abv, tag, notes, pairings } = body
  if (!name || !image || !origin || !varietal || !abv || !tag || !notes)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const wine = await (prisma as any).featuredWine.create({
    data: { name, image, origin, varietal, abv, tag, notes, pairings: JSON.stringify(pairings ?? []) },
  })
  return NextResponse.json(wine)
}
