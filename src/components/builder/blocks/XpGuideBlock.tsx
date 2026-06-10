import type { PageBlock, XpGuideBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props { block: PageBlock; isEditing: boolean }

export default function XpGuideBlock({ block }: Props) {
  const cfg = block.config as XpGuideBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 11

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={style}>
        <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: hPx, color: '#3a1e06' }}>
          <span>{cfg.icon}</span> {cfg.heading}
        </h2>
        <p className="body-text mb-2" style={{ fontSize: bPx, color: '#3a2810', lineHeight: 1.7 }}>
          Just use the site. Browse communities, post updates, play games, leave comments — everything you do earns XP and levels up your skills.
        </p>
        <p className="body-text" style={{ fontSize: bPx - 1, color: '#7a5030', fontStyle: 'italic' }}>
          The more you explore, the more you grow.
        </p>
      </div>
      <div className="scroll-roll" />
    </>
  )
}
