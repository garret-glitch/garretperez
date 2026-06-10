'use client'
import type { BlockType } from '@/types/builder'
import { BLOCK_META } from '@/lib/block-defaults'

const CATEGORIES = [
  { label: 'Content', types: ['heading', 'text', 'image', 'button', 'divider'] as BlockType[] },
  { label: 'Dynamic', types: ['about', 'projects-list', 'community-feed', 'achievements', 'xp-guide', 'quest-list', 'communities'] as BlockType[] },
  { label: 'Components', types: ['skill-card', 'contact-card'] as BlockType[] },
]

interface Props {
  open: boolean
  onClose: () => void
  onAdd: (type: BlockType) => void
}

export default function BlockLibraryDrawer({ open, onClose, onAdd }: Props) {
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 149, background: 'rgba(0,0,0,0.5)',
      }} />
      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 87, left: 280, bottom: 0, zIndex: 150,
        width: 280, background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
        overflowY: 'auto', padding: '16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700 }}>Add Block</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>✕</button>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 6, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, paddingLeft: 4 }}>
              {cat.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {cat.types.map(type => {
                const meta = BLOCK_META[type]
                return (
                  <button
                    key={type}
                    onClick={() => { onAdd(type); onClose() }}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 8px', cursor: 'pointer',
                      textAlign: 'left', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-lit)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4, lineHeight: 1 }}>{meta.icon}</div>
                    <div style={{ fontSize: 7, color: 'var(--text-1)', fontWeight: 600 }}>{meta.label}</div>
                    <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginTop: 2 }}>{meta.description}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
