'use client'
import { useState, useRef } from 'react'

const WINE_TAGS = ['SWEET RED', 'BOLD RED', 'ORGANIC RED', 'CRISP WHITE', 'RICH WHITE', 'ROSÉ', 'SPARKLING']

const S = {
  gold: '#c89b3c', text1: '#f0e8d8', text2: '#b8986c', text3: '#7a5e3c',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#110e16',
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

interface Props {
  onAdded: () => void
}

export default function AdminWineForm({ onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [origin, setOrigin] = useState('')
  const [varietal, setVarietal] = useState('')
  const [abv, setAbv] = useState('')
  const [tag, setTag] = useState('BOLD RED')
  const [notes, setNotes] = useState('')
  const [pairings, setPairings] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3_000_000) { setErr('Max image size is 3 MB'); return }
    const b64 = await toBase64(file)
    setImageData(b64)
    setImagePreview(b64)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageData) { setErr('Please upload a bottle image'); return }
    if (!name.trim() || !origin.trim() || !varietal.trim() || !abv.trim() || !notes.trim()) {
      setErr('All fields are required')
      return
    }
    setSaving(true); setErr('')
    const pairingsArr = pairings.split(',').map(p => p.trim()).filter(Boolean)
    const res = await fetch('/api/wines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, origin, varietal, abv, tag, notes, pairings: pairingsArr, image: imageData }),
    })
    if (res.ok) {
      setName(''); setOrigin(''); setVarietal(''); setAbv(''); setTag('BOLD RED')
      setNotes(''); setPairings(''); setImageData(null); setImagePreview(null)
      setOpen(false)
      onAdded()
    } else {
      const j = await res.json().catch(() => ({}))
      setErr(j.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px', background: 'rgba(200,155,60,0.08)',
          border: '1px dashed rgba(200,155,60,0.35)', borderRadius: 10,
          color: S.gold, cursor: 'pointer', fontFamily: "'Press Start 2P', monospace",
          fontSize: 7, letterSpacing: '0.08em',
        }}
      >
        + ADD WINE
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#0e0b14', border: '1px solid rgba(200,155,60,0.3)',
      borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: S.gold }}>
          🍷 ADD WINE
        </span>
        <button type="button" onClick={() => setOpen(false)}
          style={{ background: 'none', border: 'none', color: S.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>
          ✕
        </button>
      </div>

      {/* Image upload */}
      <div>
        <label style={labelStyle}>BOTTLE IMAGE *</label>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', height: 180, background: '#0a0810', borderRadius: 10,
            border: '2px dashed rgba(200,155,60,0.25)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            position: 'relative',
          }}
        >
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="preview" style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍾</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: S.text3 }}>Click to upload bottle photo</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: S.text3, marginTop: 4, opacity: 0.6 }}>JPG, PNG, WEBP — max 3 MB</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: 'none' }} />
        {imagePreview && (
          <button type="button" onClick={() => { setImageData(null); setImagePreview(null) }}
            style={{ marginTop: 6, background: 'none', border: 'none', color: S.text3, fontSize: 12, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Remove image
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label style={labelStyle}>WINE NAME *</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={100} placeholder="e.g. Juggernaut Cabernet Sauvignon" style={inputStyle} />
      </div>

      {/* Wine type */}
      <div>
        <label style={labelStyle}>WINE TYPE *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {WINE_TAGS.map(t => (
            <button key={t} type="button" onClick={() => setTag(t)} style={{
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
              border: `1px solid ${tag === t ? 'rgba(200,155,60,0.6)' : 'rgba(200,155,60,0.18)'}`,
              background: tag === t ? 'rgba(200,155,60,0.12)' : 'transparent',
              color: tag === t ? S.gold : S.text3,
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Origin + Varietal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>ORIGIN *</label>
          <input value={origin} onChange={e => setOrigin(e.target.value)} maxLength={80} placeholder="e.g. California" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>VARIETAL *</label>
          <input value={varietal} onChange={e => setVarietal(e.target.value)} maxLength={80} placeholder="e.g. 100% Cabernet" style={inputStyle} />
        </div>
      </div>

      {/* ABV */}
      <div>
        <label style={labelStyle}>ABV *</label>
        <input value={abv} onChange={e => setAbv(e.target.value)} maxLength={10} placeholder="e.g. 14.5%" style={{ ...inputStyle, maxWidth: 140 }} />
      </div>

      {/* Tasting notes */}
      <div>
        <label style={labelStyle}>TASTING NOTES *</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={500}
          placeholder="Describe the aromas, palate, and finish..." style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Pairings */}
      <div>
        <label style={labelStyle}>FOOD PAIRINGS</label>
        <input value={pairings} onChange={e => setPairings(e.target.value)} maxLength={300}
          placeholder="🥩 Ribeye, 🧀 Cheese, 🍝 Pasta (comma-separated)" style={inputStyle} />
      </div>

      {err && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#c05050' }}>{err}</div>}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setOpen(false)} style={{
          padding: '10px 18px', background: 'transparent', border: '1px solid rgba(200,155,60,0.2)',
          color: S.text3, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer', borderRadius: 8,
        }}>Cancel</button>
        <button type="submit" disabled={saving} style={{
          padding: '10px 24px',
          background: saving ? 'rgba(200,155,60,0.15)' : 'linear-gradient(135deg, #c89b3c, #a07828)',
          border: 'none', color: saving ? 'rgba(200,155,60,0.4)' : '#0a0600',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
          cursor: saving ? 'wait' : 'pointer', borderRadius: 8,
        }}>{saving ? 'Saving…' : '🍷 Add Wine'}</button>
      </div>
    </form>
  )
}
