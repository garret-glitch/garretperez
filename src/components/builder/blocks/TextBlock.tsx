'use client'
import dynamic from 'next/dynamic'
import type { PageBlock, TextBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

// Tiptap is client-only — load dynamically with ssr:false
const TiptapEditor = dynamic(() => import('./TiptapEditor'), { ssr: false, loading: () => <div style={{ minHeight: 80 }} /> })

interface Props {
  block: PageBlock
  isEditing: boolean
  onConfigChange?: (c: TextBlockConfig) => void
}

export default function TextBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = block.config as TextBlockConfig
  const style = applyStylesToElement(block.styles)
  const bPx = block.styles.bodyPx ?? 13
  const color = block.styles.textColor ?? 'var(--text-1)'

  return (
    <div style={style} className="body-text" onClick={e => isEditing && e.stopPropagation()}>
      {isEditing ? (
        <TiptapEditor
          html={cfg.html}
          onChange={html => onConfigChange?.({ html })}
          fontSize={bPx}
          color={color}
        />
      ) : (
        <div
          style={{ fontSize: bPx, color, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: cfg.html }}
        />
      )}
    </div>
  )
}
