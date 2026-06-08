import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
}

export interface Post extends PostMeta {
  content: string;
}

function serializeDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return String(value ?? '');
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(filename => {
      const slug = filename.replace(/\.mdx?$/, '');
      const { data } = matter(fs.readFileSync(path.join(postsDirectory, filename), 'utf8'));
      return {
        slug,
        title: String(data.title ?? slug),
        date: serializeDate(data.date),
        description: String(data.description ?? ''),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post {
  const mdxPath = path.join(postsDirectory, `${slug}.mdx`);
  const mdPath = path.join(postsDirectory, `${slug}.md`);
  const fullPath = fs.existsSync(mdxPath) ? mdxPath : mdPath;
  const { data, content } = matter(fs.readFileSync(fullPath, 'utf8'));
  return {
    slug,
    title: String(data.title ?? slug),
    date: serializeDate(data.date),
    description: String(data.description ?? ''),
    content,
  };
}
