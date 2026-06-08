import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.name !== 'garret') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { title, body } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  await (prisma as any).announcement.create({
    data: { title: title.trim(), body: body.trim(), authorId: session.user.id },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.name !== 'garret') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await req.json()
  await (prisma as any).announcement.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
