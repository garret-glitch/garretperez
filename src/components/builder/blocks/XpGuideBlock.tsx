import type { PageBlock, XpGuideBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

const XP_ROWS = [
  { icon: '📅', action: 'Use the website daily',               xp: '+10 XP' },
  { icon: '🗺️', action: 'Explore tabs and communities',        xp: '+2–5 XP' },
  { icon: '📝', action: 'Post updates in any skill',            xp: '+50 XP' },
  { icon: '💬', action: 'Comment on posts',                     xp: '+20 XP' },
  { icon: '🍳', action: 'Add photos or recipes',                xp: '+25–50 XP' },
  { icon: '🎮', action: 'Play mini-games',                      xp: '+10 XP' },
  { icon: '🏆', action: 'Win mini-games',                       xp: '+25 XP' },
  { icon: '⚒️', action: 'Complete projects and milestones',     xp: '+50–100 XP' },
  { icon: '⏱️', action: 'Spend 5+ minutes on the site',         xp: '+10 XP' },
]

interface Props { block: PageBlock; isEditing: boolean }

export default function XpGuideBlock({ block }: Props) {
  const cfg = block.config as XpGuideBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 10

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={style}>
        <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: hPx, color: '#3a1e06' }}>
          <span>{cfg.icon}</span> {cfg.heading}
        </h2>
        <div className="space-y-1.5">
          {XP_ROWS.map(row => (
            <div key={row.action} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
              <span className="text-sm shrink-0">{row.icon}</span>
              <span className="flex-1" style={{ fontSize: bPx, color: '#3a2810' }}>{row.action}</span>
              <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{row.xp}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center" style={{ fontSize: bPx - 2, color: '#7a5030', fontStyle: 'italic' }}>
          Level up naturally just by using the site.
        </p>
      </div>
      <div className="scroll-roll" />
    </>
  )
}
