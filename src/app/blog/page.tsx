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
      <div className="osrs-panel rounded-xl">
        <h1 className="text-[14px] text-[#1a1a1a] font-bold">📖 Blog</h1>
        <p className="text-[8px] text-[#3d3d3d] mt-1">Personal posts and thoughts.</p>
      </div>
      {posts.length === 0 ? (
        <div className="osrs-panel rounded-xl text-center py-6 text-[8px] text-[#3d3d3d]">
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
