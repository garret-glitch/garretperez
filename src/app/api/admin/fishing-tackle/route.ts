import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

const ALLOWED_KEYS = ['fishing_tackle_hidden', 'fishing_stats_hidden']

// POST /api/admin/fishing-tackle  { key: string, hidden: boolean }
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { key, hidden } = await req.json()
  if (!ALLOWED_KEYS.includes(key)) return NextResponse.json({ error: 'Invalid key' }, { status: 400 })

  await (prisma as any).siteSetting.upsert({
    where:  { key },
    update: { value: hidden ? '1' : '0' },
    create: { key, value: hidden ? '1' : '0' },
  })
  return NextResponse.json({ ok: true })
}
