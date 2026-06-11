'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const S = {
  card:    '#13160f',
  elevated:'#1a1e14',
  border:  'rgba(80,160,90,0.2)',
  green:   '#4da85e',
  text1:   '#eef0e8',
  text3:   '#6a8060',
  muted:   '#2a3828',
}

export default function GardeningPostForm() {
  const router = useRouter()
  const [open,   setOpen]   = useState(false)
  const [title,  setTitle]  = useState('')
  const [body,   setBody]   = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg,    setMsg]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setStatus('submitting')
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'GARDENING', title: title.trim(), body: body.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      emitXpGained(data.xpAwarded ?? 50)
      setTitle(''); setBody(''); setOpen(false)
      setStatus('success'); setMsg(`+${data.xpAwarded ?? 50} XP!`)
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    } else {
      setStatus('error')
      setMsg(res.status === 401 ? 'You must be logged in.' : 'Something went wrong.')
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    }
  }

  const base: React.CSSProperties = {
    display: 'block', width: '100%', background: S.elevated,
    border: `1px solid rgba(80,160,90,0.2)`, color: S.text1,
    padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 15,
    outline: 'none', lineHeight: 1.55, borderRadius: 8,
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          role="button" tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={e => e.key === 'Enter' && setOpen(true)}
          style={{
            flex: 1, background: S.card, border: `1px solid rgba(80,160,90,0.15)`,
            padding: '14px 18px', cursor: 'text', borderRadius: 10,
            color: S.muted, fontFamily: 'Inter, sans-serif', fontSize: 15,
          }}
        >
          Share a gardening tip, question, or update…
        </div>
        {msg && <span style={{ fontSize: 13, color: S.green, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{msg}</span>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: S.card, border: `1px solid rgba(80,160,90,0.25)`,
      padding: '20px 22px', borderRadius: 12,
    }}>
      <input
        autoFocus value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What's growing?"
        maxLength={120}
        className="plant-input"
        style={{ ...base, marginBottom: 10 }}
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Share tips, progress, or questions…"
        rows={4}
        className="plant-input"
        style={{ ...base, resize: 'vertical', marginBottom: 14 }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {msg && (
          <span style={{ marginRight: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#c04040' : S.green }}>
            {msg}
          </span>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(''); setBody('') }}
          style={{
            padding: '10px 18px', background: 'transparent',
            border: `1px solid rgba(80,160,90,0.22)`, color: S.text3,
            fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer', borderRadius: 8,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === 'submitting' || !title.trim() || !body.trim()}
          style={{
            padding: '10px 22px', borderRadius: 8,
            background: !title.trim() || !body.trim() ? 'rgba(60,140,70,0.2)' : 'linear-gradient(135deg, #3d8b57, #2d6b42)',
            border: 'none', color: !title.trim() || !body.trim() ? 'rgba(150,220,160,0.3)' : '#e8f0e4',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Post (+50 XP)
        </button>
      </div>
    </form>
  )
}
