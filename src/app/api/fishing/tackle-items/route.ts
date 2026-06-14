import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET() {
  const items = await (prisma as any).fishingTackle.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, image, brand, category, notes, url } = await req.json()
  if (!name || !image || !brand || !category || !notes) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const item = await (prisma as any).fishingTackle.create({ data: { name, image, brand, category, notes, url: url ?? '' } })
  return NextResponse.json(item, { status: 201 })
}
