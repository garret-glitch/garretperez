import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function adminGuard() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const quests = await (prisma as any).quest.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json({ quests })
}

export async function POST(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { icon, title, description, xp, skill, href, active, order } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const quest = await (prisma as any).quest.create({
    data: {
      icon: icon?.trim() || '⚔️',
      title: title.trim(),
      description: description?.trim() || '',
      xp: Number(xp) || 10,
      skill: skill?.trim() || 'All',
      href: href?.trim() || '/',
      active: active !== false,
      order: Number(order) || 0,
    },
  })
  return NextResponse.json({ quest })
}

export async function PUT(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (data.icon !== undefined) update.icon = data.icon
  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description
  if (data.xp !== undefined) update.xp = Number(data.xp)
  if (data.skill !== undefined) update.skill = data.skill
  if (data.href !== undefined) update.href = data.href
  if (data.active !== undefined) update.active = data.active
  if (data.order !== undefined) update.order = Number(data.order)
  const quest = await (prisma as any).quest.update({ where: { id }, data: update })
  return NextResponse.json({ quest })
}

export async function DELETE(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await (prisma as any).quest.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
