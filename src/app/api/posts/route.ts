import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SKILL_ENUMS } from '@/lib/skills'
import { getXpAmount } from '@/lib/award-xp'
import { checkBadges } from '@/lib/badges'
import { mirrorXpToAdmin } from '@/lib/admin-xp'
import { SkillType } from '@prisma/client'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { skill, title, body } = await req.json()

    if (!skill || !title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!SKILL_ENUMS.includes(skill)) {
      return NextResponse.json({ error: 'Invalid skill.' }, { status: 400 })
    }

    const xpAmount = await getXpAmount('POST_CREATE')

    await prisma.$transaction([
      prisma.post.create({
        data: {
          userId: session.user.id,
          skill: skill as SkillType,
          title: title.trim().slice(0, 120),
          body: body.trim(),
        },
      }),
      prisma.userSkill.update({
        where: { userId_skill: { userId: session.user.id, skill: skill as SkillType } },
        data: { xp: { increment: xpAmount } },
      }),
    ])

    await checkBadges(session.user.id, 'post')
    await mirrorXpToAdmin(skill as SkillType, xpAmount, session.user.id)

    return NextResponse.json({ success: true, xpAwarded: xpAmount })
  } catch (error) {
    console.error('Post error:', error)
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 })
  }
}
