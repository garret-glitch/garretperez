import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getXpAmount } from '@/lib/award-xp'
import { checkBadges } from '@/lib/badges'
import { mirrorXpToAdmin } from '@/lib/admin-xp'
import { SkillType } from '@prisma/client'

const ALL_SKILLS = Object.values(SkillType)

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastLoginAt: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (user.lastLoginAt && user.lastLoginAt >= today) {
      return NextResponse.json({ alreadyClaimed: true })
    }

    const randomSkill = ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)]
    const xpAmount = await getXpAmount('DAILY_LOGIN')

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.userSkill.update({
        where: { userId_skill: { userId: session.user.id, skill: randomSkill } },
        data: { xp: { increment: xpAmount } },
      }),
    ])

    await checkBadges(session.user.id, 'login')
    await mirrorXpToAdmin(randomSkill, xpAmount, session.user.id)

    return NextResponse.json({ success: true, skill: randomSkill, xpAwarded: xpAmount })
  } catch (error) {
    console.error('Daily login error:', error)
    return NextResponse.json({ error: 'Failed to award daily XP.' }, { status: 500 })
  }
}
