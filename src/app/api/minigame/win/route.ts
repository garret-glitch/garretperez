import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getXpAmount } from '@/lib/award-xp'
import { checkBadges } from '@/lib/badges'
import { mirrorXpToAdmin } from '@/lib/admin-xp'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // super admins play but never earn XP
    if (session.user.superAdmin) return NextResponse.json({ success: true, xpAwarded: 0 })

    const xpAmount = await getXpAmount('MINIGAME_WIN')

    await prisma.userSkill.update({
      where: { userId_skill: { userId: session.user.id, skill: 'FUN' } },
      data: { xp: { increment: xpAmount } },
    })
    await checkBadges(session.user.id, 'game')
    await mirrorXpToAdmin('FUN', xpAmount, session.user.id)
    return NextResponse.json({ success: true, xpAwarded: xpAmount })
  } catch (error) {
    console.error('Minigame win error:', error)
    return NextResponse.json({ error: 'Failed to award XP.' }, { status: 500 })
  }
}
