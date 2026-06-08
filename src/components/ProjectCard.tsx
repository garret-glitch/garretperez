interface Project {
  title: string;
  description: string;
  tags: string[];
  link?: string;
  github?: string;
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-sm transition-all">
      <h3 className="font-semibold text-gray-900">{project.title}</h3>
      <p className="mt-2 text-sm text-gray-600">{project.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {project.tags.map(tag => (
          <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-sm">
        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
            Live site →
          </a>
        )}
        {project.github && (
          <a href={project.github} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 hover:underline">
            GitHub →
          </a>
        )}
      </div>
    </div>
  );
}
