import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function guard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return null
  return session
}

// GET ?pageSlug=home
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const pageSlug = searchParams.get('pageSlug') ?? 'home'
  const blocks = await (prisma as any).pageBlock.findMany({
    where: { pageSlug },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(blocks)
}

// POST — create a new block
export async function POST(req: Request) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const block = await (prisma as any).pageBlock.create({ data: body })
  return NextResponse.json(block)
}

// PUT — update a block (id in body)
export async function PUT(req: Request) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, ...data } = await req.json()
  const block = await (prisma as any).pageBlock.update({ where: { id }, data })
  return NextResponse.json(block)
}

// DELETE ?id=xxx
export async function DELETE(req: Request) {
  if (!await guard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await (prisma as any).pageBlock.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
