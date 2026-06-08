'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReplyForm({ postId }: { postId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const [open, setOpen] = useState(false)

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
      setBody('')
      setStatus('success')
      setMsg('+5 XP earned!')
      setOpen(false)
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 3000)
    } else if (res.status === 401) {
      setStatus('error')
      setMsg('Login to reply.')
    } else {
      setStatus('error')
      setMsg('Something went wrong.')
    }
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setOpen(true)}
          className="text-[7px] text-[#a0bcd0] hover:underline"
        >
          💬 Reply
        </button>
        {msg && <span className={`text-[7px] ${status === 'error' ? 'text-red-500' : 'text-[#00b800]'}`}>{msg}</span>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-1.5 items-start">
      <textarea
        className="osrs-input flex-1 h-12 resize-none text-[7px]"
        placeholder="Write a reply... (+5 XP)"
        value={body}
        onChange={e => setBody(e.target.value)}
        disabled={status === 'submitting'}
        autoFocus
      />
      <div className="flex flex-col gap-1">
        <button type="submit" className="osrs-btn text-[7px] py-0.5 px-1.5" disabled={status === 'submitting' || !body.trim()}>
          Send
        </button>
        <button type="button" className="osrs-btn text-[7px] py-0.5 px-1.5" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>
    </form>
  )
}
