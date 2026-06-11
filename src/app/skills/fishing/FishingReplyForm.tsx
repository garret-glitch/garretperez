'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  elevated: '#1a1a28',
  border:   'rgba(200,155,60,0.2)',
  text1:    '#e8e6e0',
  text2:    '#a09880',
  text3:    '#605848',
}

export default function FishingReplyForm({ postId }: { postId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setStatus('submitting')
    const res = await fetch('/api/replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, body: body.trim() }),
    })
    if (res.ok) {
      setBody(''); setOpen(false)
      setStatus('success'); setMsg('+5 XP!')
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 3000)
    } else {
      setStatus('error')
      setMsg(res.status === 401 ? 'Login to reply.' : 'Something went wrong.')
      setTimeout(() => { setStatus('idle'); setMsg('') }, 3000)
    }
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'none', border: 'none', padding: '3px 0',
            color: C.text3, fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
          }}
          onMouseOver={e => { e.currentTarget.style.color = '#c89b3c' }}
          onMouseOut={e => { e.currentTarget.style.color = C.text3 }}
        >
          💬 Reply
        </button>
        {msg && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: status === 'error' ? '#cc6060' : '#60aa60' }}>
            {msg}
          </span>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
      <textarea
        autoFocus
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Write a reply... (+5 XP)"
        rows={2}
        disabled={status === 'submitting'}
        style={{
          flex: 1, background: C.elevated, border: `1px solid ${C.border}`,
          color: C.text1, padding: '8px 12px',
          fontFamily: 'Inter, sans-serif', fontSize: 13,
          resize: 'none', outline: 'none', lineHeight: 1.55,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          type="submit"
          disabled={status === 'submitting' || !body.trim()}
          style={{
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #c89b3c, #a07828)',
            border: 'none', color: '#0a0600',
            fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
            cursor: !body.trim() ? 'not-allowed' : 'pointer',
            opacity: !body.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setBody('') }}
          style={{
            padding: '6px 14px', background: 'transparent',
            border: `1px solid rgba(200,155,60,0.25)`,
            color: C.text2, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </form>
  )
}
