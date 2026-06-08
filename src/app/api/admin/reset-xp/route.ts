import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Resets all of the admin's skill XP to 0 (level 1). Call once.
export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.userSkill.updateMany({
    where: { userId: session.user.id },
    data: { xp: 0 },
  })

  return NextResponse.json({ success: true, message: 'All your skills reset to level 1 (XP = 0).' })
}
