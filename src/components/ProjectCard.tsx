interface Project {
  title: string
  description: string
  tags: string[]
  link?: string
  github?: string
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="osrs-panel-dark">
      <h3 className="text-[10px] text-[#ff981f] font-bold">{project.title}</h3>
      <p className="text-[8px] text-[#ffe066] mt-1 leading-relaxed">{project.description}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {project.tags.map(tag => (
          <span key={tag} className="text-[7px] bg-[#5c3d1e] text-[#ffcc44] px-2 py-0.5">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-3 mt-2 text-[7px]">
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-[#ff981f] hover:underline">
            Live site →
          </a>
        )}
        {project.github && (
          <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-[#c5a882] hover:underline">
            GitHub →
          </a>
        )}
      </div>
    </div>
  )
}
