interface Project {
  title: string
  description: string
  tags: string[]
  link?: string
  github?: string
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="osrs-panel-dark rounded-xl">
      <h3 className="text-[10px] text-[#c8c8c8] font-bold">{project.title}</h3>
      <p className="text-[8px] text-[#d8d8d8] mt-1 leading-relaxed">{project.description}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {project.tags.map(tag => (
          <span key={tag} className="text-[7px] bg-[#3d3d3d] text-[#c0c0c0] px-2 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-3 mt-2 text-[7px]">
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[#a0bcd0] hover:underline">
            Live site →
          </a>
        )}
        {project.github && (
          <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-[#909090] hover:underline">
            GitHub →
          </a>
        )}
      </div>
    </div>
  )
}
