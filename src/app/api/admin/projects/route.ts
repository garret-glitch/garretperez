import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function adminOnly() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return false
  return true
}

export async function GET() {
  if (!await adminOnly()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const projects = await (prisma as any).project.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { icon, title, desc, progress, href, updated, order } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const project = await (prisma as any).project.create({
    data: {
      icon: icon?.trim() || '⚒️',
      title: title.trim(),
      desc: desc?.trim() || '',
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      href: href?.trim() || '/skills/projects',
      updated: updated?.trim() || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      order: Number(order) || 0,
    },
  })
  return NextResponse.json({ project })
}

export async function DELETE(req: NextRequest) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await (prisma as any).project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  if (!await adminOnly()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, icon, title, desc, progress, href, updated, order } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const project = await (prisma as any).project.update({
    where: { id },
    data: {
      ...(icon !== undefined && { icon }),
      ...(title !== undefined && { title }),
      ...(desc !== undefined && { desc }),
      ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
      ...(href !== undefined && { href }),
      ...(updated !== undefined && { updated }),
      ...(order !== undefined && { order: Number(order) }),
    },
  })
  return NextResponse.json({ project })
}
