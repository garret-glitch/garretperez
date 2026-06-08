import { Metadata } from 'next';
import { getAllPosts } from '@/lib/posts';
import PostCard from '@/components/PostCard';

export const metadata: Metadata = {
  title: 'Blog | Garret Perez',
  description: 'Thoughts, tutorials, and notes.',
};

export default function Blog() {
  const posts = getAllPosts();
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
      <p className="mt-3 text-gray-600">
        Thoughts, tutorials, and notes on things I find interesting.
      </p>
      {posts.length === 0 ? (
        <p className="mt-12 text-center text-gray-400">
          No posts yet — add .mdx files to content/posts/ to get started.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {posts.map(p => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
