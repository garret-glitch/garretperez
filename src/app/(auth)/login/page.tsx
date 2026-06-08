'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
      await fetch('/api/daily-login', { method: 'POST' })
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[280px]">
        <form onSubmit={handleSubmit} className="osrs-panel space-y-4">
          <h1 className="text-[11px] text-[#3c2a1e] font-bold text-center">⚔ Welcome Back</h1>
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
          {error && <p className="text-[8px] text-red-700">{error}</p>}
          <button type="submit" className="osrs-btn w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="text-[7px] text-[#5c3d1e] text-center">
            New adventurer?{' '}
            <Link href="/register" className="text-[#ff981f] hover:underline">
              Register here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
