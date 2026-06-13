import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    name, category, icon, description, careInstructions,
    waterNeeds, sunNeeds, daysToHarvest, autoGrowthDays,
    stage1Image, stage2Image, stage3Image, stage4Image, stage5Image, stage6Image,
  } = body

  const updated = await (prisma as any).gardenPlantType.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(category !== undefined && { category }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(careInstructions !== undefined && { careInstructions: careInstructions?.trim() || null }),
      ...(waterNeeds !== undefined && { waterNeeds: waterNeeds?.trim() || null }),
      ...(sunNeeds !== undefined && { sunNeeds }),
      ...(daysToHarvest !== undefined && { daysToHarvest: daysToHarvest ? parseInt(daysToHarvest) : null }),
      ...(autoGrowthDays !== undefined && { autoGrowthDays: autoGrowthDays ? parseInt(autoGrowthDays) : null }),
      ...(stage1Image !== undefined && { stage1Image: stage1Image || null }),
      ...(stage2Image !== undefined && { stage2Image: stage2Image || null }),
      ...(stage3Image !== undefined && { stage3Image: stage3Image || null }),
      ...(stage4Image !== undefined && { stage4Image: stage4Image || null }),
      ...(stage5Image !== undefined && { stage5Image: stage5Image || null }),
      ...(stage6Image !== undefined && { stage6Image: stage6Image || null }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await (prisma as any).gardenPlantType.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
