import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface Ctx { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await (prisma as any).travelPin.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { name?: string; reason?: string; emoji?: string }

  const pin = await (prisma as any).travelPin.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).slice(0, 100) }),
      ...(body.reason !== undefined && { reason: String(body.reason).slice(0, 500) }),
      ...(body.emoji !== undefined && { emoji: String(body.emoji).slice(0, 8) }),
    },
  })

  return NextResponse.json(pin)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await (prisma as any).travelPin.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await (prisma as any).travelPin.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
