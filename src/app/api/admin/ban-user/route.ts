import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { userId } = body
  const banned: boolean = body.banned ?? body.ban ?? false
  await (prisma as any).user.update({ where: { id: userId }, data: { banned } })
  return NextResponse.json({ success: true })
}
