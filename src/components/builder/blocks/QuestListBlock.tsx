import Link from 'next/link'
import type { PageBlock, QuestListBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props { block: PageBlock; isEditing: boolean; liveData: BlockLiveData }

export default function QuestListBlock({ block, isEditing, liveData }: Props) {
  const cfg = block.config as QuestListBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 11
  const quests = (liveData.quests ?? []).filter(q => q.active).slice(0, cfg.maxItems)

  return (
    <div className="rp-card" style={style}>
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: hPx, color: 'var(--gold)' }}>{cfg.icon} {cfg.heading}</h2>
      </div>
      <div style={{ padding: '8px 0' }}>
        {quests.length === 0 ? (
          <p style={{ fontSize: bPx, color: 'var(--text-3)', padding: '12px 16px' }}>No active quests.</p>
        ) : quests.map(q => (
          <Link key={q.id} href={isEditing ? '#' : q.href}
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
            <span className="text-lg shrink-0">{q.icon}</span>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: bPx, color: 'var(--text-1)', fontWeight: 600 }}>{q.title}</div>
              <div style={{ fontSize: bPx - 2, color: 'var(--text-3)' }} className="truncate">{q.description}</div>
            </div>
            <span style={{ fontSize: 7, color: 'var(--gold)', flexShrink: 0 }}>+{q.xp} XP</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
