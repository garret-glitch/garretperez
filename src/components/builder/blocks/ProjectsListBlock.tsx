import Link from 'next/link'
import type { PageBlock, ProjectsListBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props { block: PageBlock; isEditing: boolean; liveData: BlockLiveData }

export default function ProjectsListBlock({ block, isEditing, liveData }: Props) {
  const cfg = block.config as ProjectsListBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 12
  const projects = (liveData.dbProjects ?? []).slice(0, cfg.maxItems)

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={style}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: hPx, color: '#3a1e06' }}>
            <span>{cfg.icon}</span> {cfg.heading}
          </h2>
          {cfg.showViewAll && (
            <Link href={isEditing ? '#' : '/skills/projects'}
              className="text-[6px] hover:opacity-70 transition-opacity" style={{ color: '#6a3808' }}>
              View All →
            </Link>
          )}
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="text-4xl opacity-30">⚒️</span>
            <p className="text-[7px]" style={{ color: '#8a6030' }}>No projects yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <Link key={p.id} href={isEditing ? '#' : `/skills/projects/${p.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840', textDecoration: 'none', display: 'flex' }}>
                <span className="text-xl shrink-0">{p.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold truncate" style={{ fontSize: bPx, color: '#2a1006' }}>{p.title}</span>
                    <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{p.progress}%</span>
                  </div>
                  <div className="prog-bar"><div className="prog-bar-fill" style={{ width: `${p.progress}%` }} /></div>
                  <div className="text-[5.5px] mt-1" style={{ color: '#8a6030' }}>Updated {p.updated}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="scroll-roll" />
    </>
  )
}
