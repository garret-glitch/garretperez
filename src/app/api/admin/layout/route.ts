import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const KEY = 'layout_sections'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const setting = await (prisma as any).siteSetting.findUnique({ where: { key: KEY } })
  return NextResponse.json({ sections: setting ? JSON.parse(setting.value) : null })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { sections } = await req.json()
  await (prisma as any).siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(sections) },
    update: { value: JSON.stringify(sections) },
  })
  return NextResponse.json({ ok: true })
}
