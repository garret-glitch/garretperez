import { Metadata } from 'next'
import ProjectCard from '@/components/ProjectCard'

export const metadata: Metadata = {
  title: "Projects | Garret's World",
  description: 'Things Garret has built.',
}

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
]

export default function Projects() {
  return (
    <div className="space-y-4">
      <div className="osrs-panel">
        <h1 className="text-[14px] text-[#3c2a1e] font-bold">⚒ Projects</h1>
        <p className="text-[8px] text-[#5c3d1e] mt-1">Things I&apos;ve built.</p>
      </div>
      <div className="space-y-3">
        {projects.map(p => <ProjectCard key={p.title} project={p} />)}
      </div>
    </div>
  )
}
