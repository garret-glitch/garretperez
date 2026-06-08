import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.name !== 'garret') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, title: true, skill: true, createdAt: true,
      user: { select: { username: true } },
    },
  })
  return NextResponse.json({ posts })
}
