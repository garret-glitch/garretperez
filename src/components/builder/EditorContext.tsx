'use client'
import { createContext, useContext, useState } from 'react'
import type { Editor } from '@tiptap/react'

interface EditorCtxValue {
  editor: Editor | null
  setEditor: (e: Editor | null) => void
}

const EditorCtx = createContext<EditorCtxValue>({ editor: null, setEditor: () => {} })

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  return <EditorCtx.Provider value={{ editor, setEditor }}>{children}</EditorCtx.Provider>
}

export function useEditorCtx() {
  return useContext(EditorCtx)
}
