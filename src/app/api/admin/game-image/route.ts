import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Admin-only: set or clear a custom image (base64 data URL) for a game card.
// Images are stored together in the `game_images` SiteSetting as { [href]: dataUrl }.
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { href, image } = await req.json()
  if (typeof href !== 'string') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (image != null && (typeof image !== 'string' || image.length > 700_000)) {
    return NextResponse.json({ error: 'Image too large' }, { status: 400 })
  }

  const existing = await (prisma as any).siteSetting.findUnique({ where: { key: 'game_images' } })
  const map: Record<string, string> = existing ? JSON.parse(existing.value) : {}
  if (image) map[href] = image
  else delete map[href]

  await (prisma as any).siteSetting.upsert({
    where: { key: 'game_images' },
    update: { value: JSON.stringify(map) },
    create: { key: 'game_images', value: JSON.stringify(map) },
  })

  return NextResponse.json({ success: true })
}
