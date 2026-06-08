import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_PER_UPVOTE_RECEIVED } from '@/lib/xp'
import { checkBadges } from '@/lib/badges'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { postId } = await req.json()
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true, skill: true } })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const existing = await (prisma as any).postUpvote.findUnique({
      where: { postId_userId: { postId, userId: session.user.id } },
    })

    if (existing) {
      // Remove upvote
      await (prisma as any).postUpvote.delete({
        where: { postId_userId: { postId, userId: session.user.id } },
      })
      return NextResponse.json({ upvoted: false })
    }

    // Add upvote and award XP to post author
    await (prisma as any).postUpvote.create({ data: { postId, userId: session.user.id } })

    if (post.userId !== session.user.id) {
      await prisma.userSkill.update({
        where: { userId_skill: { userId: post.userId, skill: post.skill } },
        data: { xp: { increment: XP_PER_UPVOTE_RECEIVED } },
      })
      await checkBadges(post.userId, 'post')
    }

    return NextResponse.json({ upvoted: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
