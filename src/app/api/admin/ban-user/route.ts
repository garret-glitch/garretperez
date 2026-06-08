import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId, banned } = await req.json()
  await (prisma as any).user.update({ where: { id: userId }, data: { banned } })
  return NextResponse.json({ success: true })
}
