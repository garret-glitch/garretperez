'use client'
import { useReducer, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { builderReducer, initialState } from './builderReducer'
import BuilderToolbar from './BuilderToolbar'
import BuilderCanvas from './BuilderCanvas'
import BlockLibraryDrawer from './BlockLibraryDrawer'
import StylesPanel from './StylesPanel'
import type { PageBlock, BlockType, BlockLiveData, BlockStyles } from '@/types/builder'
import { getDefaultConfig, getDefaultStyles } from '@/lib/block-defaults'

interface Props {
  initialBlocks: PageBlock[]
  liveData: BlockLiveData
  showMigrate: boolean
}

export default function BuilderClient({ initialBlocks, liveData, showMigrate }: Props) {
  const [state, dispatch] = useReducer(builderReducer, { ...initialState, blocks: initialBlocks })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const router = useRouter()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); dispatch({ type: 'UNDO' }) }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); dispatch({ type: 'REDO' }) }
      if (e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }) // no dep array — handleSave needs fresh state

  const handleSave = useCallback(async () => {
    setSaving(true)
    const blocks = state.blocks.map(b => ({
      ...b,
      config: typeof b.config === 'string' ? b.config : JSON.stringify(b.config),
      styles: typeof b.styles === 'string' ? b.styles : JSON.stringify(b.styles),
    }))
    await fetch('/api/admin/builder/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSlug: 'home', blocks }),
    })
    dispatch({ type: 'MARK_CLEAN' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }, [state.blocks, router])

  const handleInsertAfter = (afterId: string, type: BlockType) => {
    const afterIdx = state.blocks.findIndex(b => b.id === afterId)
    const newBlock: PageBlock = {
      id: `new-${Date.now()}`,
      pageSlug: 'home',
      type,
      order: afterIdx + 1,
      colSpan: type === 'community-feed' || type === 'text' || type === 'heading' || type === 'divider' ? 2 : 1,
      colStart: 1,
      visible: true,
      config: getDefaultConfig(type),
      styles: getDefaultStyles(type),
    }
    dispatch({ type: 'INSERT_AFTER', payload: { afterId, block: newBlock } })
  }

  const handleAddBlock = (type: BlockType) => {
    const newBlock: PageBlock = {
      id: `new-${Date.now()}`,
      pageSlug: 'home',
      type,
      order: state.blocks.length,
      colSpan: type === 'about' || type === 'text' || type === 'heading' || type === 'divider' ? 2 : 1,
      colStart: 1,
      visible: true,
      config: getDefaultConfig(type),
      styles: getDefaultStyles(type),
    }
    dispatch({ type: 'ADD_BLOCK', payload: newBlock })
  }

  const handleMigrate = async () => {
    if (!confirm('This will import your existing 5 sections as blocks. Continue?')) return
    setMigrating(true)
    const res = await fetch('/api/admin/builder/migrate', { method: 'POST' })
    const data = await res.json()
    setMigrating(false)
    if (res.ok) {
      router.refresh()
    } else {
      alert(data.error ?? 'Migration failed')
    }
  }

  const selectedBlock = state.blocks.find(b => b.id === state.selectedId) ?? null

  return (
    <div style={{ paddingTop: 49 }}>
      <BuilderToolbar
        isDirty={state.isDirty}
        saving={saving || migrating}
        saved={saved}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onSave={handleSave}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onAddBlock={() => dispatch({ type: 'TOGGLE_LIBRARY' })}
        onPreview={() => window.open('/', '_blank')}
        showMigrate={showMigrate && !state.isDirty}
        onMigrate={handleMigrate}
      />

      <BlockLibraryDrawer
        open={state.libraryOpen}
        onClose={() => dispatch({ type: 'TOGGLE_LIBRARY' })}
        onAdd={handleAddBlock}
      />

      {/* Canvas area */}
      <div style={{
        marginLeft: state.libraryOpen ? 280 : 0,
        marginRight: selectedBlock ? 280 : 0,
        transition: 'margin 0.2s ease',
        padding: '24px 20px',
        minHeight: 'calc(100vh - 49px)',
        background: 'var(--bg-page)',
      }}>
        {/* Page label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 7, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Homepage · {state.blocks.length} block{state.blocks.length !== 1 ? 's' : ''}
          </span>
          {state.isDirty && (
            <span style={{ fontSize: 7, color: 'rgba(200,155,60,0.7)' }}>● Unsaved changes</span>
          )}
        </div>

        <BuilderCanvas
          blocks={state.blocks}
          selectedId={state.selectedId}
          liveData={liveData}
          dispatch={dispatch}
          onInsertAfter={handleInsertAfter}
        />
      </div>

      {/* Styles panel */}
      {selectedBlock && (
        <StylesPanel
          block={selectedBlock}
          onStyleChange={(styles: BlockStyles) => dispatch({ type: 'UPDATE_STYLES', payload: { id: selectedBlock.id, styles } })}
          onSpanChange={(colSpan) => dispatch({ type: 'UPDATE_SPAN', payload: { id: selectedBlock.id, colSpan } })}
          onDelete={() => dispatch({ type: 'DELETE_BLOCK', payload: selectedBlock.id })}
          onDuplicate={() => dispatch({ type: 'DUPLICATE_BLOCK', payload: selectedBlock.id })}
          onToggleVisible={() => dispatch({ type: 'TOGGLE_VISIBLE', payload: selectedBlock.id })}
          onClose={() => dispatch({ type: 'SELECT', payload: null })}
        />
      )}
    </div>
  )
}
