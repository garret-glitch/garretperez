import { prisma } from '@/lib/prisma'
import { SkillType } from '@prisma/client'

// Awards the same XP to the ADMIN that any other user just earned.
// Skipped if the earner is already the admin (no double-dipping).
export async function mirrorXpToAdmin(skill: SkillType, xp: number, excludeUserId: string) {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })
  if (!admin || admin.id === excludeUserId) return

  await prisma.userSkill.update({
    where: { userId_skill: { userId: admin.id, skill } },
    data: { xp: { increment: xp } },
  })
}
