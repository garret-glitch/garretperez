'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const SPOT_TYPES = ['RIVER', 'LAKE', 'OCEAN', 'POND', 'CREEK', 'RESERVOIR', 'BEACH', 'BAY']

const S = { gold: '#c89b3c', text1: '#f0d898', text2: '#c8a870', text3: '#907848' }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0e0c10',
  border: '1px solid rgba(200,155,60,0.2)', borderRadius: 8,
  color: S.text1, fontFamily: 'Inter, sans-serif', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Press Start 2P', monospace",
  fontSize: 6, color: S.text3, letterSpacing: '0.1em', marginBottom: 7,
}

async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function DeleteSpotButton({ spotId }: { spotId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  async function handleDelete() {
    setBusy(true)
    await fetch(`/api/admin/fishing/spots/${spotId}`, { method: 'DELETE' })
    router.refresh()
  }
  if (confirming) return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button onClick={handleDelete} disabled={busy} style={{ padding: '4px 10px', background: 'rgba(200,50,50,0.85)', border: 'none', color: '#fff', fontSize: 11, borderRadius: 4, cursor: busy ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
        {busy ? '…' : 'Delete'}
      </button>
      <button onClick={() => setConfirming(false)} style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(200,155,60,0.2)', color: S.text3, fontSize: 11, borderRadius: 4, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Cancel</button>
    </div>
  )
  return (
    <button onClick={() => setConfirming(true)} style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(200,50,50,0.3)', color: 'rgba(220,80,80,0.8)', fontSize: 11, borderRadius: 4, cursor: 'pointer', fontFamily: 'Inter, sans-serif', backdropFilter: 'blur(4px)' }}>
      🗑 Remove
    </button>
  )
}

function AddSpotForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('LAKE')
  const [notes, setNotes] = useState('')
  const [tips, setTips] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3_000_000) { setErr('Max image size is 3 MB'); return }
    const b64 = await toBase64(file)
    setImageData(b64); setImagePreview(b64); e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageData) { setErr('Please upload a photo'); return }
    if (!name.trim() || !location.trim() || !notes.trim()) { setErr('Name, location and notes are required'); return }
    setSaving(true); setErr('')
    const res = await fetch('/api/fishing/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image: imageData, location, type, notes, tips }),
    })
    if (res.ok) {
      setName(''); setLocation(''); setType('LAKE'); setNotes(''); setTips('')
      setImageData(null); setImagePreview(null); setOpen(false); onAdded()
    } else {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(200,155,60,0.08)', border: '1px dashed rgba(200,155,60,0.35)', borderRadius: 10, color: S.gold, cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: 7, letterSpacing: '0.08em' }}>
      + ADD SPOT
    </button>
  )

  return (
    <form onSubmit={handleSubmit} style={{ background: '#0e0b14', border: '1px solid rgba(200,155,60,0.3)', borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>📍 ADD SPOT</span>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: S.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>✕</button>
      </div>

      <div>
        <label style={labelStyle}>LOCATION PHOTO *</label>
        <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 180, background: '#0a0810', borderRadius: 10, border: '2px dashed rgba(200,155,60,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏞️</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3 }}>Click to upload location photo</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text3, marginTop: 4, opacity: 0.6 }}>JPG, PNG, WEBP — max 3 MB</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: 'none' }} />
        {imagePreview && <button type="button" onClick={() => { setImageData(null); setImagePreview(null) }} style={{ marginTop: 6, background: 'none', border: 'none', color: S.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Remove image</button>}
      </div>

      <div>
        <label style={labelStyle}>SPOT NAME *</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. Lake Tahoe — South Shore" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>WATER TYPE *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SPOT_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setType(t)} style={{ padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: "'Press Start 2P', monospace", fontSize: 5.5, border: `1px solid ${type === t ? 'rgba(200,155,60,0.6)' : 'rgba(200,155,60,0.18)'}`, background: type === t ? 'rgba(200,155,60,0.12)' : 'transparent', color: type === t ? S.gold : S.text3 }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={labelStyle}>LOCATION *</label>
        <input value={location} onChange={e => setLocation(e.target.value)} maxLength={120} placeholder="e.g. South Lake Tahoe, CA" style={inputStyle} />
      </div>

      <div>
        <label style={labelStyle}>NOTES *</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={500} placeholder="Best time to fish, what bites here, conditions..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div>
        <label style={labelStyle}>BEST SPECIES (comma-separated)</label>
        <input value={tips} onChange={e => setTips(e.target.value)} maxLength={300} placeholder="🎣 Bass, 🐟 Trout, 🦈 Catfish" style={inputStyle} />
      </div>

      {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c05050' }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)', color: S.text3, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}>Cancel</button>
        <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: saving ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)', border: 'none', color: saving ? 'rgba(200,155,60,0.4)' : '#0a0600', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', borderRadius: 8 }}>
          {saving ? 'Saving…' : '📍 Add Spot'}
        </button>
      </div>
    </form>
  )
}

export default function AdminSpotSection({ spotId, deleteOnly }: { spotId?: string; deleteOnly?: boolean }) {
  const router = useRouter()
  if (deleteOnly && spotId) {
    return (
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 4 }}>
        <DeleteSpotButton spotId={spotId} />
      </div>
    )
  }
  return <AddSpotForm onAdded={() => router.refresh()} />
}
