import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function adminGuard() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

export async function POST(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, badge } = await req.json()
  if (!userId || !badge) return NextResponse.json({ error: 'userId and badge required' }, { status: 400 })
  await (prisma as any).userBadge.upsert({
    where: { userId_badge: { userId, badge } },
    create: { userId, badge },
    update: {},
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, badge } = await req.json()
  if (!userId || !badge) return NextResponse.json({ error: 'userId and badge required' }, { status: 400 })
  try {
    await (prisma as any).userBadge.delete({ where: { userId_badge: { userId, badge } } })
  } catch { /* already gone */ }
  return NextResponse.json({ ok: true })
}
