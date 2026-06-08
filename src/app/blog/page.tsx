import { Metadata } from 'next'
import { getAllPosts } from '@/lib/posts'
import PostCard from '@/components/PostCard'

export const metadata: Metadata = {
  title: "Blog | Garret's World",
  description: "Garret's personal blog posts.",
}

export default function Blog() {
  const posts = getAllPosts()
  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <h1 className="text-[14px] text-[#3c2a1e] font-bold">📖 Blog</h1>
        <p className="text-[8px] text-[#5c3d1e] mt-1">Personal posts and thoughts.</p>
      </div>
      {posts.length === 0 ? (
        <div className="osrs-panel text-center py-6 text-[8px] text-[#5c3d1e]">
          No posts yet — add .mdx files to content/posts/ to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => <PostCard key={p.slug} post={p} />)}
        </div>
      )}
    </div>
  )
}
