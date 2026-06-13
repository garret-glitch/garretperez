import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { xpToLevel } from '@/lib/xp'

const ALLOWED_COLORS = ['#c89b3c', '#6b9edb', '#8b5cf6', '#22c55e', '#ef4444', '#f97316']

export async function GET() {
  try {
    const cards = await (prisma as any).businessCard.findMany({
      include: {
        user: {
          select: { id: true, username: true, skills: { select: { xp: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const result = cards.map((card: any) => {
      const totalXp = card.user.skills.reduce((sum: number, s: any) => sum + s.xp, 0)
      return { ...card, user: { id: card.user.id, username: card.user.username, level: xpToLevel(totalXp) } }
    })

    return NextResponse.json({ cards: result })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load cards' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, title, company, email, phone, linkedin, website, tagline, imageUrl, accentColor } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const color = ALLOWED_COLORS.includes(accentColor) ? accentColor : '#c89b3c'

    const data = {
      name: name.trim().slice(0, 60),
      title: title?.trim().slice(0, 80) || null,
      company: company?.trim().slice(0, 80) || null,
      email: email?.trim().slice(0, 120) || null,
      phone: phone?.trim().slice(0, 30) || null,
      linkedin: linkedin?.trim().slice(0, 100) || null,
      website: website?.trim().slice(0, 120) || null,
      tagline: tagline?.trim().slice(0, 100) || null,
      imageUrl: imageUrl || null,
      accentColor: color,
    }

    const card = await (prisma as any).businessCard.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })

    return NextResponse.json({ card })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save card' }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await (prisma as any).businessCard.delete({ where: { userId: session.user.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
