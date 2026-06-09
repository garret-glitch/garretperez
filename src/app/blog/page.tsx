import { Metadata } from 'next'
import { getAllPosts } from '@/lib/posts'
import PostCard from '@/components/PostCard'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Blog | Garret's World",
  description: "Garret's personal blog posts.",
}

type CmsPost = { id: string; title: string; slug: string; excerpt: string | null; publishedAt: Date | null; createdAt: Date }

export default async function Blog() {
  const mdxPosts = getAllPosts()

  let cmsPosts: CmsPost[] = []
  try {
    cmsPosts = await (prisma as any).cmsBlogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, excerpt: true, publishedAt: true, createdAt: true },
    })
  } catch { /* DB not configured */ }

  const hasPosts = mdxPosts.length > 0 || cmsPosts.length > 0

  return (
    <div className="space-y-4">
      <div className="osrs-panel rounded-xl">
        <h1 className="text-[14px] text-[#1a1a1a] font-bold">📖 Blog</h1>
        <p className="text-[8px] text-[#3d3d3d] mt-1">Personal posts and thoughts.</p>
      </div>

      {!hasPosts ? (
        <div className="osrs-panel rounded-xl text-center py-6 text-[8px] text-[#3d3d3d]">
          No posts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {cmsPosts.map(p => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="block osrs-panel-dark rounded-xl hover:opacity-90 transition-opacity">
              <div className="p-4">
                <div className="text-[9px] text-[#d0d0d0] font-bold mb-1">{p.title}</div>
                {p.excerpt && <p className="text-[7px] text-[#909090] leading-relaxed mb-2">{p.excerpt}</p>}
                <div className="text-[6px] text-[#606060]">
                  {new Date(p.publishedAt ?? p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </Link>
          ))}
          {mdxPosts.map(p => <PostCard key={p.slug} post={p} />)}
        </div>
      )}
    </div>
  )
}
