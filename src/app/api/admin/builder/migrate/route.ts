import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { migrateExistingSections } from '@/lib/builder-migration'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: 'home' } })
  if (existing > 0) {
    return NextResponse.json({ error: 'Already migrated', count: existing }, { status: 409 })
  }
  const count = await migrateExistingSections()
  return NextResponse.json({ ok: true, count })
}
