import { Metadata } from 'next';
import ProjectCard from '@/components/ProjectCard';

export const metadata: Metadata = {
  title: 'Projects | Garret Perez',
  description: 'Things I have built.',
};

const projects = [
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
  {
    title: 'Project Three',
    description: 'Yet another thing you built. Replace these with your real projects.',
    tags: ['Python', 'FastAPI'],
    link: 'https://example.com',
    github: 'https://github.com',
  },
];

export default function Projects() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
      <p className="mt-3 text-gray-600 max-w-2xl">
        Things I&apos;ve built — side projects, open source work, and experiments.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        {projects.map(p => (
          <ProjectCard key={p.title} project={p} />
        ))}
      </div>
    </div>
  );
}
