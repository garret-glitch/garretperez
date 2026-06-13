import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const mustangTasks = [
  { id: 's1', text: 'Install seat belts', done: false, priority: 1, category: 'Safety' },
  { id: 's2', text: 'Replace all tires (age matters more than tread)', done: false, priority: 1, category: 'Safety' },
  { id: 's3', text: 'Inspect brake lines and hoses', done: false, priority: 1, category: 'Safety' },
  { id: 's4', text: 'Check steering components and alignment', done: false, priority: 1, category: 'Safety' },
  { id: 's5', text: 'Replace old fuel lines if original', done: false, priority: 1, category: 'Safety' },
  { id: 's6', text: 'Verify all lights, turn signals, and brake lights work', done: false, priority: 1, category: 'Safety' },
  { id: 's7', text: 'Check battery cables and electrical grounds', done: false, priority: 1, category: 'Safety' },
  { id: 's8', text: 'Fire extinguisher in vehicle', done: false, priority: 1, category: 'Safety' },
  { id: 'r1', text: 'Diagnose transmission issue', done: false, priority: 2, category: 'Reliability' },
  { id: 'r2', text: 'Tune carburetor and ignition', done: false, priority: 2, category: 'Reliability' },
  { id: 'r3', text: 'Replace belts and radiator hoses if aged', done: false, priority: 2, category: 'Reliability' },
  { id: 'r4', text: 'Check water pump condition', done: false, priority: 2, category: 'Reliability' },
  { id: 'r5', text: 'Replace fuel filter', done: false, priority: 2, category: 'Reliability' },
  { id: 'r6', text: 'Inspect fuel tank for rust/debris', done: false, priority: 2, category: 'Reliability' },
  { id: 'r7', text: 'Inspect driveshaft and U-joints', done: false, priority: 2, category: 'Reliability' },
  { id: 'r8', text: 'Check differential fluid', done: false, priority: 2, category: 'Reliability' },
  { id: 'c1', text: 'Add A/C system', done: false, priority: 3, category: 'Comfort' },
  { id: 'c2', text: 'Upgrade seats if desired', done: false, priority: 3, category: 'Comfort' },
  { id: 'c3', text: 'Improve weatherstripping', done: false, priority: 3, category: 'Comfort' },
  { id: 'c4', text: 'Sound deadening', done: false, priority: 3, category: 'Comfort' },
  { id: 'c5', text: 'Better radio/bluetooth', done: false, priority: 3, category: 'Comfort' },
  { id: 'n1', text: 'Paint/body improvements', done: false, priority: 4, category: 'Nice-to-Have' },
  { id: 'n2', text: 'Wheels', done: false, priority: 4, category: 'Nice-to-Have' },
  { id: 'n3', text: 'Interior restoration', done: false, priority: 4, category: 'Nice-to-Have' },
  { id: 'n4', text: 'Gauge upgrades', done: false, priority: 4, category: 'Nice-to-Have' },
  { id: 'n5', text: 'LED lighting', done: false, priority: 4, category: 'Nice-to-Have' },
]

const mustangSpecs = {
  year: '1965',
  make: 'Ford',
  model: 'Mustang',
  engine: '302 V8',
  goal: 'Reliable driver with a classic feel, not a modern computerized car',
  currentStatus: [
    'New power steering installed',
    'Cooling system updated',
    'Brake work completed',
    'Suspected transmission issues',
    'No A/C',
    'Old tires',
    'Seat belts not installed',
  ],
}

const createData = {
  icon: '🚗',
  title: '1965 Mustang',
  desc: 'Classic Ford Mustang restoration — making her road-ready, reliable, and true to her era.',
  images: '[]',
  tasks: JSON.stringify(mustangTasks),
  specs: JSON.stringify(mustangSpecs),
  status: 'in_progress',
  progress: 0,
  href: '',
  updated: 'Jun 2026',
  order: 0,
}

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const existing = await (prisma as any).project.findFirst({
      where: { title: '1965 Mustang' },
    })

    if (existing) {
      const updated = await (prisma as any).project.update({
        where: { id: existing.id },
        data: {
          tasks: JSON.stringify(mustangTasks),
          specs: JSON.stringify(mustangSpecs),
          icon: createData.icon,
          desc: createData.desc,
          status: createData.status,
          updated: createData.updated,
        },
      })
      return NextResponse.json(updated, { status: 200 })
    }

    const project = await (prisma as any).project.create({
      data: createData,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects/seed error:', err)
    return NextResponse.json({ error: 'Failed to seed project' }, { status: 500 })
  }
}
