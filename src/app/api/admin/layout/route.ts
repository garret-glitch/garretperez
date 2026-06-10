import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const KEY = 'layout_sections'
const COLS_KEY = 'layout_cols'
const ORDER_KEY = 'layout_order'
const COL_COUNT_KEY = 'layout_col_count'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [setting, colsSetting, orderSetting, colCountSetting] = await Promise.all([
    (prisma as any).siteSetting.findUnique({ where: { key: KEY } }),
    (prisma as any).siteSetting.findUnique({ where: { key: COLS_KEY } }),
    (prisma as any).siteSetting.findUnique({ where: { key: ORDER_KEY } }),
    (prisma as any).siteSetting.findUnique({ where: { key: COL_COUNT_KEY } }),
  ])
  return NextResponse.json({
    sections:  setting          ? JSON.parse(setting.value)          : null,
    cols:      colsSetting      ? JSON.parse(colsSetting.value)      : null,
    order:     orderSetting     ? JSON.parse(orderSetting.value)     : null,
    col_count: colCountSetting  ? JSON.parse(colCountSetting.value)  : null,
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { sections, cols, order, col_count } = await req.json()
  const ops: Promise<unknown>[] = []
  if (sections) {
    ops.push((prisma as any).siteSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: JSON.stringify(sections) },
      update: { value: JSON.stringify(sections) },
    }))
  }
  if (cols) {
    ops.push((prisma as any).siteSetting.upsert({
      where: { key: COLS_KEY },
      create: { key: COLS_KEY, value: JSON.stringify(cols) },
      update: { value: JSON.stringify(cols) },
    }))
  }
  if (order) {
    ops.push((prisma as any).siteSetting.upsert({
      where: { key: ORDER_KEY },
      create: { key: ORDER_KEY, value: JSON.stringify(order) },
      update: { value: JSON.stringify(order) },
    }))
  }
  if (col_count) {
    ops.push((prisma as any).siteSetting.upsert({
      where: { key: COL_COUNT_KEY },
      create: { key: COL_COUNT_KEY, value: JSON.stringify(col_count) },
      update: { value: JSON.stringify(col_count) },
    }))
  }
  await Promise.all(ops)
  return NextResponse.json({ ok: true })
}
