import { notFound } from 'next/navigation';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { compileMDX } from 'next-mdx-remote/rsc';
import { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const post = getPostBySlug(params.slug);
    return { title: `${post.title} | Garret Perez`, description: post.description };
  } catch {
    return {};
  }
}

export default async function BlogPost({ params }: Props) {
  let post;
  try {
    post = getPostBySlug(params.slug);
  } catch {
    notFound();
  }

  const { content } = await compileMDX({ source: post.content });

  const formatted = post.date
    ? new Date(post.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <article className="max-w-2xl mx-auto">
      <header className="mb-8">
        {formatted && <time className="text-sm text-gray-500">{formatted}</time>}
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{post.title}</h1>
        {post.description && (
          <p className="mt-3 text-lg text-gray-600">{post.description}</p>
        )}
      </header>
      <div className="prose prose-gray max-w-none">{content}</div>
    </article>
  );
}
