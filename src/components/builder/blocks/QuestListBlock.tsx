'use client'
import type { PageBlock, QuestListBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement, getHeadingStyle } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing?: boolean
  liveData?: BlockLiveData
  onConfigChange?: (cfg: QuestListBlockConfig) => void
}

export default function QuestListBlock({ block, isEditing = false, liveData = {}, onConfigChange }: Props) {
  const cfg = block.config as QuestListBlockConfig
  const styles = applyStylesToElement(block.styles)
  const hStyle = getHeadingStyle(block.styles)
  const quests = (liveData.quests ?? []).slice(0, cfg.maxItems ?? 6)

  return (
    <div className="rp-card h-full" style={styles}>
      {/* Heading */}
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            value={cfg.icon}
            onChange={e => onConfigChange?.({ ...cfg, icon: e.target.value })}
            style={{ width: 36, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', fontSize: 14, color: 'var(--text-1)', textAlign: 'center' }}
          />
          <input
            value={cfg.heading}
            onChange={e => onConfigChange?.({ ...cfg, heading: e.target.value })}
            style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 10, color: 'var(--text-1)', fontFamily: 'inherit' }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>{cfg.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', ...hStyle }}>{cfg.heading}</span>
        </div>
      )}

      {/* Quest list */}
      {quests.length === 0 ? (
        <p className="body-text" style={{ fontSize: 8, color: 'var(--text-3)', fontStyle: 'italic' }}>
          {isEditing ? 'Quests will appear here (add them in Admin → Quests).' : 'No active quests right now.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quests.map(q => (
            <a
              key={q.id}
              href={q.href}
              className="quest-card"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{q.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--gold)', marginBottom: 2 }}>{q.title}</div>
                  <div className="body-text" style={{ fontSize: 7, color: 'var(--text-2)', lineHeight: 1.5 }}>{q.description}</div>
                </div>
                <span style={{
                  flexShrink: 0, fontSize: 6, fontFamily: "'Press Start 2P', monospace",
                  color: '#90c040', background: 'rgba(80,160,40,0.12)',
                  border: '1px solid rgba(80,160,40,0.3)', borderRadius: 4, padding: '2px 5px',
                }}>
                  +{q.xp} XP
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
