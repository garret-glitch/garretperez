import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plant = await (prisma as any).plant.findUnique({ where: { id: params.id } })
  if (!plant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (plant.userId !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await (prisma as any).plant.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
