import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { awardXp } from '@/lib/award-xp'
import { SkillType } from '@prisma/client'
import type { XpEventType } from '@/lib/xp'

// Only lightweight, client-triggered events allowed here.
// Content-creation events (post, recipe, reply) are handled in their own routes.
const ALLOWED = new Set<XpEventType>([
  'TAB_CLICK',
  'SKILL_OPEN',
  'POST_VIEW',
  'MINIGAME_PLAY',
  'TIME_SPENT',
  'PHOTO_UPLOAD',
])

function skillForEvent(eventType: XpEventType, eventKey: string): SkillType | 'RANDOM' {
  if (eventType === 'MINIGAME_PLAY') return SkillType.FUN
  if (eventType === 'SKILL_OPEN') {
    const up = eventKey.toUpperCase() as SkillType
    if (Object.values(SkillType).includes(up)) return up
  }
  return 'RANDOM'
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 })

  try {
    const { eventType, eventKey = '' } = await req.json()

    if (!ALLOWED.has(eventType as XpEventType)) {
      return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 })
    }

    const result = await awardXp({
      userId: session.user.id,
      eventType: eventType as XpEventType,
      eventKey,
      skill: skillForEvent(eventType as XpEventType, eventKey),
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('XP award error:', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
