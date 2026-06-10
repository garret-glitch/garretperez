import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getXpAmount } from '@/lib/award-xp'
import { mirrorXpToAdmin } from '@/lib/admin-xp'
import { SkillType } from '@prisma/client'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false })
  }

  try {
    const { skill } = await req.json()
    if (!Object.values(SkillType).includes(skill)) {
      return NextResponse.json({ ok: false })
    }

    const today = new Date().toISOString().slice(0, 10)

    const existing = await (prisma as any).skillVisit.findUnique({
      where: { userId_skill_date: { userId: session.user.id, skill, date: today } },
    })

    if (existing) return NextResponse.json({ ok: true, already: true })

    await (prisma as any).skillVisit.create({
      data: { userId: session.user.id, skill, date: today },
    })

    const xpAmount = await getXpAmount('SKILL_OPEN')

    await prisma.userSkill.update({
      where: { userId_skill: { userId: session.user.id, skill: skill as SkillType } },
      data: { xp: { increment: xpAmount } },
    })

    await mirrorXpToAdmin(skill as SkillType, xpAmount, session.user.id)

    return NextResponse.json({ ok: true, xpAwarded: xpAmount })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
