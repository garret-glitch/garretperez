import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { XP_DEFAULTS, type XpEventType } from '@/lib/xp'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const settings = await (prisma as any).siteSetting.findMany({
    where: { key: { startsWith: 'xp:' } },
  })

  const config: Record<string, number> = { ...(XP_DEFAULTS as Record<string, number>) }
  for (const s of settings) {
    const key = s.key.replace('xp:', '') as XpEventType
    if (key in XP_DEFAULTS) {
      const v = parseInt(s.value, 10)
      if (!isNaN(v) && v >= 0) config[key] = v
    }
  }

  return NextResponse.json({ config })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { updates } = await req.json() as { updates: Record<string, number> }

  for (const [key, value] of Object.entries(updates)) {
    if (key in XP_DEFAULTS && typeof value === 'number' && value >= 0) {
      await (prisma as any).siteSetting.upsert({
        where: { key: `xp:${key}` },
        create: { key: `xp:${key}`, value: String(value) },
        update: { value: String(value) },
      })
    }
  }

  return NextResponse.json({ success: true })
}
