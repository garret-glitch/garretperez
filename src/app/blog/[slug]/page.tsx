import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { compileMDX } from 'next-mdx-remote/rsc'
import { Metadata } from 'next'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = getPostBySlug(params.slug)
    return { title: `${post.title} | Garret's World`, description: post.description }
  } catch {
    return {}
  }
}

export default async function BlogPost({ params }: Props) {
  let post
  try {
    post = getPostBySlug(params.slug)
  } catch {
    notFound()
  }

  const { content } = await compileMDX({ source: post.content })

  const formatted = post.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  return (
    <article className="space-y-4">
      <div className="osrs-panel">
        <header>
          {formatted && <time className="text-[7px] text-[#5c3d1e]">{formatted}</time>}
          <h1 className="text-[14px] text-[#3c2a1e] font-bold mt-1 leading-relaxed">
            {post.title}
          </h1>
          {post.description && (
            <p className="text-[9px] text-[#5c3d1e] mt-1">{post.description}</p>
          )}
        </header>
      </div>
      <div className="osrs-panel-dark prose max-w-none">
        {content}
      </div>
    </article>
  )
}
