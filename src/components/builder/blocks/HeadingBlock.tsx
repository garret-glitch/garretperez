'use client'
import type { PageBlock, HeadingBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing: boolean
  onConfigChange?: (c: HeadingBlockConfig) => void
}

export default function HeadingBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = block.config as HeadingBlockConfig
  const style = applyStylesToElement(block.styles)
  const fontSize = block.styles.headingPx ?? (cfg.level === 1 ? 20 : cfg.level === 2 ? 14 : cfg.level === 3 ? 11 : 9)
  const color = block.styles.textColor ?? 'var(--gold)'
  const textAlign = cfg.align

  const Tag = `h${cfg.level}` as keyof JSX.IntrinsicElements

  return (
    <div style={{ ...style, textAlign }}>
      {isEditing ? (
        <input
          value={cfg.text}
          onChange={e => onConfigChange?.({ ...cfg, text: e.target.value })}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: '1px dashed rgba(200,155,60,0.4)',
            fontSize, color, fontFamily: 'inherit', textAlign, padding: '2px 4px', borderRadius: 2,
          }}
        />
      ) : (
        <Tag style={{ fontSize, color, margin: 0 }}>{cfg.text}</Tag>
      )}
    </div>
  )
}
