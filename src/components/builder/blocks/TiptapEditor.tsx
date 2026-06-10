'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { useEffect } from 'react'

interface Props {
  html: string
  onChange: (html: string) => void
  fontSize?: number
  color?: string
}

const BTN = (active: boolean) => ({
  padding: '2px 6px', border: 'none', cursor: 'pointer', borderRadius: 3, fontSize: 11,
  background: active ? 'rgba(200,155,60,0.3)' : 'rgba(255,255,255,0.05)',
  color: active ? 'var(--gold)' : 'var(--text-2)',
} as React.CSSProperties)

export default function TiptapEditor({ html, onChange, fontSize = 13, color = 'var(--text-1)' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content: html,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        style: `font-size:${fontSize}px; color:${color}; line-height:1.7; outline:none; min-height:60px;`,
        class: 'body-text tiptap-editor',
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== html) editor.commands.setContent(html)
  }, [html]) // eslint-disable-line

  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('URL')
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div style={{ border: '1px solid rgba(200,155,60,0.3)', borderRadius: 6, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 6px',
        background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(200,155,60,0.2)' }}>
        {[
          { label: 'B', cmd: () => editor.chain().focus().toggleBold().run(),       active: editor.isActive('bold') },
          { label: 'I', cmd: () => editor.chain().focus().toggleItalic().run(),     active: editor.isActive('italic') },
          { label: 'U', cmd: () => editor.chain().focus().toggleUnderline().run(),  active: editor.isActive('underline') },
          { label: '≡', cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
          { label: '1.', cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
          { label: '←', cmd: () => editor.chain().focus().setTextAlign('left').run(),   active: editor.isActive({ textAlign: 'left' }) },
          { label: '↔', cmd: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }) },
          { label: '→', cmd: () => editor.chain().focus().setTextAlign('right').run(),  active: editor.isActive({ textAlign: 'right' }) },
          { label: '🔗', cmd: setLink, active: editor.isActive('link') },
        ].map(({ label, cmd, active }) => (
          <button key={label} onMouseDown={e => { e.preventDefault(); cmd() }} style={BTN(active)}>{label}</button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
