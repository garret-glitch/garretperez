import { prisma } from './prisma'
import { XP_DEFAULTS, XP_COUNT_LIMITS, XP_UNIQUE_KEY_EVENTS, type XpEventType } from './xp'
import { mirrorXpToAdmin } from './admin-xp'
import { SkillType } from '@prisma/client'

const ALL_SKILLS = Object.values(SkillType)

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export async function getXpAmount(eventType: XpEventType): Promise<number> {
  try {
    const setting = await (prisma as any).siteSetting.findUnique({
      where: { key: `xp:${eventType}` },
    })
    if (setting?.value) {
      const v = parseInt(setting.value, 10)
      if (!isNaN(v) && v >= 0) return v
    }
  } catch {}
  return XP_DEFAULTS[eventType]
}

export async function awardXp({
  userId,
  eventType,
  eventKey = '',
  skill = 'RANDOM',
}: {
  userId: string
  eventType: XpEventType
  eventKey?: string
  skill?: SkillType | 'RANDOM'
}): Promise<{ awarded: boolean; amount?: number; skill?: SkillType; reason?: string }> {
  const today = todayStr()
  const db = prisma as any

  // Check count-based daily limit
  const countLimit = XP_COUNT_LIMITS[eventType]
  if (countLimit !== undefined) {
    const count = await db.xpEvent.count({
      where: { userId, eventType, date: today },
    })
    if (count >= countLimit) return { awarded: false, reason: 'daily_limit' }
  }

  // Check key-uniqueness per day (once per unique key per day)
  if (XP_UNIQUE_KEY_EVENTS.has(eventType)) {
    const existing = await db.xpEvent.findFirst({
      where: { userId, eventType, eventKey, date: today },
    })
    if (existing) return { awarded: false, reason: 'already_awarded' }
  }

  const amount = await getXpAmount(eventType)
  if (amount === 0) return { awarded: false, reason: 'zero_amount' }

  const targetSkill: SkillType =
    skill === 'RANDOM'
      ? ALL_SKILLS[Math.floor(Math.random() * ALL_SKILLS.length)]
      : skill

  await prisma.userSkill.update({
    where: { userId_skill: { userId, skill: targetSkill } },
    data: { xp: { increment: amount } },
  })

  await db.xpEvent.create({
    data: { userId, eventType, eventKey, amount, date: today },
  })

  await mirrorXpToAdmin(targetSkill, amount, userId)

  return { awarded: true, amount, skill: targetSkill }
}
