import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST — bulk-save all blocks for a page (upsert by id)
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { pageSlug, blocks } = await req.json() as {
    pageSlug: string
    blocks: Array<{
      id: string; type: string; order: number; colSpan: number; colStart: number
      visible: boolean; config: string; styles: string
    }>
  }
  if (!pageSlug || !Array.isArray(blocks)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Delete blocks no longer present
  const incomingIds = blocks.map(b => b.id).filter(id => !id.startsWith('new-'))
  await (prisma as any).pageBlock.deleteMany({
    where: { pageSlug, id: { notIn: incomingIds } },
  })

  // Upsert each block
  await Promise.all(blocks.map((b, idx) => {
    const data = {
      pageSlug,
      type: b.type,
      order: idx,
      colSpan: b.colSpan,
      colStart: b.colStart,
      visible: b.visible,
      config: typeof b.config === 'string' ? b.config : JSON.stringify(b.config),
      styles: typeof b.styles === 'string' ? b.styles : JSON.stringify(b.styles),
    }
    if (b.id.startsWith('new-')) {
      return (prisma as any).pageBlock.create({ data })
    }
    return (prisma as any).pageBlock.upsert({
      where: { id: b.id },
      create: { id: b.id, ...data },
      update: data,
    })
  }))

  return NextResponse.json({ ok: true })
}
