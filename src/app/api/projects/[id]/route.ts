import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const project = await (prisma as any).project.findUnique({
      where: { id: params.id },
    })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(project)
  } catch (err) {
    console.error('GET /api/projects/[id] error:', err)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const { tasks, images, status } = body as {
      tasks?: string
      images?: string
      status?: string
    }

    const updateData: Record<string, unknown> = {}
    updateData.updated = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    if (tasks !== undefined) {
      updateData.tasks = tasks
      const parsedTasks: Array<{ id: string; text: string; done: boolean }> = JSON.parse(tasks)
      const total = parsedTasks.length
      const done = parsedTasks.filter((t) => t.done).length
      updateData.progress = total > 0 ? Math.round((done / total) * 100) : 0
    }

    if (images !== undefined) {
      updateData.images = images
    }

    if (status !== undefined) {
      updateData.status = status
    }

    const project = await (prisma as any).project.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(project)
  } catch (err) {
    console.error('PATCH /api/projects/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}
