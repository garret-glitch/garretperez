'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const S = {
  card:    '#16120e',
  elevated:'#1c1610',
  border:  'rgba(200,155,60,0.2)',
  gold:    '#c89b3c',
  text1:   '#f0e8d8',
  text3:   '#7a5e3c',
  muted:   '#4a3820',
}

export default function BusinessPostForm() {
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
      body: JSON.stringify({ skill: 'BUSINESS', title: title.trim(), body: body.trim() }),
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
    border: `1px solid ${S.border}`, color: S.text1,
    padding: '12px 16px', fontFamily: 'Inter, sans-serif', fontSize: 15,
    outline: 'none', lineHeight: 1.55,
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          role="button" tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={e => e.key === 'Enter' && setOpen(true)}
          style={{
            flex: 1, background: S.card, border: `1px solid rgba(200,155,60,0.14)`,
            padding: '14px 18px', cursor: 'text',
            color: S.muted, fontFamily: 'Inter, sans-serif', fontSize: 15,
          }}
        >
          Share a business insight, tip, or question…
        </div>
        {msg && <span style={{ fontSize: 13, color: '#60a060', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{msg}</span>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: S.card, border: `1px solid ${S.border}`, padding: '20px 22px' }}>
      <input
        autoFocus value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Discussion title…"
        maxLength={120}
        className="food-input"
        style={{ ...base, marginBottom: 10 }}
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Share your thoughts, analysis, or questions…"
        rows={4}
        className="food-input"
        style={{ ...base, resize: 'vertical', marginBottom: 14 }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
        {msg && (
          <span style={{ marginRight: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#c04040' : '#60a060' }}>
            {msg}
          </span>
        )}
        <button
          type="button"
          onClick={() => { setOpen(false); setTitle(''); setBody('') }}
          style={{
            padding: '10px 18px', background: 'transparent',
            border: `1px solid rgba(200,155,60,0.22)`, color: S.text3,
            fontFamily: 'Inter, sans-serif', fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={status === 'submitting' || !title.trim() || !body.trim()}
          style={{
            padding: '10px 22px',
            background: 'linear-gradient(135deg, #c89b3c, #a07828)',
            border: 'none', color: '#0a0600',
            fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
            cursor: !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
            opacity: !title.trim() || !body.trim() ? 0.5 : 1,
          }}
        >
          Post (+50 XP)
        </button>
      </div>
    </form>
  )
}
