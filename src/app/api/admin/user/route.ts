import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function adminGuard() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

export async function DELETE(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (user.role === 'ADMIN') return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 403 })
  await prisma.user.delete({ where: { id: userId } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, role, newPassword } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const update: Record<string, unknown> = {}
  if (role !== undefined) {
    if (role !== 'USER' && role !== 'ADMIN') return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    update.role = role
  }
  if (newPassword) {
    update.passwordHash = await bcrypt.hash(newPassword, 10)
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  await prisma.user.update({ where: { id: userId }, data: update as any })
  return NextResponse.json({ ok: true })
}
