import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_COLORS = ['#c89b3c', '#6b9edb', '#8b5cf6', '#22c55e', '#ef4444', '#f97316']
const ALLOWED_CATEGORIES = ['Gaming', 'Tech', 'Cooking', 'Music', 'Comedy', 'Education', 'Fitness', 'Travel', 'Business', 'Other']

export async function GET() {
  try {
    const channels = await (prisma as any).youtubeChannel.findMany({
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ channels })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to load channels' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { channelName, channelUrl, description, category, accentColor } = await req.json()

    if (!channelName?.trim()) return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    if (!channelUrl?.trim()) return NextResponse.json({ error: 'Channel URL is required' }, { status: 400 })

    const color = ALLOWED_COLORS.includes(accentColor) ? accentColor : '#c89b3c'
    const cat = ALLOWED_CATEGORIES.includes(category) ? category : null

    const channel = await (prisma as any).youtubeChannel.create({
      data: {
        userId: session.user.id,
        channelName: channelName.trim().slice(0, 80),
        channelUrl: channelUrl.trim().slice(0, 200),
        description: description?.trim().slice(0, 200) || null,
        category: cat,
        accentColor: color,
      },
    })

    return NextResponse.json({ channel })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to save channel' }, { status: 500 })
  }
}
