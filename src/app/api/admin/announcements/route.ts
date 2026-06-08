import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const announcements = await (prisma as any).announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ announcements })
}
