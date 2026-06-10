'use client'
import Link from 'next/link'
import type { PageBlock, ButtonBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing: boolean
  onConfigChange?: (c: ButtonBlockConfig) => void
}

export default function ButtonBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = block.config as ButtonBlockConfig
  const style = applyStylesToElement(block.styles)
  const SIZE: Record<string, string> = { sm: '7px', md: '9px', lg: '11px' }

  const btnStyle: React.CSSProperties = {
    fontSize: SIZE[cfg.size],
    display: 'inline-block',
  }

  return (
    <div style={{ ...style, textAlign: cfg.align }}>
      {isEditing ? (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, minWidth: 180 }}
          onClick={e => e.stopPropagation()}>
          <input
            value={cfg.label}
            onChange={e => onConfigChange?.({ ...cfg, label: e.target.value })}
            placeholder="Button label"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '4px 8px', fontSize: 9, color: 'var(--text-1)' }}
          />
          <input
            value={cfg.href}
            onChange={e => onConfigChange?.({ ...cfg, href: e.target.value })}
            placeholder="Link URL"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '4px 8px', fontSize: 9, color: 'var(--text-1)' }}
          />
          <button className={cfg.variant === 'primary' ? 'osrs-btn' : 'osrs-btn'} style={btnStyle}>
            {cfg.icon && <span style={{ marginRight: 4 }}>{cfg.icon}</span>}{cfg.label}
          </button>
        </div>
      ) : (
        <Link
          href={cfg.href}
          target={cfg.newTab ? '_blank' : undefined}
          rel={cfg.newTab ? 'noopener noreferrer' : undefined}
          className="osrs-btn"
          style={btnStyle}>
          {cfg.icon && <span style={{ marginRight: 4 }}>{cfg.icon}</span>}{cfg.label}
        </Link>
      )}
    </div>
  )
}
