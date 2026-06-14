import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// POST /api/admin/fishing-tackle  { hidden: boolean }
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { hidden } = await req.json()
  await (prisma as any).siteSetting.upsert({
    where:  { key: 'fishing_tackle_hidden' },
    update: { value: hidden ? '1' : '0' },
    create: { key: 'fishing_tackle_hidden', value: hidden ? '1' : '0' },
  })
  return NextResponse.json({ ok: true })
}
