'use client'
import type { PageBlock, AboutBlockConfig, BlockLiveData } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing: boolean
  liveData: BlockLiveData
  onConfigChange?: (config: AboutBlockConfig) => void
}

export default function AboutBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = block.config as AboutBlockConfig
  const style = applyStylesToElement(block.styles)
  const hPx = block.styles.headingPx ?? 9
  const bPx = block.styles.bodyPx ?? 12

  return (
    <>
      <div className="scroll-roll" />
      <div className="scroll-parchment" style={{ ...style }}>
        <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: hPx, color: block.styles.textColor ?? '#3a1e06' }}>
          <span>{cfg.headingIcon}</span> {cfg.headingText}
        </h2>
        <div className="space-y-2 body-text">
          {isEditing ? (
            <>
              {(['bio1', 'bio2', 'bio3'] as const).map(key => (
                <textarea key={key} value={cfg[key]}
                  onChange={e => onConfigChange?.({ ...cfg, [key]: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.35)',
                    borderRadius: 4, padding: '6px 8px', color: '#3a2810', fontSize: bPx,
                    fontFamily: 'Inter, system-ui', resize: 'vertical', minHeight: 56 }} />
              ))}
            </>
          ) : (
            <>
              {cfg.bio1 && <p style={{ fontSize: bPx, color: '#3a2810' }}>{cfg.bio1}</p>}
              {cfg.bio2 && <p style={{ fontSize: bPx, color: '#3a2810' }}>{cfg.bio2}</p>}
              {cfg.bio3 && <p style={{ fontSize: bPx, color: '#3a2810' }}>{cfg.bio3}</p>}
            </>
          )}
        </div>
      </div>
      <div className="scroll-roll" />
    </>
  )
}
