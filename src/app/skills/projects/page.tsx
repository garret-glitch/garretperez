import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSkillBySlug } from '@/lib/skills'
import { getCommunityXpForSkill } from '@/lib/community-xp'
import SkillHeroBar from '@/components/SkillHeroBar'
import { SkillType } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ProjectTask {
  id: string
  text: string
  done: boolean
  priority: 1 | 2 | 3 | 4
  category: string
}

interface RawProject {
  id: string
  icon: string
  title: string
  desc: string
  progress: number
  href: string
  updated: string
  order: number
  createdAt: Date
  images: string
  tasks: string
  specs: string
  status: string
}

const PRIORITY_META: Record<number, { label: string; color: string; dot: string }> = {
  1: { label: 'Safety',       color: '#ef4444', dot: '🔴' },
  2: { label: 'Reliability',  color: '#f59e0b', dot: '🟡' },
  3: { label: 'Comfort',      color: '#60a5fa', dot: '🔵' },
  4: { label: 'Nice-to-Have', color: '#6b7280', dot: '⬜' },
}

export default async function ProjectsPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'
  const skillMeta = getSkillBySlug('projects')!

  let communityXp = 0
  let communityMemberCount = 0
  let projects: RawProject[] = []

  try {
    const [communityData, projectRows] = await Promise.all([
      getCommunityXpForSkill('PROJECTS' as SkillType),
      (prisma as any).project.findMany({
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
    ])
    communityXp = communityData.xp
    communityMemberCount = communityData.memberCount
    projects = projectRows as RawProject[]
  } catch {
    // DB not configured
  }

  return (
    <div className="space-y-6">
      <SkillHeroBar
        skill={skillMeta}
        communityXp={communityXp}
        memberCount={communityMemberCount}
        isLoggedIn={!!session?.user}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Link
          href="/skills/projects"
          style={{
            fontSize: 8,
            fontFamily: "'Press Start 2P', monospace",
            color: 'var(--text-3)',
            textDecoration: 'none',
          }}
        >
          ← Back to Skills
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="osrs-btn"
            style={{ fontSize: 8, padding: '8px 14px', textDecoration: 'none' }}
          >
            + New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div
          className="rp-card"
          style={{ padding: 32, textAlign: 'center', fontSize: 9, fontFamily: "'Press Start 2P', monospace", color: 'var(--text-2)' }}
        >
          No projects yet — check back soon!
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {projects.map((project) => {
            const tasks: ProjectTask[] = (() => {
              try { return JSON.parse(project.tasks) as ProjectTask[] } catch { return [] }
            })()
            const images: string[] = (() => {
              try { return JSON.parse(project.images) as string[] } catch { return [] }
            })()

            const totalTasks = tasks.length
            const doneTasks = tasks.filter((t) => t.done).length

            // Priority category counts
            const priorityCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
            for (const t of tasks) {
              if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++
            }

            const isCompleted = project.status === 'completed'

            return (
              <Link
                key={project.id}
                href={`/skills/projects/${project.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  className="rp-card"
                  style={{
                    overflow: 'hidden',
                    borderRadius: 12,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(200,155,60,0.45)'
                    el.style.boxShadow = '0 0 18px rgba(200,155,60,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--border)'
                    el.style.boxShadow = 'none'
                  }}
                >
                  {/* Cover image / placeholder */}
                  <div style={{ position: 'relative', height: 200, overflow: 'hidden', flexShrink: 0 }}>
                    {images.length > 0 ? (
                      <img
                        src={images[0]}
                        alt={project.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'radial-gradient(ellipse at center, #1e1c2a 0%, #0d0d14 70%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 56,
                        }}
                      >
                        {project.icon}
                      </div>
                    )}
                    {/* Status chip overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: 'rgba(13,13,20,0.85)',
                        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.4)'}`,
                        borderRadius: 6,
                        padding: '4px 8px',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isCompleted ? '#22c55e' : '#f97316',
                          display: 'inline-block',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 6,
                          fontFamily: "'Press Start 2P', monospace",
                          color: isCompleted ? '#22c55e' : '#f97316',
                        }}
                      >
                        {isCompleted ? 'Complete' : 'In Progress'}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: 16 }}>
                    {/* Icon + Title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 24, flexShrink: 0 }}>{project.icon}</span>
                      <h2
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 10,
                          color: 'var(--gold)',
                          margin: 0,
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}
                      >
                        {project.title}
                      </h2>
                    </div>

                    {/* Description */}
                    <p
                      className="body-text"
                      style={{
                        fontSize: 13,
                        color: 'var(--text-2)',
                        margin: 0,
                        marginTop: 6,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                      }}
                    >
                      {project.desc}
                    </p>

                    {/* Progress bar */}
                    {totalTasks > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          className="body-text"
                          style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5 }}
                        >
                          {doneTasks} / {totalTasks} tasks complete
                        </div>
                        <div
                          style={{
                            height: 8,
                            background: 'rgba(0,0,0,0.5)',
                            border: '1px solid rgba(200,155,60,0.2)',
                            borderRadius: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${project.progress}%`,
                              background: 'linear-gradient(90deg, #9a7428, #c89b3c)',
                              borderRadius: 4,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Priority summary chips */}
                    {tasks.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                        {([1, 2, 3, 4] as const).map((p) => {
                          const count = priorityCounts[p]
                          if (!count) return null
                          const meta = PRIORITY_META[p]
                          return (
                            <span
                              key={p}
                              className="body-text"
                              style={{
                                fontSize: 10,
                                padding: '3px 7px',
                                background: 'rgba(0,0,0,0.35)',
                                border: `1px solid ${meta.color}44`,
                                borderRadius: 4,
                                color: meta.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {meta.dot} {count} {meta.label}
                            </span>
                          )
                        })}
                      </div>
                    )}

                    {/* View Build link */}
                    <div style={{ marginTop: 14, textAlign: 'right' }}>
                      <span
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 9,
                          color: 'var(--gold)',
                        }}
                      >
                        View Build →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
