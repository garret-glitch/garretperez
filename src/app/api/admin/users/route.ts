import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const rawUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      skills: { select: { xp: true } },
      _count: { select: { posts: true } },
    },
  })
  const users = rawUsers.map(u => ({
    id: u.id,
    username: u.username,
    createdAt: u.createdAt,
    role: u.role,
    banned: u.banned,
    totalXp: u.skills.reduce((s: number, sk: { xp: number }) => s + sk.xp, 0),
    postCount: u._count.posts,
  }))
  return NextResponse.json({ users })
}
