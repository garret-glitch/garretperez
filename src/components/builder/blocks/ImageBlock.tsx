'use client'
import { useRef } from 'react'
import type { PageBlock, ImageBlockConfig } from '@/types/builder'
import { applyStylesToElement } from '@/lib/block-defaults'

interface Props {
  block: PageBlock
  isEditing: boolean
  onConfigChange?: (c: ImageBlockConfig) => void
}

export default function ImageBlock({ block, isEditing, onConfigChange }: Props) {
  const cfg = block.config as ImageBlockConfig
  const style = applyStylesToElement(block.styles)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onConfigChange?.({ ...cfg, src: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div style={style} onClick={e => isEditing && e.stopPropagation()}>
      {cfg.src ? (
        <div style={{ position: 'relative' }}>
          <img
            src={cfg.src}
            alt={cfg.alt}
            style={{
              width: '100%',
              aspectRatio: cfg.aspectRatio !== 'auto' ? cfg.aspectRatio : undefined,
              objectFit: cfg.objectFit,
              borderRadius: cfg.borderRadius,
              display: 'block',
            }}
          />
          {isEditing && (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.7)', color: 'var(--gold)',
                border: '1px solid var(--gold)', borderRadius: 4,
                padding: '4px 8px', fontSize: 8, cursor: 'pointer',
              }}>
              Change Image
            </button>
          )}
        </div>
      ) : isEditing ? (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: '2px dashed rgba(200,155,60,0.4)', borderRadius: 8,
            padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
            background: 'rgba(200,155,60,0.05)',
          }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
          <p style={{ fontSize: 8, color: 'var(--text-2)' }}>Click to upload image</p>
          <p style={{ fontSize: 7, color: 'var(--text-3)', marginTop: 4 }}>PNG, JPG, GIF up to 2MB</p>
        </div>
      ) : null}
      {isEditing && (
        <>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <input
            value={cfg.alt}
            onChange={e => onConfigChange?.({ ...cfg, alt: e.target.value })}
            placeholder="Alt text..."
            style={{ width: '100%', marginTop: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '4px 8px', fontSize: 8, color: 'var(--text-1)' }}
          />
        </>
      )}
    </div>
  )
}
