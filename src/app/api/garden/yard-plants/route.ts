import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const plants = await (prisma as any).gardenYardPlant.findMany({
      orderBy: { createdAt: 'asc' },
      include: { plantType: true },
    })
    return NextResponse.json(plants)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, plantTypeId, growthStage, xPos, yPos, datePlanted, notes, isAutoGrowth } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const plant = await (prisma as any).gardenYardPlant.create({
    data: {
      name: name.trim(),
      plantTypeId: plantTypeId || null,
      growthStage: growthStage ? parseInt(growthStage) : 1,
      xPos: xPos !== undefined ? parseFloat(xPos) : 50,
      yPos: yPos !== undefined ? parseFloat(yPos) : 50,
      datePlanted: datePlanted ? new Date(datePlanted) : null,
      notes: notes?.trim() || null,
      isAutoGrowth: isAutoGrowth ?? false,
      addedBy: (session.user as any).username ?? session.user?.name ?? null,
    },
    include: { plantType: true },
  })
  return NextResponse.json({ plant }, { status: 201 })
}
