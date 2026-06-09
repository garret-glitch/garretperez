import { notFound } from 'next/navigation'
import { getPostBySlug } from '@/lib/posts'
import { compileMDX } from 'next-mdx-remote/rsc'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = getPostBySlug(params.slug)
    return { title: `${post.title} | Garret's World`, description: post.description }
  } catch {
    try {
      const post = await (prisma as any).cmsBlogPost.findUnique({ where: { slug: params.slug, published: true } })
      if (post) return { title: `${post.title} | Garret's World`, description: post.excerpt ?? '' }
    } catch { /* noop */ }
    return {}
  }
}

export default async function BlogPost({ params }: Props) {
  // Try MDX first
  try {
    const post = getPostBySlug(params.slug)
    const { content } = await compileMDX({ source: post.content })
    const formatted = post.date
      ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : ''
    return (
      <article className="space-y-4">
        <div className="osrs-panel rounded-xl">
          <header>
            {formatted && <time className="text-[7px] text-[#3d3d3d]">{formatted}</time>}
            <h1 className="text-[14px] text-[#1a1a1a] font-bold mt-1 leading-relaxed">{post.title}</h1>
            {post.description && <p className="text-[9px] text-[#3d3d3d] mt-1">{post.description}</p>}
          </header>
        </div>
        <div className="osrs-panel-dark rounded-xl prose max-w-none">{content}</div>
      </article>
    )
  } catch { /* fall through to CMS */ }

  // Try CMS blog post
  try {
    const post = await (prisma as any).cmsBlogPost.findUnique({ where: { slug: params.slug, published: true } })
    if (!post) notFound()
    const formatted = new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    return (
      <article className="space-y-4">
        <div className="osrs-panel rounded-xl">
          <header>
            <time className="text-[7px] text-[#3d3d3d]">{formatted}</time>
            <h1 className="text-[14px] text-[#1a1a1a] font-bold mt-1 leading-relaxed">{post.title}</h1>
            {post.excerpt && <p className="text-[9px] text-[#3d3d3d] mt-1">{post.excerpt}</p>}
          </header>
        </div>
        <div className="osrs-panel-dark rounded-xl">
          <div className="body-text text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
            {post.body}
          </div>
        </div>
      </article>
    )
  } catch {
    notFound()
  }
}
