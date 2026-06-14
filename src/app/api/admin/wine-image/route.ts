import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// PATCH /api/admin/wine-image
// body: { wineId: string, image: string (base64), isDb: boolean }
// For DB wines: updates FeaturedWine.image
// For hardcoded wines: stores override in SiteSetting as wine-img-{wineId}
export async function PATCH(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { wineId, image, isDb } = await req.json()
  if (!wineId || !image) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (isDb) {
    await (prisma as any).featuredWine.update({ where: { id: wineId }, data: { image } })
  } else {
    await (prisma as any).siteSetting.upsert({
      where: { key: `wine-img-${wineId}` },
      update: { value: image },
      create: { key: `wine-img-${wineId}`, value: image },
    })
  }

  return NextResponse.json({ ok: true })
}
