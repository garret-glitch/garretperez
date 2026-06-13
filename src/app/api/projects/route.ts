import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const projects = await (prisma as any).project.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json(projects)
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const { icon, title, desc, specs, tasks, status } = body as {
      icon: string
      title: string
      desc: string
      specs?: string
      tasks?: string
      status?: string
    }

    const parsedTasks: Array<{ id: string; text: string; done: boolean }> = tasks
      ? JSON.parse(tasks)
      : []
    const total = parsedTasks.length
    const done = parsedTasks.filter((t) => t.done).length
    const progress = total > 0 ? Math.round((done / total) * 100) : 0

    const updated = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    const project = await (prisma as any).project.create({
      data: {
        icon: icon ?? '📦',
        title,
        desc: desc ?? '',
        progress,
        href: '',
        updated,
        order: 0,
        images: '[]',
        tasks: tasks ?? '[]',
        specs: specs ?? '{}',
        status: status ?? 'in_progress',
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects error:', err)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
