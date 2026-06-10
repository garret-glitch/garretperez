'use client'

interface Props {
  isDirty: boolean
  saving: boolean
  saved: boolean
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onAddBlock: () => void
  onPreview: () => void
  onMigrate?: () => void
  showMigrate?: boolean
}

export default function BuilderToolbar({
  isDirty, saving, saved, canUndo, canRedo,
  onSave, onUndo, onRedo, onAddBlock, onPreview, onMigrate, showMigrate,
}: Props) {
  const BTN = (disabled = false): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 8, fontWeight: 700, border: 'none', opacity: disabled ? 0.4 : 1,
    background: 'rgba(200,155,60,0.15)', color: 'var(--gold)',
  })

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: '#0d0d14ee', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(200,155,60,0.25)',
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
      boxShadow: '0 2px 20px rgba(0,0,0,0.6)',
    }}>
      {/* Brand */}
      <span style={{ fontSize: 8, color: 'var(--gold)', fontWeight: 700, marginRight: 8 }}>⚙ Page Builder</span>

      {/* Undo / Redo */}
      <button onClick={onUndo} disabled={!canUndo} style={BTN(!canUndo)} title="Undo (Ctrl+Z)">↩ Undo</button>
      <button onClick={onRedo} disabled={!canRedo} style={BTN(!canRedo)} title="Redo (Ctrl+Y)">↪ Redo</button>

      <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

      {/* Add Block */}
      <button onClick={onAddBlock} style={{ ...BTN(), background: 'rgba(200,155,60,0.25)' }}>+ Add Block</button>

      <div style={{ flex: 1 }} />

      {showMigrate && onMigrate && (
        <button onClick={onMigrate} style={{ ...BTN(), background: 'rgba(100,60,180,0.2)', color: '#a080ff', border: '1px solid rgba(100,60,180,0.4)' }}>
          ⬆ Migrate Old Layout
        </button>
      )}

      {/* Preview */}
      <button onClick={onPreview} style={{ ...BTN(), background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)' }}>
        👁 Preview
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        style={{
          ...BTN(saving),
          background: saved ? 'rgba(0,200,100,0.2)' : isDirty ? 'rgba(200,155,60,0.3)' : 'rgba(200,155,60,0.1)',
          color: saved ? '#5ddf8f' : 'var(--gold)',
          border: `1px solid ${saved ? 'rgba(0,200,100,0.4)' : 'rgba(200,155,60,0.35)'}`,
          minWidth: 80,
        }}>
        {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : isDirty ? '💾 Save*' : '💾 Save'}
      </button>
    </div>
  )
}
