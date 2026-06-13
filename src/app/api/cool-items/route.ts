import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_CATEGORIES = [
  'Tech', 'Kitchen', 'Outdoors', 'Books', 'Fitness', 'Gaming', 'Clothing', 'Tools', 'Home', 'Other',
]

export async function GET() {
  try {
    const items = await (prisma as any).coolItem.findMany({
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { itemName, description, category, link, priceRange, imageUrl, accentColor } = await req.json()

    if (!itemName?.trim()) return NextResponse.json({ error: 'Item name is required.' }, { status: 400 })
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category.' }, { status: 400 })
    }

    const item = await (prisma as any).coolItem.create({
      data: {
        userId: session.user.id,
        itemName: itemName.trim().slice(0, 80),
        description: description?.trim().slice(0, 300) || null,
        category: category || null,
        link: link?.trim().slice(0, 300) || null,
        priceRange: priceRange?.trim().slice(0, 50) || null,
        imageUrl: imageUrl || null,
        accentColor: accentColor || '#c89b3c',
      },
      include: { user: { select: { id: true, username: true } } },
    })

    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
