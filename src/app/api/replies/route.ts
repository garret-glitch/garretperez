import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_PER_REPLY } from '@/lib/xp'
import { checkBadges } from '@/lib/badges'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { postId, body } = await req.json()
    if (!postId || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })

    await (prisma as any).postReply.create({
      data: {
        postId,
        userId: session.user.id,
        body: body.trim(),
      },
    })

    await prisma.userSkill.update({
      where: { userId_skill: { userId: session.user.id, skill: post.skill } },
      data: { xp: { increment: XP_PER_REPLY } },
    })

    await checkBadges(session.user.id, 'reply')

    return NextResponse.json({ success: true, xpAwarded: XP_PER_REPLY })
  } catch (error) {
    console.error('Reply error:', error)
    return NextResponse.json({ error: 'Failed to post reply.' }, { status: 500 })
  }
}
