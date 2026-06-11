'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const C = {
  card:    '#111c2a',
  elevated:'#16243a',
  border:  'rgba(42,122,170,0.22)',
  gold:    '#c89b3c',
  text1:   '#e8e6e0',
  text2:   '#8a9ab0',
  text3:   '#506070',
}

export function getAvatarColor(name: string) {
  const cols = ['#1a4a6a', '#2a3a7a', '#1a5a4a', '#5a3a1a', '#3a2a5a', '#5a1a3a']
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

  const avColor = getAvatarColor(username)

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 16px' }}>
      {!open ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: avColor, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#e8e0d0', fontFamily: 'Inter, sans-serif',
            border: '2px solid rgba(255,255,255,0.08)',
          }}>
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={e => e.key === 'Enter' && setOpen(true)}
            style={{
              flex: 1, background: C.elevated, border: `1px solid rgba(42,122,170,0.18)`,
              borderRadius: 3, padding: '12px 16px', cursor: 'text',
              color: C.text3, fontFamily: 'Inter, sans-serif', fontSize: 14,
            }}
          >
            What&apos;s biting today? Share a catch or tip... 🎣
          </div>
          {msg && (
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: status === 'error' ? '#cc6060' : '#60c080' }}>
              {msg}
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: avColor, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#e8e0d0', fontFamily: 'Inter, sans-serif',
              border: '2px solid rgba(255,255,255,0.08)',
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
                  border: `1px solid rgba(42,122,170,0.25)`, borderRadius: 3,
                  color: C.text1, padding: '10px 14px',
                  fontFamily: 'Inter, sans-serif', fontSize: 14,
                  marginBottom: 8, outline: 'none',
                }}
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share your story, tips, gear recs, or the one that got away..."
                rows={4}
                style={{
                  display: 'block', width: '100%', background: C.elevated,
                  border: `1px solid rgba(42,122,170,0.25)`, borderRadius: 3,
                  color: C.text1, padding: '10px 14px',
                  fontFamily: 'Inter, sans-serif', fontSize: 14,
                  resize: 'vertical', outline: 'none', lineHeight: 1.65,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', paddingLeft: 50 }}>
            {msg && (
              <span style={{ marginRight: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 13, color: status === 'error' ? '#cc6060' : '#60c080' }}>
                {msg}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setOpen(false); setTitle(''); setBody('') }}
              style={{
                padding: '8px 16px', background: 'transparent', borderRadius: 3,
                border: `1px solid rgba(42,122,170,0.3)`, color: C.text2,
                fontFamily: 'Inter, sans-serif', fontSize: 13, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'submitting' || !title.trim() || !body.trim()}
              style={{
                padding: '8px 20px', borderRadius: 3,
                background: 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                border: 'none', color: '#0a0800',
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
