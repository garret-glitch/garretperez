import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { href, hide } = await req.json()
  if (typeof href !== 'string' || typeof hide !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const existing = await (prisma as any).siteSetting.findUnique({ where: { key: 'hidden_games' } })
  const current: string[] = existing ? JSON.parse(existing.value) : []
  const updated = hide
    ? Array.from(new Set([...current, href]))
    : current.filter((h: string) => h !== href)

  await (prisma as any).siteSetting.upsert({
    where: { key: 'hidden_games' },
    update: { value: JSON.stringify(updated) },
    create: { key: 'hidden_games', value: JSON.stringify(updated) },
  })

  return NextResponse.json({ success: true })
}
