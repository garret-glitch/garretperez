'use client'
import { useState, useEffect } from 'react'

interface Toast { id: number; amount: number }
let _id = 0

export function emitXpGained(amount: number) {
  if (typeof window === 'undefined' || amount <= 0) return
  window.dispatchEvent(new CustomEvent('xp:gained', { detail: { amount } }))
}

export default function XpToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    function onXp(e: Event) {
      const { amount } = (e as CustomEvent).detail as { amount: number }
      if (!amount || amount <= 0) return
      const id = ++_id
      setToasts(prev => [...prev, { id, amount }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400)
    }
    window.addEventListener('xp:gained', onXp)
    return () => window.removeEventListener('xp:gained', onXp)
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 88, right: 16,
      zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 5,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} className="xp-toast">
          ⚡ +{t.amount} XP
        </div>
      ))}
    </div>
  )
}
