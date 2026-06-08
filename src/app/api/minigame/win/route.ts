import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_PER_WIN } from '@/lib/xp'
import { checkBadges } from '@/lib/badges'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.userSkill.update({
      where: { userId_skill: { userId: session.user.id, skill: 'FUN' } },
      data: { xp: { increment: XP_PER_WIN } },
    })
    await checkBadges(session.user.id, 'game')
    return NextResponse.json({ success: true, xpAwarded: XP_PER_WIN })
  } catch (error) {
    console.error('Minigame win error:', error)
    return NextResponse.json({ error: 'Failed to award XP.' }, { status: 500 })
  }
}
