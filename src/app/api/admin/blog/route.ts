import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function adminGuard() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

export async function GET() {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const posts = await (prisma as any).cmsBlogPost.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { title, slug, body, excerpt, published } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const post = await (prisma as any).cmsBlogPost.create({
    data: {
      title: title.trim(),
      slug: slug?.trim() ? slug.trim() : slugify(title.trim()),
      body: body?.trim() || '',
      excerpt: excerpt?.trim() || null,
      published: published === true,
      publishedAt: published === true ? new Date() : null,
    },
  })
  return NextResponse.json({ post })
}

export async function PUT(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, title, slug, body, excerpt, published } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const existing = await (prisma as any).cmsBlogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = title
  if (slug !== undefined) update.slug = slug
  if (body !== undefined) update.body = body
  if (excerpt !== undefined) update.excerpt = excerpt || null
  if (published !== undefined) {
    update.published = published
    if (published && !existing.publishedAt) update.publishedAt = new Date()
    if (!published) update.publishedAt = null
  }
  const post = await (prisma as any).cmsBlogPost.update({ where: { id }, data: update })
  return NextResponse.json({ post })
}

export async function DELETE(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await (prisma as any).cmsBlogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
