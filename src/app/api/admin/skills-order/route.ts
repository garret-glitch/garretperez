import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { order } = await req.json()
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
    }
    const result = await (prisma as any).siteSetting.upsert({
      where: { key: 'skills:order' },
      update: { value: JSON.stringify(order) },
      create: { key: 'skills:order', value: JSON.stringify(order) },
    })
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true, saved: result.value })
  } catch (e) {
    console.error('[skills-order] save failed:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
