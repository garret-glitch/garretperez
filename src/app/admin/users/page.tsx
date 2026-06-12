'use client'
import { useEffect, useState } from 'react'

interface AdminUser {
  id: string
  username: string
  createdAt: string
  role: string
  banned: boolean
  totalXp: number
  postCount: number
}

const SKILLS_LIST = ['HEALTH', 'PROJECTS', 'FISHING', 'BUSINESS', 'FOOD', 'COMMUNITY', 'GARDENING', 'FUN', 'TRAVEL']

const BADGE_TYPES = [
  'FOUNDER', 'TOP_POSTER', 'PROJECT_HELPER', 'HALLOWEEN_CREW',
  'GARDENER', 'CRAFTSMAN', 'GAME_WINNER', 'DAILY_ADVENTURER', 'CHEF', 'FIRST_POST',
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // Password reset state per user
  const [pwUserId, setPwUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

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

  async function banUser(userId: string, ban: boolean) {
    await fetch('/api/admin/ban-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban }),
    })
    showMsg(`User ${ban ? 'banned' : 'unbanned'}.`)
    loadUsers()
  }

  async function changeRole(userId: string, role: string) {
    await fetch('/api/admin/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    showMsg('Role updated.')
    loadUsers()
  }

  async function savePassword(userId: string) {
    if (!newPassword.trim()) return showMsg('Enter a new password.', 'err')
    await fetch('/api/admin/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword }),
    })
    setPwUserId(null)
    setNewPassword('')
    showMsg('Password updated.')
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    await fetch('/api/admin/user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    showMsg('User deleted.')
    loadUsers()
  }

  async function adjustXp() {
    if (!xpUserId) return showMsg('Select a user.', 'err')
    await fetch('/api/admin/adjust-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: xpUserId, skill: xpSkill, amount: Number(xpAmount) }),
    })
    showMsg(`XP adjusted for user.`)
    loadUsers()
  }

  async function awardBadge() {
    if (!badgeUserId) return showMsg('Select a user.', 'err')
    await fetch('/api/admin/badge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: badgeUserId, badge: badgeType }),
    })
    showMsg(`Badge ${badgeType} awarded.`)
  }

  async function revokeBadge() {
    if (!badgeUserId) return showMsg('Select a user.', 'err')
    await fetch('/api/admin/badge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: badgeUserId, badge: badgeType }),
    })
    showMsg(`Badge ${badgeType} revoked.`)
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>👥 Users</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          {users.length} total members
        </p>
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

      {/* Users Table */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[9px] font-bold flex-1" style={{ color: 'var(--text-1)' }}>User List</h2>
          <input
            className="osrs-input text-[7px] w-full sm:w-40"
            placeholder="Search username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No users found.</p>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                {/* User info row */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0"
                    style={{ background: 'var(--bg-page)', color: 'var(--gold)', border: '1px solid var(--border-lit)' }}
                  >
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-bold" style={{ color: 'var(--text-1)' }}>
                        {u.username}
                      </span>
                      <span
                        className="text-[5px] px-1 py-0.5 rounded"
                        style={{
                          background: u.role === 'ADMIN' ? '#2a1a00' : 'var(--bg-page)',
                          color: u.role === 'ADMIN' ? 'var(--gold)' : 'var(--text-3)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {u.role}
                      </span>
                      {u.banned && (
                        <span className="text-[5px] px-1 py-0.5 rounded" style={{ background: '#3a1a1a', color: '#e09090' }}>
                          BANNED
                        </span>
                      )}
                    </div>
                    <div className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                      {u.totalXp.toLocaleString()} XP · {u.postCount} posts · Joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Password reset inline */}
                {pwUserId === u.id && (
                  <div className="flex gap-1.5">
                    <input
                      className="osrs-input text-[7px] flex-1"
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button onClick={() => savePassword(u.id)} className="osrs-btn text-[6px]">Save</button>
                    <button onClick={() => setPwUserId(null)} className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090]">✕</button>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => banUser(u.id, !u.banned)}
                    className="admin-action-btn rounded border"
                    style={{
                      borderColor: u.banned ? '#4a8a4a' : '#8a4a4a',
                      color: u.banned ? '#90c890' : '#e09090',
                    }}
                  >
                    {u.banned ? 'Unban' : 'Ban'}
                  </button>
                  <button
                    onClick={() => {
                      const newRole = u.role === 'ADMIN' ? 'USER' : 'ADMIN'
                      if (confirm(`Change ${u.username} to ${newRole}?`)) changeRole(u.id, newRole)
                    }}
                    className="admin-action-btn rounded border"
                    style={{ borderColor: 'var(--border-lit)', color: 'var(--gold)' }}
                  >
                    {u.role === 'ADMIN' ? 'Demote' : 'Make Admin'}
                  </button>
                  <button
                    onClick={() => { setPwUserId(u.id); setNewPassword('') }}
                    className="admin-action-btn rounded border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
                  >
                    Reset PW
                  </button>
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => deleteUser(u.id, u.username)}
                      className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* XP Adjustment */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Adjust XP</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>User</label>
            <select
              className="osrs-input text-[7px] w-full"
              value={xpUserId}
              onChange={e => setXpUserId(e.target.value)}
            >
              <option value="">Select user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Skill</label>
            <select
              className="osrs-input text-[7px] w-full"
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
              className="osrs-input text-[7px] w-full"
              placeholder="50"
              value={xpAmount}
              onChange={e => setXpAmount(e.target.value)}
            />
          </div>
          <button onClick={adjustXp} className="osrs-btn text-[7px]">Adjust XP</button>
        </div>
        <p className="text-[6px]" style={{ color: 'var(--text-3)' }}>Negative amounts remove XP.</p>
      </div>

      {/* Badge Management */}
      <div className="osrs-panel-dark rounded-xl space-y-3">
        <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Badge Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
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
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Badge</label>
            <select
              className="osrs-input text-[7px] w-full"
              value={badgeType}
              onChange={e => setBadgeType(e.target.value)}
            >
              {BADGE_TYPES.map(b => (
                <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1.5">
            <button onClick={awardBadge} className="osrs-btn text-[7px] flex-1 sm:flex-none">Award</button>
            <button
              onClick={revokeBadge}
              className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a] flex-1 sm:flex-none"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
