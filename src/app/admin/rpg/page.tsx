'use client'
import { useEffect, useState } from 'react'

interface AdminUser {
  id: string
  username: string
  totalXp: number
  postCount: number
}

const SKILLS_LIST = ['HEALTH', 'PROJECTS', 'FISHING', 'BUSINESS', 'FOOD', 'COMMUNITY', 'GARDENING', 'FUN', 'TRAVEL']

const BADGE_LIST = [
  { value: 'FOUNDER', label: '👑 Founder' },
  { value: 'TOP_POSTER', label: '📝 Top Poster' },
  { value: 'PROJECT_HELPER', label: '⚒️ Project Helper' },
  { value: 'HALLOWEEN_CREW', label: '🎃 Halloween Crew' },
  { value: 'GARDENER', label: '🌱 Gardener' },
  { value: 'CRAFTSMAN', label: '🔨 Craftsman' },
  { value: 'GAME_WINNER', label: '🏆 Game Winner' },
  { value: 'DAILY_ADVENTURER', label: '🌅 Daily Adventurer' },
  { value: 'CHEF', label: '👨‍🍳 Chef' },
  { value: 'FIRST_POST', label: '✍️ First Post' },
]

export default function AdminRpgPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // XP form
  const [xpUserId, setXpUserId] = useState('')
  const [xpSkill, setXpSkill] = useState('HEALTH')
  const [xpAmount, setXpAmount] = useState('50')

  // Badge form
  const [badgeUserId, setBadgeUserId] = useState('')
  const [badgeType, setBadgeType] = useState('FOUNDER')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch {
      showMsg('Failed to load users.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function adjustXp() {
    if (!xpUserId) return showMsg('Select a user.', 'err')
    try {
      await fetch('/api/admin/adjust-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: xpUserId, skill: xpSkill, amount: Number(xpAmount) }),
      })
      showMsg(`XP adjusted!`)
      loadUsers()
    } catch {
      showMsg('Failed.', 'err')
    }
  }

  async function awardBadge() {
    if (!badgeUserId) return showMsg('Select a user.', 'err')
    try {
      await fetch('/api/admin/badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: badgeUserId, badge: badgeType }),
      })
      showMsg(`Badge awarded!`)
    } catch {
      showMsg('Failed.', 'err')
    }
  }

  async function revokeBadge() {
    if (!badgeUserId) return showMsg('Select a user.', 'err')
    try {
      await fetch('/api/admin/badge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: badgeUserId, badge: badgeType }),
      })
      showMsg(`Badge revoked.`)
    } catch {
      showMsg('Failed.', 'err')
    }
  }

  async function resetXp() {
    if (!confirm('Reset ALL your skill XP to 0 (level 1)? This cannot be undone.')) return
    try {
      const res = await fetch('/api/admin/reset-xp', { method: 'POST' })
      const data = await res.json()
      showMsg(data.message ?? data.error ?? 'XP reset.')
      loadUsers()
    } catch {
      showMsg('Reset failed.', 'err')
    }
  }

  const topUsers = [...users].sort((a, b) => b.totalXp - a.totalXp).slice(0, 10)
  const maxXp = topUsers[0]?.totalXp ?? 1

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>🎮 RPG System</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>XP leaderboard, badge awards, and system tools.</p>
      </div>

      {msg && (
        <div
          className="rounded px-3 py-1.5 text-[7px]"
          style={{
            background: msgType === 'ok' ? '#1a3a1a' : '#3a1a1a',
            border: `1px solid ${msgType === 'ok' ? '#4a8a4a' : '#8a4a4a'}`,
            color: msgType === 'ok' ? '#90c890' : '#e09090',
          }}
        >
          {msg}
        </div>
      )}

      {/* XP Leaderboard */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>XP Leaderboard</h2>
        {loading ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
        ) : (
          <div className="space-y-1.5">
            {topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-2">
                <span className="text-[6px] w-5 text-right shrink-0" style={{ color: 'var(--text-3)' }}>
                  #{i + 1}
                </span>
                <span className="text-[7px] w-24 truncate shrink-0" style={{ color: 'var(--text-1)' }}>
                  {u.username}
                </span>
                <div
                  className="flex-1 rounded-sm overflow-hidden"
                  style={{ height: '8px', background: 'var(--bg-page)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${(u.totalXp / maxXp) * 100}%`,
                      background: 'linear-gradient(90deg, #2a5a18, #3a7a22)',
                    }}
                  />
                </div>
                <span className="text-[6px] w-16 text-right shrink-0" style={{ color: 'var(--gold)' }}>
                  {u.totalXp.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Adjust XP */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Adjust XP</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>User</label>
            <select
              className="osrs-input text-[7px] w-full"
              value={xpUserId}
              onChange={e => setXpUserId(e.target.value)}
            >
              <option value="">Select user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.totalXp.toLocaleString()} XP)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Skill</label>
            <select
              className="osrs-input text-[7px]"
              value={xpSkill}
              onChange={e => setXpSkill(e.target.value)}
            >
              {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Amount</label>
            <input
              type="number"
              className="osrs-input text-[7px] w-20"
              placeholder="50"
              value={xpAmount}
              onChange={e => setXpAmount(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button onClick={adjustXp} className="osrs-btn text-[7px]">Adjust XP</button>
          </div>
        </div>
        <p className="text-[6px]" style={{ color: 'var(--text-3)' }}>Negative amounts remove XP.</p>
      </div>

      {/* Award Badge */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Award Badge</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>User</label>
            <select
              className="osrs-input text-[7px] w-full"
              value={badgeUserId}
              onChange={e => setBadgeUserId(e.target.value)}
            >
              <option value="">Select user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Badge</label>
            <select
              className="osrs-input text-[7px] w-full"
              value={badgeType}
              onChange={e => setBadgeType(e.target.value)}
            >
              {BADGE_LIST.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <button onClick={awardBadge} className="osrs-btn text-[7px]">Award</button>
            <button
              onClick={revokeBadge}
              className="text-[6px] px-2 py-1 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="osrs-panel-dark rounded-xl space-y-2"
        style={{ border: '1px solid #8a4a4a' }}
      >
        <h2 className="text-[9px] font-bold" style={{ color: '#e09090' }}>⚠️ Danger Zone</h2>
        <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>
          Reset ALL your own skill XP to 0 (level 1). This affects only your admin account and cannot be undone.
        </p>
        <button
          onClick={resetXp}
          className="text-[6px] px-2 py-1.5 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
        >
          ⚠️ Reset My XP to Level 1
        </button>
      </div>
    </div>
  )
}
