'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      setError(data.error || 'Registration failed.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-[280px]">
        <form onSubmit={handleSubmit} className="osrs-panel rounded-xl space-y-4">
          <h1 className="text-[11px] text-[#1a1a1a] font-bold text-center">⚔ Create Account</h1>
          <p className="text-[7px] text-[#3d3d3d] text-center">Everything is free!</p>
          <input
            className="osrs-input"
            placeholder="Username (3–20 chars)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
            maxLength={20}
            autoComplete="username"
          />
          <input
            type="password"
            className="osrs-input"
            placeholder="Password (8+ chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          <input
            type="password"
            className="osrs-input"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
          />
          {error && <p className="text-[8px] text-red-500">{error}</p>}
          <button type="submit" className="osrs-btn w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <p className="text-[7px] text-[#3d3d3d] text-center">
            Already registered?{' '}
            <Link href="/login" className="text-[#a0bcd0] hover:underline">
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
