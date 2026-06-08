import Link from 'next/link'
import type { PostMeta } from '@/lib/posts'

export default function PostCard({ post }: { post: PostMeta }) {
  const formatted = post.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <div className="osrs-panel-dark hover:bg-[#3d2a18] transition-colors">
        {formatted && <time className="text-[7px] text-[#c5a882]">{formatted}</time>}
        <h2 className="text-[10px] text-[#ff981f] font-bold mt-0.5">{post.title}</h2>
        {post.description && (
          <p className="text-[8px] text-[#ffe066] mt-1 line-clamp-2">{post.description}</p>
        )}
      </div>
    </Link>
  )
}
