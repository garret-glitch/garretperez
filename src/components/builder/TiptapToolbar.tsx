'use client'
import { createPortal } from 'react-dom'
import { useEditorCtx } from './EditorContext'
import { useRef, useState, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Default font',           value: '' },
  { label: 'Inter (Clean)',          value: "'Inter', system-ui, sans-serif" },
  { label: 'Cinzel (RPG Serif)',     value: "'Cinzel', serif" },
  { label: 'Playfair Display',       value: "'Playfair Display', serif" },
  { label: 'Crimson Pro',            value: "'Crimson Pro', Georgia, serif" },
  { label: 'Rajdhani (Modern)',      value: "'Rajdhani', sans-serif" },
  { label: 'Press Start 2P (Pixel)',  value: "'Press Start 2P', monospace" },
  { label: 'Georgia',                value: 'Georgia, serif' },
  { label: 'Courier New',            value: "'Courier New', monospace" },
  { label: 'Arial',                  value: 'Arial, sans-serif' },
]

const SIZES = ['10','11','12','13','14','15','16','18','20','24','28','32','36','48','64']
const LINE_HEIGHTS = ['1.0','1.2','1.4','1.5','1.6','1.7','2.0','2.5','3.0']
const HEADING_OPTIONS = [
  { label: 'Normal text', value: 'p' },
  { label: 'H1 — Title',  value: 'h1' },
  { label: 'H2 — Heading',value: 'h2' },
  { label: 'H3 — Section',value: 'h3' },
  { label: 'H4',          value: 'h4' },
  { label: 'H5',          value: 'h5' },
  { label: 'H6',          value: 'h6' },
]
const EMOJIS = [
  '😀','😂','🥹','😊','😎','🤔','😅','🤣','😍','🥰',
  '❤️','🔥','👍','👎','👏','🙌','🎉','✨','🎊','⭐',
  '🌈','🌸','🌻','🌴','🌿','🌊','☀️','🌙','❄️','⚡',
  '🍕','🍔','🌮','🍜','🎂','☕','🍺','🥂','🍎','🍓',
  '🏆','💎','🔑','💡','🎯','🚀','✈️','🎮','📚','🎸',
  '✅','❌','⚠️','💬','📝','🔍','⚙️','💰','🏠','📌',
  '➡️','⬅️','⬆️','⬇️','🔄','↩️','↪️','♻️','🔁','🔃',
]

// ── Sub-components ────────────────────────────────────────────────────────────
const SEP = () => (
  <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px', flexShrink: 0 }} />
)

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '2px 5px', border: 'none', cursor: 'pointer', borderRadius: 3,
  fontSize: 11, minWidth: 24, height: 22, flexShrink: 0,
}

function TBtn({
  active = false, disabled = false, onClick, title, children,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; title?: string
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        ...btnBase,
        background: active ? 'rgba(200,155,60,0.3)' : 'rgba(255,255,255,0.06)',
        color: active ? 'var(--gold)' : 'var(--text-2)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: active ? '1px solid rgba(200,155,60,0.4)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function TSelect({
  value, onChange, options, title, width,
}: {
  value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]; title?: string; width?: number
}) {
  return (
    <select
      title={title}
      value={value}
      onChange={e => onChange(e.target.value)}
      onMouseDown={e => e.stopPropagation()}
      style={{
        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 3, color: 'var(--text-2)', fontSize: 9, height: 22, cursor: 'pointer',
        padding: '0 3px', width, flexShrink: 0,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: '#1a1a28', color: '#e8e6e0' }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function ColorPicker({ value, onChange, title, letter, isHighlight }: {
  value: string; onChange: (c: string) => void; title: string; letter: string; isHighlight?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(value) ? value : (isHighlight ? '#ffd60a' : '#e8e6e0')
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); inputRef.current?.click() }}
      style={{ ...btnBase, flexDirection: 'column', gap: 1, padding: '2px 5px', position: 'relative' }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, lineHeight: 1,
        background: isHighlight ? safeColor : 'transparent',
        padding: isHighlight ? '0 2px' : 0, borderRadius: 2,
      }}>
        {letter}
      </span>
      <div style={{ width: 13, height: 3, borderRadius: 1, background: safeColor }} />
      <input
        ref={inputRef}
        type="color"
        value={safeColor}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />
    </button>
  )
}

const rowStyle: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
  padding: '4px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)',
}

const popupBase: React.CSSProperties = {
  position: 'fixed', zIndex: 9999,
  background: '#1a1a28', border: '1px solid rgba(200,155,60,0.35)', borderRadius: 5,
  padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
}

// ── Main toolbar ──────────────────────────────────────────────────────────────
export default function TiptapToolbar() {
  const { editor } = useEditorCtx()
  const [mounted, setMounted] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [tableHover, setTableHover] = useState<[number, number]>([0, 0])
  const [emojiPos, setEmojiPos] = useState({ top: 0, left: 0 })
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 })
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const tableBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!showEmoji && !showTable) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Element
      if (!t.closest?.('[data-tiptap-emoji]') && !emojiBtnRef.current?.contains(t as Node)) setShowEmoji(false)
      if (!t.closest?.('[data-tiptap-table]') && !tableBtnRef.current?.contains(t as Node)) setShowTable(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji, showTable])

  if (!editor) {
    return (
      <div style={{ padding: '10px 8px', fontSize: 9, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.7 }}>
        Click inside a Text block on the canvas to activate formatting tools.
      </div>
    )
  }

  // ── State helpers ──────────────────────────────────────────
  const getHeadingVal = () => {
    for (let i = 1; i <= 6; i++) if (editor.isActive('heading', { level: i })) return `h${i}`
    return 'p'
  }
  const currentFont   = editor.getAttributes('textStyle').fontFamily ?? ''
  const currentSize   = editor.getAttributes('textStyle').fontSize?.replace('px', '') ?? ''
  const currentLH     = editor.getAttributes('paragraph').lineHeight ?? editor.getAttributes('heading').lineHeight ?? ''
  const currentColor  = editor.getAttributes('textStyle').color ?? '#e8e6e0'
  const currentHL     = editor.getAttributes('highlight').color ?? '#ffd60a'

  const setLink = () => {
    const existing = editor.getAttributes('link').href ?? ''
    const url = window.prompt('Link URL (blank to remove)', existing)
    if (url === null) return
    if (!url) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: url }).run()
  }

  const openEmoji = () => {
    const r = emojiBtnRef.current?.getBoundingClientRect()
    if (r) setEmojiPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 240) })
    setShowEmoji(s => !s)
    setShowTable(false)
  }

  const openTable = () => {
    const r = tableBtnRef.current?.getBoundingClientRect()
    if (r) setTablePos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 220) })
    setShowTable(s => !s)
    setShowEmoji(false)
  }

  return (
    <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(200,155,60,0.2)', borderRadius: 5 }}>

      {/* Row 1 — Block type / Font family / Font size */}
      <div style={rowStyle}>
        <TSelect
          title="Paragraph style"
          width={116}
          value={getHeadingVal()}
          onChange={v => {
            if (v === 'p') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().setHeading({ level: parseInt(v[1]) as 1|2|3|4|5|6 }).run()
          }}
          options={HEADING_OPTIONS}
        />
        <SEP />
        <TSelect
          title="Font family"
          width={136}
          value={currentFont}
          onChange={v => {
            if (v) editor.chain().focus().setFontFamily(v).run()
            else (editor.chain().focus() as any).unsetFontFamily().run()
          }}
          options={FONTS}
        />
        <TSelect
          title="Font size"
          width={58}
          value={currentSize}
          onChange={v => editor.chain().focus().setFontSize(v ? `${v}px` : '').run()}
          options={[{ label: 'Size', value: '' }, ...SIZES.map(s => ({ label: s, value: s }))]}
        />
      </div>

      {/* Row 2 — Text style / Colors / Alignment / Line height */}
      <div style={rowStyle}>
        <TBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </TBtn>
        <TBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
          <em>I</em>
        </TBtn>
        <TBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </TBtn>
        <TBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </TBtn>
        <SEP />
        <ColorPicker title="Text color" letter="A" value={currentColor}
          onChange={c => editor.chain().focus().setColor(c).run()} />
        <ColorPicker title="Highlight color" letter="H" value={currentHL} isHighlight
          onChange={c => editor.chain().focus().setHighlight({ color: c }).run()} />
        <TBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().unsetHighlight().run()} title="Remove highlight">
          H✕
        </TBtn>
        <SEP />
        {([
          { lbl: '≡←', cmd: 'left',    title: 'Left' },
          { lbl: '↔≡', cmd: 'center',  title: 'Center' },
          { lbl: '≡→', cmd: 'right',   title: 'Right' },
          { lbl: '≡≡', cmd: 'justify', title: 'Justify' },
        ] as const).map(({ lbl, cmd, title }) => (
          <TBtn key={cmd} active={editor.isActive({ textAlign: cmd })}
            onClick={() => editor.chain().focus().setTextAlign(cmd).run()} title={title}>
            {lbl}
          </TBtn>
        ))}
        <SEP />
        <TSelect
          title="Line height"
          width={62}
          value={currentLH}
          onChange={v => editor.chain().focus().setLineHeight(v).run()}
          options={[{ label: 'Leading', value: '' }, ...LINE_HEIGHTS.map(v => ({ label: v, value: v }))]}
        />
      </div>

      {/* Row 3 — Lists / Block elements / Inserts */}
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
          •≡
        </TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
          1≡
        </TBtn>
        <TBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist">
          ☑
        </TBtn>
        <SEP />
        <TBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
          ❝
        </TBtn>
        <TBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">
          &lt;/&gt;
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal divider">
          ─
        </TBtn>
        <SEP />
        {/* Table */}
        <button
          ref={tableBtnRef}
          title="Insert / edit table"
          onMouseDown={e => { e.preventDefault(); openTable() }}
          style={{
            ...btnBase,
            background: editor.isActive('table') || showTable ? 'rgba(200,155,60,0.28)' : 'rgba(255,255,255,0.06)',
            color: editor.isActive('table') || showTable ? 'var(--gold)' : 'var(--text-2)',
            outline: editor.isActive('table') || showTable ? '1px solid rgba(200,155,60,0.4)' : 'none',
          }}
        >
          ⊞
        </button>
        {/* Link */}
        <TBtn active={editor.isActive('link')} onClick={setLink} title="Insert / edit link">
          🔗
        </TBtn>
        {/* Emoji */}
        <button
          ref={emojiBtnRef}
          title="Insert emoji"
          onMouseDown={e => { e.preventDefault(); openEmoji() }}
          style={{ ...btnBase, background: showEmoji ? 'rgba(200,155,60,0.2)' : 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}
        >
          😊
        </button>
      </div>

      {/* ── Portals for floating popups ────────────────────── */}
      {mounted && showEmoji && createPortal(
        <div
          data-tiptap-emoji=""
          style={{ ...popupBase, top: emojiPos.top, left: emojiPos.left, width: 230, maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1 }}
        >
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertContent(emoji).run(); setShowEmoji(false) }}
              style={{ width: 30, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4, background: 'transparent', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}

      {mounted && showTable && createPortal(
        <div data-tiptap-table="" style={{ ...popupBase, top: tablePos.top, left: tablePos.left }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 5 }}>
            {tableHover[0] > 0 ? `Insert ${tableHover[1]}×${tableHover[0]} table` : 'Hover to pick size'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 2 }}>
            {Array.from({ length: 36 }, (_, i) => {
              const r = Math.floor(i / 6) + 1, c = (i % 6) + 1
              const hl = r <= tableHover[0] && c <= tableHover[1]
              return (
                <div
                  key={i}
                  onMouseEnter={() => setTableHover([r, c])}
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: tableHover[0], cols: tableHover[1], withHeaderRow: true }).run()
                    setShowTable(false)
                  }}
                  style={{
                    width: 22, height: 22, border: '1px solid', borderRadius: 2, cursor: 'pointer',
                    borderColor: hl ? 'rgba(200,155,60,0.7)' : 'rgba(255,255,255,0.1)',
                    background: hl ? 'rgba(200,155,60,0.22)' : 'transparent',
                  }}
                />
              )
            })}
          </div>
          {editor.isActive('table') && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {[
                { label: '+col',    fn: () => editor.chain().focus().addColumnAfter().run() },
                { label: '-col',    fn: () => editor.chain().focus().deleteColumn().run() },
                { label: '+row',    fn: () => editor.chain().focus().addRowAfter().run() },
                { label: '-row',    fn: () => editor.chain().focus().deleteRow().run() },
                { label: '🗑 tbl', fn: () => { editor.chain().focus().deleteTable().run(); setShowTable(false) } },
              ].map(({ label, fn }) => (
                <button key={label} onMouseDown={e => { e.preventDefault(); fn() }} style={{
                  ...btnBase, fontSize: 8, padding: '2px 5px', height: 'auto',
                  background: 'rgba(200,155,60,0.1)', color: 'var(--text-2)',
                  border: '1px solid rgba(200,155,60,0.25)', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
