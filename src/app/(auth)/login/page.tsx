'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { emitXpGained } from '@/components/XpToast'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid username or password.')
      setLoading(false)
    } else {
      const loginRes = await fetch('/api/daily-login', { method: 'POST' })
      if (loginRes.ok) {
        const d = await loginRes.json()
        if (d.xpAwarded > 0) emitXpGained(d.xpAwarded)
      }
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[320px]">
        <form onSubmit={handleSubmit} className="osrs-panel rounded-xl space-y-4">
          <h1 className="text-[11px] font-bold text-center" style={{ color: 'var(--gold)' }}>⚔ Welcome Back</h1>
          <input
            className="osrs-input"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            autoComplete="username"
          />
          <input
            type="password"
            className="osrs-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <p className="text-[8px]" style={{ color: 'var(--red)' }}>{error}</p>}
          <button type="submit" className="osrs-btn w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="text-[7px] text-center" style={{ color: 'var(--text-2)' }}>
            New adventurer?{' '}
            <Link href="/register" className="hover:underline" style={{ color: '#7eb8d0' }}>
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
