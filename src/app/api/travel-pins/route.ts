import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json([])
  }

  const pins = await (prisma as any).travelPin.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(pins)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, reason, emoji, x, y } = body as {
    name?: string
    reason?: string
    emoji?: string
    x?: number
    y?: number
  }

  if (!name || typeof x !== 'number' || typeof y !== 'number') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const pin = await (prisma as any).travelPin.create({
    data: {
      userId: session.user.id,
      name: String(name).slice(0, 100),
      reason: String(reason ?? '').slice(0, 500),
      emoji: String(emoji ?? '📍').slice(0, 8),
      x,
      y,
    },
  })

  return NextResponse.json(pin, { status: 201 })
}
