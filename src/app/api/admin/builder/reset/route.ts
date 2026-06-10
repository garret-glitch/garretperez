import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { migrateExistingSections } from '@/lib/builder-migration'

export async function POST() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: 'home' } })
  const count = await migrateExistingSections()
  return NextResponse.json({ ok: true, blocks: count })
}
