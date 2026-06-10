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
  return (
    <div style={{
      position: 'fixed', top: 38, left: 0, right: 0, zIndex: 200,
      height: 52,
      background: 'linear-gradient(180deg, #16131f 0%, #0f0d18 100%)',
      borderBottom: '2px solid rgba(200,155,60,0.4)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px',
    }}>

      {/* Brand */}
      <div style={{ marginRight: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2 }}>
          ⚙ Page Builder
        </div>
        {isDirty && (
          <div style={{ fontSize: 5.5, color: 'rgba(200,155,60,0.55)', letterSpacing: '0.08em' }}>
            ● unsaved changes
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(200,155,60,0.2)', marginRight: 4, flexShrink: 0 }} />

      {/* Undo */}
      <ToolBtn
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        icon="↩"
        label="Undo"
        color="var(--text-2)"
      />

      {/* Redo */}
      <ToolBtn
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        icon="↪"
        label="Redo"
        color="var(--text-2)"
      />

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: 'rgba(200,155,60,0.2)', margin: '0 4px', flexShrink: 0 }} />

      {/* Add Block */}
      <ToolBtn
        onClick={onAddBlock}
        icon="＋"
        label="Add Block"
        color="#a0d8ff"
        bg="rgba(100,180,255,0.12)"
        border="rgba(100,180,255,0.3)"
      />

      <div style={{ flex: 1 }} />

      {/* Migrate */}
      {showMigrate && onMigrate && (
        <ToolBtn
          onClick={onMigrate}
          icon="⬆"
          label="Migrate"
          color="#a080ff"
          bg="rgba(100,60,180,0.18)"
          border="rgba(100,60,180,0.45)"
        />
      )}

      {/* Preview */}
      <ToolBtn
        onClick={onPreview}
        icon="👁"
        label="Preview"
        color="var(--text-2)"
        bg="rgba(255,255,255,0.06)"
        border="rgba(255,255,255,0.12)"
      />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        title="Save (Ctrl+S)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 20px',
          borderRadius: 6,
          border: `2px solid ${saved ? 'rgba(76,210,130,0.7)' : 'rgba(200,155,60,0.8)'}`,
          background: saved
            ? 'linear-gradient(135deg, rgba(76,210,130,0.25), rgba(50,180,100,0.15))'
            : isDirty
            ? 'linear-gradient(135deg, rgba(200,155,60,0.35), rgba(160,120,40,0.25))'
            : 'linear-gradient(135deg, rgba(200,155,60,0.18), rgba(160,120,40,0.1))',
          color: saved ? '#5ddf8f' : 'var(--gold)',
          fontSize: 9,
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
          letterSpacing: '0.06em',
          boxShadow: isDirty && !saved
            ? '0 0 14px rgba(200,155,60,0.35), inset 0 1px 0 rgba(255,255,255,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          transition: 'all 0.2s ease',
          minWidth: 90,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14 }}>
          {saving ? '⏳' : saved ? '✓' : '💾'}
        </span>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>

    </div>
  )
}

// ── Small tool button ─────────────────────────────────────────────────────────
function ToolBtn({
  onClick, disabled, title, icon, label, color, bg, border,
}: {
  onClick: () => void
  disabled?: boolean
  title?: string
  icon: string
  label: string
  color?: string
  bg?: string
  border?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '5px 10px',
        borderRadius: 6,
        border: `1px solid ${border ?? 'rgba(200,155,60,0.22)'}`,
        background: bg ?? 'rgba(200,155,60,0.08)',
        color: color ?? 'var(--gold)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        transition: 'all 0.15s',
        flexShrink: 0,
        minWidth: 48,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.3)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = '' }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 5.5, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</span>
    </button>
  )
}
