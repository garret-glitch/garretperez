import Link from 'next/link';
import { getAllPosts } from '@/lib/posts';
import PostCard from '@/components/PostCard';
import ProjectCard from '@/components/ProjectCard';

const featuredProjects = [
  {
    title: 'Project One',
    description: 'A brief description of what this project does and why it matters.',
    tags: ['React', 'TypeScript'],
    github: 'https://github.com',
  },
  {
    title: 'Project Two',
    description: 'Another interesting project you built and are proud of.',
    tags: ['Node.js', 'PostgreSQL'],
    github: 'https://github.com',
  },
];

export default function Home() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <div className="space-y-20">
      {/* Hero */}
      <section>
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          Hi, I&apos;m Garret
        </h1>
        <p className="mt-4 text-xl text-gray-600 max-w-2xl">
          I&apos;m a sales supervisor passionate about leading teams, hitting targets,
          and always finding ways to grow. This is where I share my work and thoughts.
        </p>
        <div className="mt-6 flex gap-4">
          <Link
            href="/projects"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            See my work
          </Link>
          <Link
            href="/contact"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Get in touch
          </Link>
        </div>
      </section>

      {/* Featured projects */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Projects</h2>
          <Link href="/projects" className="text-sm text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {featuredProjects.map(p => (
            <ProjectCard key={p.title} project={p} />
          ))}
        </div>
      </section>

      {/* Latest posts */}
      {posts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Latest Posts</h2>
            <Link href="/blog" className="text-sm text-indigo-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {posts.map(p => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
