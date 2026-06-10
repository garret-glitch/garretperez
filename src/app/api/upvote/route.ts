import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_PER_UPVOTE_RECEIVED } from '@/lib/xp'
import { getXpAmount } from '@/lib/award-xp'
import { mirrorXpToAdmin } from '@/lib/admin-xp'
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
      await (prisma as any).postUpvote.delete({
        where: { postId_userId: { postId, userId: session.user.id } },
      })
      return NextResponse.json({ upvoted: false })
    }

    await (prisma as any).postUpvote.create({ data: { postId, userId: session.user.id } })

    // XP to post author (someone liked their post)
    if (post.userId !== session.user.id) {
      await prisma.userSkill.update({
        where: { userId_skill: { userId: post.userId, skill: post.skill } },
        data: { xp: { increment: XP_PER_UPVOTE_RECEIVED } },
      })
      await mirrorXpToAdmin(post.skill, XP_PER_UPVOTE_RECEIVED, post.userId)
      await checkBadges(post.userId, 'post')
    }

    // XP to the upvoter (for engaging with the community)
    const voterXp = await getXpAmount('UPVOTE_GIVEN')
    await prisma.userSkill.update({
      where: { userId_skill: { userId: session.user.id, skill: post.skill } },
      data: { xp: { increment: voterXp } },
    })
    await mirrorXpToAdmin(post.skill, voterXp, session.user.id)

    return NextResponse.json({ upvoted: true, xpAwarded: voterXp })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
