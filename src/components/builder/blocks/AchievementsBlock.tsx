import type { PageBlock, AchievementsBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'
import { BADGE_META } from '@/lib/badges'

interface Props { block: PageBlock; isEditing: boolean; liveData: BlockLiveData }

export default function AchievementsBlock({ block, liveData }: Props) {
  const cfg = block.config as AchievementsBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 7
  const badges = liveData.userBadges ?? []

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={style}>
        <div className="flex items-center gap-2 mb-2">
          <span style={{ fontSize: hPx }}>{cfg.icon}</span>
          <h2 style={{ fontSize: hPx, color: '#3a1e06', margin: 0 }}>{cfg.heading}</h2>
        </div>
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map(key => {
              const meta = BADGE_META[key]
              return meta ? (
                <span key={key} title={meta.label} style={{ fontSize: 22, lineHeight: 1, cursor: 'default' }}>{meta.icon}</span>
              ) : null
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-50">
            <span style={{ fontSize: 18 }}>🏆</span>
            <span className="text-[6px]" style={{ color: '#8a6030' }}>None yet — post &amp; play to earn</span>
          </div>
        )}
      </div>
      <div className="scroll-roll" />
    </>
  )
}
