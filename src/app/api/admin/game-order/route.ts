import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { order } = await req.json()
  if (!Array.isArray(order) || !order.every((x: unknown) => typeof x === 'string')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await (prisma as any).siteSetting.upsert({
    where: { key: 'game_order' },
    update: { value: JSON.stringify(order) },
    create: { key: 'game_order', value: JSON.stringify(order) },
  })

  return NextResponse.json({ success: true })
}
