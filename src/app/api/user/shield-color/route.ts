import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { color } = await req.json()
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { shieldColor: color } as never,
  })

  return NextResponse.json({ ok: true })
}
