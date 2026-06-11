import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const plants = await (prisma as any).plant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { username: true } } },
    })
    return NextResponse.json(plants)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, type, emoji, notes, plantedDate, waterDays, sunlight, status } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const plant = await (prisma as any).plant.create({
    data: {
      userId:      session.user.id,
      name:        name.trim(),
      type:        type ?? 'other',
      emoji:       emoji ?? '🌱',
      notes:       notes?.trim() || null,
      plantedDate: plantedDate ? new Date(plantedDate) : null,
      waterDays:   waterDays ? parseInt(waterDays) : null,
      sunlight:    sunlight || null,
      status:      status ?? 'growing',
    },
    include: { user: { select: { username: true } } },
  })

  // Award +50 XP to Gardening
  await prisma.userSkill.upsert({
    where: { userId_skill: { userId: session.user.id, skill: 'GARDENING' } },
    update: { xp: { increment: 50 } },
    create: { userId: session.user.id, skill: 'GARDENING', xp: 50 },
  })

  return NextResponse.json({ plant, xpAwarded: 50 }, { status: 201 })
}
