import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const types = await (prisma as any).gardenPlantType.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(types)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, category, icon, description, careInstructions, waterNeeds, sunNeeds, daysToHarvest, autoGrowthDays } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const type = await (prisma as any).gardenPlantType.create({
    data: {
      name: name.trim(),
      category: category || 'POTTED',
      icon: icon || '🌱',
      description: description?.trim() || null,
      careInstructions: careInstructions?.trim() || null,
      waterNeeds: waterNeeds?.trim() || null,
      sunNeeds: sunNeeds || null,
      daysToHarvest: daysToHarvest ? parseInt(daysToHarvest) : null,
      autoGrowthDays: autoGrowthDays ? parseInt(autoGrowthDays) : null,
    },
  })
  return NextResponse.json(type, { status: 201 })
}
