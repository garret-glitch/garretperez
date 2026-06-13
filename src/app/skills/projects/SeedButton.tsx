'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SeedButton() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const router = useRouter()

  async function seed() {
    setLoading(true)
    try {
      const r = await fetch('/api/projects/seed', { method: 'POST' })
      if (r.ok) {
        setMsg('Mustang project seeded!')
        router.refresh()
      } else if (r.status === 409) {
        setMsg('Already seeded.')
      } else {
        setMsg('Error seeding project.')
      }
    } catch {
      setMsg('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        onClick={seed}
        disabled={loading}
        className="osrs-btn"
        style={{ fontSize: 8, padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Seeding...' : '🚗 Seed Mustang Project'}
      </button>
      {msg && (
        <span className="body-text" style={{ fontSize: 11, color: 'var(--text-3)' }}>{msg}</span>
      )}
    </div>
  )
}
