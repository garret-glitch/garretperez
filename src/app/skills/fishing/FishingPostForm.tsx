'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const C = {
  card:    '#13131c',
  elevated:'#1a1a28',
  border:  'rgba(200,155,60,0.2)',
  borderLit:'rgba(200,155,60,0.45)',
  gold:    '#c89b3c',
  text1:   '#e8e6e0',
  text2:   '#a09880',
  text3:   '#605848',
}

export function getAvatarColor(name: string) {
  const cols = ['#2a1a0e', '#1a1a2e', '#0e2018', '#2a0e0e', '#1e1428', '#1a2010']
  return cols[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % cols.length]
}

export function getAvatarBorder(name: string) {
  const cols = ['rgba(200,155,60,0.5)', 'rgba(120,100,200,0.5)', 'rgba(60,160,80,0.5)', 'rgba(200,60,60,0.5)', 'rgba(140,80,220,0.5)', 'rgba(80,160,60,0.5)']
  return cols[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % cols.length]
}

export default function FishingPostForm({ username }: { username: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setStatus('submitting')
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 'FISHING', title: title.trim(), body: body.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      emitXpGained(data.xpAwarded ?? 50)
      setTitle(''); setBody(''); setOpen(false)
      setStatus('success'); setMsg(`+${data.xpAwarded ?? 50} XP earned!`)
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    } else {
      setStatus('error')
      setMsg(res.status === 401 ? 'You must be logged in.' : 'Something went wrong.')
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    }
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: '14px 16px' }}>
      {!open ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
            background: getAvatarColor(username),
            border: `2px solid ${getAvatarBorder(username)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#d8c890', fontFamily: 'Inter, sans-serif',
          }}>
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={e => e.key === 'Enter' && setOpen(true)}
            style={{
              flex: 1, background: C.elevated, border: `1px solid rgba(200,155,60,0.14)`,
              padding: '12px 16px', cursor: 'text',
              color: C.text3, fontFamily: 'Inter, sans-serif', fontSize: 14,
            }}
          >
            Share a catch, tip, or story... 🎣
          </div>
          {msg && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: status === 'error' ? '#cc6060' : '#60aa60' }}>
              {msg}
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: getAvatarColor(username),
              border: `2px solid ${getAvatarBorder(username)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#d8c890', fontFamily: 'Inter, sans-serif',
            }}>
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Post title..."
                maxLength={120}
                style={{
                  display: 'block', width: '100%', background: C.elevated,
                  border: `1px solid ${C.border}`, color: C.text1,
                  padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 14,
                  marginBottom: 8, outline: 'none',
                }}
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share your story, tips, gear, or the one that got away..."
                rows={4}
                style={{
                  display: 'block', width: '100%', background: C.elevated,
                  border: `1px solid ${C.border}`, color: C.text1,
                  padding: '10px 14px', fontFamily: 'Inter, sans-serif', fontSize: 14,
                  resize: 'vertical', outline: 'none', lineHeight: 1.65,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', paddingLeft: 50 }}>
            {msg && (
              <span style={{ marginRight: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#cc6060' : '#60aa60' }}>
                {msg}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setTitle(''); setBody('') }}
              style={{
                padding: '8px 16px', background: 'transparent',
                border: `1px solid rgba(200,155,60,0.25)`, color: C.text2,
                fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'submitting' || !title.trim() || !body.trim()}
              style={{
                padding: '8px 20px',
                background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                border: 'none', color: '#0a0600',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
                cursor: status === 'submitting' || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
                opacity: status === 'submitting' || !title.trim() || !body.trim() ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {status === 'submitting' ? 'Posting...' : 'Post (+50 XP)'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
