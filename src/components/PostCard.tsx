import Link from 'next/link';
import type { PostMeta } from '@/lib/posts';

export default function PostCard({ post }: { post: PostMeta }) {
  const formatted = post.date
    ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <article className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-sm transition-all">
        {formatted && <time className="text-xs text-gray-500">{formatted}</time>}
        <h2 className="mt-1 font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {post.title}
        </h2>
        {post.description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{post.description}</p>
        )}
      </article>
    </Link>
  );
}
