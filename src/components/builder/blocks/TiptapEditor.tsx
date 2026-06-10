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
import { useEditorCtx } from '../EditorContext'

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
        return types.every(t => commands.updateAttributes(t, { lineHeight: lineHeight || null }))
      },
    }
  },
})

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  html: string
  onChange: (html: string) => void
  fontSize?: number
  color?: string
}

export default function TiptapEditor({ html, onChange, fontSize = 13, color = 'var(--text-1)' }: Props) {
  const { setEditor } = useEditorCtx()
  const [autoSaved, setAutoSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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

  // Register editor in context so TiptapToolbar in StylesPanel can access it
  useEffect(() => {
    setEditor(editor)
    return () => setEditor(null)
  }, [editor, setEditor])

  useEffect(() => {
    if (editor && editor.getHTML() !== html) editor.commands.setContent(html)
  }, [html]) // eslint-disable-line

  if (!editor) return <div style={{ minHeight: 80, padding: 12 }} />

  return (
    <div style={{ border: '1px solid rgba(200,155,60,0.25)', borderRadius: 5 }}>
      <EditorContent editor={editor} />
      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '3px 10px',
        background: 'rgba(0,0,0,0.22)', borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 9, color: 'var(--text-3)',
      }}>
        <span>{editor.storage.characterCount.words()} words</span>
        <span>{editor.storage.characterCount.characters()} chars</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: autoSaved ? '#5ddf8f' : 'var(--text-3)', transition: 'color 0.3s' }}>
          {autoSaved ? '✓ saved' : 'editing'}
        </span>
      </div>
    </div>
  )
}
