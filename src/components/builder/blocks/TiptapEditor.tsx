'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import FontFamily from '@tiptap/extension-font-family'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useState } from 'react'

// ── TypeScript declarations for custom commands ───────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSizeCustom: { setFontSize: (s: string) => ReturnType }
    lineHeightCustom: { setLineHeight: (s: string) => ReturnType }
  }
}

// ── Custom FontSize extension ─────────────────────────────────────────────────
const FontSizeExt = Extension.create({
  name: 'fontSizeCustom',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{ types: this.options.types, attributes: {
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (attrs: { fontSize?: string | null }) =>
          attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
      },
    }}]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: { chain: () => any }) =>
        chain().setMark('textStyle', { fontSize: fontSize || null }).run(),
    }
  },
})

// ── Custom LineHeight extension ───────────────────────────────────────────────
const LineHeightExt = Extension.create({
  name: 'lineHeightCustom',
  addOptions() { return { types: ['paragraph', 'heading'] } },
  addGlobalAttributes() {
    return [{ types: this.options.types, attributes: {
      lineHeight: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
        renderHTML: (attrs: { lineHeight?: string | null }) =>
          attrs.lineHeight ? { style: `line-height:${attrs.lineHeight}` } : {},
      },
    }}]
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ commands }: { commands: any }) => {
        const types = ['paragraph', 'heading']
        return types.every((t) => commands.updateAttributes(t, { lineHeight: lineHeight || null }))
      },
    }
  },
})

// ── Constants ─────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Default font',            value: '' },
  { label: 'Inter (Clean)',            value: "'Inter', system-ui, sans-serif" },
  { label: 'Cinzel (RPG Serif)',       value: "'Cinzel', serif" },
  { label: 'Playfair Display',         value: "'Playfair Display', serif" },
  { label: 'Crimson Pro',              value: "'Crimson Pro', Georgia, serif" },
  { label: 'Rajdhani (Modern)',        value: "'Rajdhani', sans-serif" },
  { label: 'Press Start 2P (Pixel)',   value: "'Press Start 2P', monospace" },
  { label: 'Georgia',                  value: 'Georgia, serif' },
  { label: 'Courier New',              value: "'Courier New', monospace" },
  { label: 'Arial',                    value: 'Arial, sans-serif' },
]

const SIZES = ['10','11','12','13','14','15','16','18','20','24','28','32','36','48','64']
const LINE_HEIGHTS = ['1.0','1.2','1.4','1.5','1.6','1.7','2.0','2.5','3.0']

const EMOJIS = [
  '😀','😂','🥹','😊','😎','🤔','😅','🤣','😍','🥰',
  '❤️','🔥','👍','👎','👏','🙌','🎉','✨','🎊','⭐',
  '🌈','🌸','🌻','🌴','🌿','🌊','☀️','🌙','❄️','⚡',
  '🍕','🍔','🌮','🍜','🎂','☕','🍺','🥂','🍎','🍓',
  '🏆','💎','🔑','💡','🎯','🚀','✈️','🎮','📚','🎸',
  '✅','❌','⚠️','💬','📝','🔍','⚙️','💰','🏠','📌',
  '➡️','⬅️','⬆️','⬇️','🔄','↩️','↪️','🔃','♻️','🔁',
]

const HEADING_OPTIONS = [
  { label: 'Normal text', value: 'p' },
  { label: 'H1 — Title',  value: 'h1' },
  { label: 'H2 — Heading',value: 'h2' },
  { label: 'H3 — Section',value: 'h3' },
  { label: 'H4',          value: 'h4' },
  { label: 'H5',          value: 'h5' },
  { label: 'H6',          value: 'h6' },
]

// ── Toolbar sub-components ────────────────────────────────────────────────────
const SEP = () => (
  <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', margin: '0 2px', flexShrink: 0 }} />
)

const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '2px 6px', border: 'none', cursor: 'pointer', borderRadius: 3,
  fontSize: 12, minWidth: 26, height: 24, flexShrink: 0,
}

function TBtn({
  active = false, disabled = false, onClick, title, children, wide,
}: {
  active?: boolean; disabled?: boolean; onClick: () => void; title?: string
  children: React.ReactNode; wide?: boolean
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        ...btnBase,
        minWidth: wide ? 36 : 26,
        background: active ? 'rgba(200,155,60,0.28)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--gold)' : 'var(--text-2)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: active ? '1px solid rgba(200,155,60,0.45)' : 'none',
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
        borderRadius: 3, color: 'var(--text-2)', fontSize: 10, height: 24, cursor: 'pointer',
        padding: '0 4px', width, flexShrink: 0,
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
        fontSize: 12, fontWeight: 700, lineHeight: 1,
        background: isHighlight ? safeColor : 'transparent',
        padding: isHighlight ? '0 2px' : 0, borderRadius: isHighlight ? 2 : 0,
      }}>
        {letter}
      </span>
      <div style={{ width: 14, height: 3, borderRadius: 1, background: safeColor }} />
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

// ── Main Editor ───────────────────────────────────────────────────────────────
interface Props {
  html: string
  onChange: (html: string) => void
  fontSize?: number
  color?: string
}

export default function TiptapEditor({ html, onChange, fontSize = 13, color = 'var(--text-1)' }: Props) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [tableHover, setTableHover] = useState<[number, number]>([0, 0])
  const [autoSaved, setAutoSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const emojiRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      FontFamily,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      FontSizeExt,
      LineHeightExt,
    ],
    content: html,
    onUpdate: ({ editor: e }) => {
      const newHtml = e.getHTML()
      onChange(newHtml)
      setAutoSaved(false)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setAutoSaved(true)
        setTimeout(() => setAutoSaved(false), 2500)
      }, 1500)
    },
    editorProps: {
      attributes: {
        style: `font-size:${fontSize}px; color:${color}; outline:none; min-height:80px; padding:12px 14px;`,
        class: 'body-text tiptap-editor',
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== html) editor.commands.setContent(html)
  }, [html]) // eslint-disable-line

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false)
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) setShowTable(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!editor) return <div style={{ minHeight: 120 }} />

  // ── State helpers ─────────────────────────────────────────
  const getHeadingVal = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return `h${i}`
    }
    return 'p'
  }
  const currentFont = editor.getAttributes('textStyle').fontFamily ?? ''
  const currentSize = editor.getAttributes('textStyle').fontSize?.replace('px', '') ?? ''
  const currentLH = editor.getAttributes('paragraph').lineHeight
    ?? editor.getAttributes('heading').lineHeight ?? ''
  const currentTextColor = editor.getAttributes('textStyle').color ?? '#e8e6e0'
  const currentHighlight = editor.getAttributes('highlight').color ?? '#ffd60a'

  const setLink = () => {
    const existing = editor.getAttributes('link').href ?? ''
    const url = window.prompt('Link URL (leave blank to remove)', existing)
    if (url === null) return
    if (!url) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: url }).run()
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2,
    padding: '4px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  }
  const popupStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', left: 0, zIndex: 600, marginTop: 4,
    background: '#1a1a28', border: '1px solid rgba(200,155,60,0.35)', borderRadius: 5,
    padding: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  }

  return (
    <div style={{ border: '1px solid rgba(200,155,60,0.3)', borderRadius: 6, overflow: 'hidden' }}>

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div style={{ background: 'rgba(0,0,0,0.42)', userSelect: 'none' }}>

        {/* Row 1 — Block type / Font / Size */}
        <div style={rowStyle}>
          <TSelect
            title="Paragraph style"
            width={124}
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
            width={148}
            value={currentFont}
            onChange={v => {
              if (v) editor.chain().focus().setFontFamily(v).run()
              else (editor.chain().focus() as any).unsetFontFamily().run()
            }}
            options={FONTS}
          />
          <TSelect
            title="Font size"
            width={62}
            value={currentSize}
            onChange={v => editor.chain().focus().setFontSize(v ? `${v}px` : '').run()}
            options={[{ label: 'Size', value: '' }, ...SIZES.map(s => ({ label: s, value: s }))]}
          />
        </div>

        {/* Row 2 — Style / Colors / Alignment / Line height */}
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
          <ColorPicker
            title="Text color"
            letter="A"
            value={currentTextColor}
            onChange={c => editor.chain().focus().setColor(c).run()}
          />
          <ColorPicker
            title="Highlight color"
            letter="H"
            value={currentHighlight}
            onChange={c => editor.chain().focus().setHighlight({ color: c }).run()}
            isHighlight
          />
          <TBtn
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            title="Remove highlight"
          >
            H✕
          </TBtn>
          <SEP />
          {[
            { lbl: '≡←', cmd: 'left',    title: 'Align left' },
            { lbl: '≡↔', cmd: 'center',  title: 'Align center' },
            { lbl: '≡→', cmd: 'right',   title: 'Align right' },
            { lbl: '≡≡', cmd: 'justify', title: 'Justify' },
          ].map(({ lbl, cmd, title }) => (
            <TBtn key={cmd} active={editor.isActive({ textAlign: cmd })}
              onClick={() => editor.chain().focus().setTextAlign(cmd).run()} title={title}>
              {lbl}
            </TBtn>
          ))}
          <SEP />
          <TSelect
            title="Line height"
            width={68}
            value={currentLH}
            onChange={v => editor.chain().focus().setLineHeight(v).run()}
            options={[{ label: 'Leading', value: '' }, ...LINE_HEIGHTS.map(v => ({ label: v, value: v }))]}
          />
        </div>

        {/* Row 3 — Lists / Blocks / Inserts */}
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            •≡
          </TBtn>
          <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
            1≡
          </TBtn>
          <TBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Checklist (☑)">
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
          {/* Table popup */}
          <div ref={tableRef} style={{ position: 'relative' }}>
            <TBtn active={editor.isActive('table') || showTable} onClick={() => setShowTable(s => !s)} title="Insert / edit table">
              ⊞
            </TBtn>
            {showTable && (
              <div style={popupStyle}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 5 }}>
                  {tableHover[0] > 0
                    ? `Insert ${tableHover[1]}×${tableHover[0]} table`
                    : 'Hover to pick table size'}
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
                      { label: '+col', fn: () => editor.chain().focus().addColumnAfter().run() },
                      { label: '-col', fn: () => editor.chain().focus().deleteColumn().run() },
                      { label: '+row', fn: () => editor.chain().focus().addRowAfter().run() },
                      { label: '-row', fn: () => editor.chain().focus().deleteRow().run() },
                      { label: '🗑 tbl', fn: () => { editor.chain().focus().deleteTable().run(); setShowTable(false) } },
                    ].map(({ label, fn }) => (
                      <button key={label} onMouseDown={e => { e.preventDefault(); fn() }} style={{
                        ...btnBase, fontSize: 8, padding: '2px 6px', height: 'auto',
                        background: 'rgba(200,155,60,0.1)', color: 'var(--text-2)',
                        border: '1px solid rgba(200,155,60,0.25)', cursor: 'pointer',
                      }}>{label}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <TBtn active={editor.isActive('link')} onClick={setLink} title="Insert / edit link">
            🔗
          </TBtn>
          {/* Emoji picker */}
          <div ref={emojiRef} style={{ position: 'relative' }}>
            <TBtn onClick={() => setShowEmoji(s => !s)} title="Insert emoji">
              😊
            </TBtn>
            {showEmoji && (
              <div style={{ ...popupStyle, width: 228, maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertContent(emoji).run(); setShowEmoji(false) }}
                    style={{
                      width: 30, height: 30, border: 'none', cursor: 'pointer', borderRadius: 4,
                      background: 'transparent', fontSize: 16, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,155,60,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Editor area ─────────────────────────────────────── */}
      <EditorContent editor={editor} />

      {/* ── Status bar ──────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '3px 10px',
        background: 'rgba(0,0,0,0.28)', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 9, color: 'var(--text-3)',
      }}>
        <span>{editor.storage.characterCount.words()} words</span>
        <span>{editor.storage.characterCount.characters()} characters</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: autoSaved ? '#5ddf8f' : 'var(--text-3)', transition: 'color 0.3s' }}>
          {autoSaved ? '✓ auto-saved' : 'editing…'}
        </span>
      </div>
    </div>
  )
}
