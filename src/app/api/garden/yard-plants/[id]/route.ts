import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, bedType, plantTypeId, growthStage, xPos, yPos, datePlanted, notes, harvestStatus, isAutoGrowth, photos } = body

  const updated = await (prisma as any).gardenYardPlant.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(bedType !== undefined && { bedType }),
      ...(plantTypeId !== undefined && { plantTypeId: plantTypeId || null }),
      ...(growthStage !== undefined && { growthStage: parseInt(growthStage) }),
      ...(xPos !== undefined && { xPos: parseFloat(xPos) }),
      ...(yPos !== undefined && { yPos: parseFloat(yPos) }),
      ...(datePlanted !== undefined && { datePlanted: datePlanted ? new Date(datePlanted) : null }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
      ...(harvestStatus !== undefined && { harvestStatus }),
      ...(isAutoGrowth !== undefined && { isAutoGrowth }),
      ...(photos !== undefined && { photos: JSON.stringify(photos) }),
    },
    include: { plantType: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await (prisma as any).gardenYardPlant.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
