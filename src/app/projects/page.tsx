import { Metadata } from 'next'
import ProjectCard from '@/components/ProjectCard'

export const metadata: Metadata = {
  title: "Projects | Garret's World",
  description: 'Things Garret has built.',
}

const projects = [
  {
    title: 'Garret\'s World',
    description: 'This site — an OSRS-themed XP community portfolio built with Next.js, Prisma, and Neon PostgreSQL.',
    tags: ['Next.js', 'TypeScript', 'Prisma'],
    link: 'https://garretperez.com',
    github: 'https://github.com/garret-glitch/garretperez',
  },
  {
    title: 'Haunted House Build',
    description: 'Yearly neighborhood haunted house with witch, skeleton, portal, and graveyard themes. Level 18 project.',
    tags: ['DIY', 'Community', 'Seasonal'],
  },
  {
    title: 'Wine Sales Strategy',
    description: 'Helping accounts grow through displays, brand strategy, and customer relationships in H-E-B distribution.',
    tags: ['Sales', 'Business', 'Wine'],
  },
]

export default function Projects() {
  return (
    <div className="space-y-4">
      <div className="osrs-panel rounded-xl">
        <h1 className="text-[14px] text-[#1a1a1a] font-bold">⚒ Projects</h1>
        <p className="text-[8px] text-[#3d3d3d] mt-1">Things I&apos;ve built.</p>
      </div>
      <div className="space-y-3">
        {projects.map(p => <ProjectCard key={p.title} project={p} />)}
      </div>
    </div>
  )
}
