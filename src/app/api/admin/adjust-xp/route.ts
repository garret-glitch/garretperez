import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SkillType } from '@prisma/client'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { userId, skill, amount } = await req.json()
  await prisma.userSkill.update({
    where: { userId_skill: { userId, skill: skill as SkillType } },
    data: { xp: { increment: Number(amount) } },
  })
  return NextResponse.json({ success: true })
}
