'use client'
import type { PageBlock, BlockStyles } from '@/types/builder'
import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'

const LBL: React.CSSProperties = { fontSize: 5.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }
const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }
const INPUT = (w?: number): React.CSSProperties => ({
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4,
  padding: '4px 6px', fontSize: 8, color: 'var(--text-1)', width: w ?? 60,
})
const SECTION: React.CSSProperties = {
  borderBottom: '1px solid var(--border-dim)', paddingBottom: 12, marginBottom: 12,
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={LBL}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)',
            background: value || 'transparent', cursor: 'pointer', flexShrink: 0,
          }}
        />
        <input value={value} onChange={e => onChange(e.target.value)} style={INPUT(100)} placeholder="#rrggbb" />
        {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11 }}>✕</button>}
      </div>
      {open && (
        <div style={{ position: 'absolute', zIndex: 999, marginTop: 4 }} onClick={e => e.stopPropagation()}>
          <HexColorPicker color={value || '#000000'} onChange={onChange} />
          <button onClick={() => setOpen(false)} style={{
            display: 'block', width: '100%', marginTop: 4, background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 4, padding: '4px', fontSize: 7, color: 'var(--text-2)', cursor: 'pointer',
          }}>Done</button>
        </div>
      )}
    </div>
  )
}

interface Props {
  block: PageBlock
  onStyleChange: (styles: BlockStyles) => void
  onSpanChange: (colSpan: 1 | 2 | 3) => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleVisible: () => void
  onClose: () => void
}

export default function StylesPanel({ block, onStyleChange, onSpanChange, onDelete, onDuplicate, onToggleVisible, onClose }: Props) {
  const s = block.styles
  const upd = (patch: Partial<BlockStyles>) => onStyleChange({ ...s, ...patch })

  return (
    <div style={{
      position: 'fixed', top: 49, right: 0, bottom: 0, zIndex: 150,
      width: 280, background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', overflowY: 'auto', padding: '14px 14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 8, color: 'var(--gold)', fontWeight: 700 }}>Panel Settings</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}>✕</button>
      </div>

      {/* Block actions */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
        <button onClick={onDuplicate} style={{ flex: 1, ...INPUT(), textAlign: 'center', cursor: 'pointer' }}>⧉ Duplicate</button>
        <button onClick={onToggleVisible} style={{ flex: 1, ...INPUT(), textAlign: 'center', cursor: 'pointer', color: block.visible ? '#5ddf8f' : 'var(--text-3)' }}>
          {block.visible ? '👁 Visible' : '🚫 Hidden'}
        </button>
        <button onClick={onDelete} style={{ ...INPUT(32), textAlign: 'center', cursor: 'pointer', color: '#df5d5d', border: '1px solid rgba(200,50,50,0.3)' }}>🗑</button>
      </div>

      {/* Column span */}
      <div style={SECTION}>
        <label style={LBL}>Column Width</label>
        <div style={{ display: 'flex', gap: 5 }}>
          {([1, 2, 3] as const).map(n => (
            <button key={n} onClick={() => onSpanChange(n)} style={{
              flex: 1, padding: '6px 0', borderRadius: 5, cursor: 'pointer', border: 'none', fontSize: 7, fontWeight: 700,
              background: block.colSpan === n ? 'rgba(200,155,60,0.25)' : 'var(--bg-elevated)',
              color: block.colSpan === n ? 'var(--gold)' : 'var(--text-2)',
              outline: block.colSpan === n ? '1px solid var(--border-lit)' : 'none',
            }}>{n === 1 ? '⅓' : n === 2 ? '⅔' : 'Full'}</button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div style={SECTION}>
        <label style={LBL}>Dimensions</label>
        <div style={ROW}>
          <span style={{ fontSize: 6.5, color: 'var(--text-2)', width: 56 }}>Min Height</span>
          <input type="range" min={0} max={800} step={10} value={s.minHeight ?? 0}
            onChange={e => upd({ minHeight: +e.target.value || undefined })}
            style={{ flex: 1, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: 7, color: 'var(--gold)', width: 36 }}>{s.minHeight ? `${s.minHeight}px` : 'Auto'}</span>
        </div>
      </div>

      {/* Padding */}
      <div style={SECTION}>
        <label style={LBL}>Padding (px)</label>
        {(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map(k => (
          <div key={k} style={ROW}>
            <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>{k.replace('padding', '')}</span>
            <input type="number" min={0} max={200} value={s[k] ?? 0}
              onChange={e => upd({ [k]: +e.target.value })}
              style={INPUT(60)} />
          </div>
        ))}
      </div>

      {/* Background */}
      <div style={SECTION}>
        <label style={LBL}>Background</label>
        <ColorField label="Color" value={s.bgColor ?? ''} onChange={v => upd({ bgColor: v || undefined })} />
        <label style={LBL}>Image URL</label>
        <input value={s.bgImage ?? ''} onChange={e => upd({ bgImage: e.target.value || undefined })}
          placeholder="https://..." style={{ ...INPUT(230), width: '100%', marginBottom: 6 }} />
      </div>

      {/* Border */}
      <div style={SECTION}>
        <label style={LBL}>Border</label>
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Width</span>
          <input type="number" min={0} max={20} value={s.borderWidth ?? 0}
            onChange={e => upd({ borderWidth: +e.target.value })} style={INPUT(50)} />
          <select value={s.borderStyle ?? 'solid'}
            onChange={e => upd({ borderStyle: e.target.value as 'solid' | 'dashed' | 'dotted' | 'none' })}
            style={{ ...INPUT(80), cursor: 'pointer' }}>
            {['solid', 'dashed', 'dotted', 'none'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <ColorField label="Color" value={s.borderColor ?? ''} onChange={v => upd({ borderColor: v || undefined })} />
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Radius</span>
          <input type="range" min={0} max={40} value={s.borderRadius ?? 0}
            onChange={e => upd({ borderRadius: +e.target.value })}
            style={{ flex: 1, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: 7, color: 'var(--gold)', width: 30 }}>{s.borderRadius ?? 0}px</span>
        </div>
      </div>

      {/* Typography */}
      <div style={SECTION}>
        <label style={LBL}>Typography</label>
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Heading</span>
          <input type="range" min={7} max={32} value={s.headingPx ?? 9}
            onChange={e => upd({ headingPx: +e.target.value })}
            style={{ flex: 1, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: 7, color: 'var(--gold)', width: 30 }}>{s.headingPx ?? 9}px</span>
        </div>
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Body</span>
          <input type="range" min={8} max={20} value={s.bodyPx ?? 12}
            onChange={e => upd({ bodyPx: +e.target.value })}
            style={{ flex: 1, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: 7, color: 'var(--gold)', width: 30 }}>{s.bodyPx ?? 12}px</span>
        </div>
        <ColorField label="Text Color" value={s.textColor ?? ''} onChange={v => upd({ textColor: v || undefined })} />
      </div>

      {/* Effects */}
      <div style={SECTION}>
        <label style={LBL}>Effects</label>
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Shadow</span>
          <select value={s.shadow ?? 'none'}
            onChange={e => upd({ shadow: e.target.value as 'none' | 'sm' | 'md' | 'lg' | 'xl' })}
            style={{ ...INPUT(120), cursor: 'pointer', flex: 1 }}>
            {['none', 'sm', 'md', 'lg', 'xl'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={ROW}>
          <span style={{ fontSize: 6, color: 'var(--text-3)', width: 48 }}>Opacity</span>
          <input type="range" min={0} max={1} step={0.05} value={s.opacity ?? 1}
            onChange={e => upd({ opacity: +e.target.value })}
            style={{ flex: 1, accentColor: 'var(--gold)' }} />
          <span style={{ fontSize: 7, color: 'var(--gold)', width: 30 }}>{Math.round((s.opacity ?? 1) * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
