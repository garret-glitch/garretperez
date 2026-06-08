'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PostForm({ skillEnum }: { skillEnum: string }) {
  const router = useRouter()
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
      body: JSON.stringify({ skill: skillEnum, title: title.trim(), body: body.trim() }),
    })

    if (res.ok) {
      setTitle('')
      setBody('')
      setStatus('success')
      setMsg('+50 XP earned! Check your skills panel.')
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 4000)
    } else if (res.status === 401) {
      setStatus('error')
      setMsg('You must be logged in to post.')
    } else {
      setStatus('error')
      setMsg('Something went wrong. Try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="osrs-panel space-y-3">
      <h3 className="text-[9px] text-[#3c2a1e] font-bold">✍ Create Post (+50 XP)</h3>
      <input
        className="osrs-input"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        disabled={status === 'submitting'}
        maxLength={120}
      />
      <textarea
        className="osrs-input h-20 resize-none"
        placeholder="Share your thoughts..."
        value={body}
        onChange={e => setBody(e.target.value)}
        disabled={status === 'submitting'}
      />
      <button
        type="submit"
        className="osrs-btn"
        disabled={status === 'submitting' || !title.trim() || !body.trim()}
      >
        {status === 'submitting' ? 'Posting...' : 'Post'}
      </button>
      {msg && (
        <p className={`text-[8px] ${status === 'error' ? 'text-red-700' : 'text-[#007700]'}`}>
          {msg}
        </p>
      )}
    </form>
  )
}
