'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UpvoteButton({
  postId,
  count,
  upvoted,
}: {
  postId: string
  count: number
  upvoted: boolean
}) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState(upvoted)
  const [optimisticCount, setOptimisticCount] = useState(count)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    setOptimistic(v => !v)
    setOptimisticCount(c => optimistic ? c - 1 : c + 1)

    const res = await fetch('/api/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })

    if (!res.ok) {
      setOptimistic(upvoted)
      setOptimisticCount(count)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded border transition-colors ${
        optimistic
          ? 'border-[#ffe066] text-[#ffe066] bg-[#2a2a00]'
          : 'border-[#4a4a4a] text-[#707070] hover:border-[#707070] hover:text-[#a0a0a0]'
      }`}
    >
      ▲ {optimisticCount}
    </button>
  )
}
