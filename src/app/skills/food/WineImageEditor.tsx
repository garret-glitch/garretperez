'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  wineId: string
  isDb?: boolean
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export default function WineImageEditor({ wineId, isDb }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3_000_000) { alert('Max image size is 3 MB'); return }
    setBusy(true)
    const image = await toBase64(file)
    await fetch('/api/admin/wine-image', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wineId, image, isDb: !!isDb }),
    })
    router.refresh()
    setBusy(false)
    e.target.value = ''
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        title="Edit wine image"
        style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(200,155,60,0.5)', borderRadius: 20,
          color: '#c89b3c', cursor: busy ? 'wait' : 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
          transition: 'opacity 0.15s',
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? '…' : '📷 Edit Image'}
      </button>
    </>
  )
}
