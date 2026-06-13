import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import ProjectDetailClient from './ProjectDetailClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

interface ProjectTask {
  id: string
  text: string
  done: boolean
  priority: 1 | 2 | 3 | 4
  category: string
}

interface ProjectSpecs {
  year?: string
  make?: string
  model?: string
  engine?: string
  goal?: string
  currentStatus?: string[]
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  let project: {
    id: string
    icon: string
    title: string
    desc: string
    status: string
    progress: number
    images: string
    tasks: string
    specs: string
  } | null = null

  try {
    project = await (prisma as any).project.findUnique({
      where: { id: params.id },
    })
  } catch {
    // DB not configured
  }

  if (!project) notFound()

  const tasks: ProjectTask[] = (() => {
    try { return JSON.parse(project.tasks) as ProjectTask[] } catch { return [] }
  })()

  const images: string[] = (() => {
    try { return JSON.parse(project.images) as string[] } catch { return [] }
  })()

  const specs: ProjectSpecs = (() => {
    try { return JSON.parse(project.specs) as ProjectSpecs } catch { return {} }
  })()

  const total = tasks.length
  const done = tasks.filter((t) => t.done).length
  const progress = total > 0 ? Math.round((done / total) * 100) : project.progress

  return (
    <ProjectDetailClient
      project={{
        id: project.id,
        icon: project.icon,
        title: project.title,
        desc: project.desc,
        status: project.status,
        progress,
      }}
      tasks={tasks}
      images={images}
      specs={specs}
      isAdmin={isAdmin}
    />
  )
}
