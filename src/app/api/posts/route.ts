import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SKILL_ENUMS } from '@/lib/skills'
import { XP_PER_POST } from '@/lib/xp'
import { checkBadges } from '@/lib/badges'
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
        data: { xp: { increment: XP_PER_POST } },
      }),
    ])

    await checkBadges(session.user.id, 'post')

    return NextResponse.json({ success: true, xpAwarded: XP_PER_POST })
  } catch (error) {
    console.error('Post error:', error)
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 })
  }
}
