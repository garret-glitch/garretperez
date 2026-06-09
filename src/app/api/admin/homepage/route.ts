import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const rows = await (prisma as any).siteSetting.findMany()
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return NextResponse.json({ settings: map })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 })
  await (prisma as any).siteSetting.upsert({ where: { key }, create: { key, value: value ?? '' }, update: { value: value ?? '' } })
  return NextResponse.json({ ok: true })
}
