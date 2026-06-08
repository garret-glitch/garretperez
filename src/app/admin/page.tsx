'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface User {
  id: string; username: string; createdAt: string; role: string; banned: boolean
}
interface Post {
  id: string; title: string; skill: string; createdAt: string
  user: { username: string }
}
interface Announcement {
  id: string; title: string; body: string; createdAt: string
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'posts' | 'announce' | 'settings'>('settings')

  // XP form
  const [xpUser, setXpUser] = useState('')
  const [xpSkill, setXpSkill] = useState('HEALTH')
  const [xpAmount, setXpAmount] = useState('50')

  // Announcement form
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')

  // Photo upload
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)

  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    loadData()
  }, [session, status, router])

  async function loadData() {
    setLoading(true)
    try {
      const [u, p, a, s] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/admin/posts').then(r => r.json()),
        fetch('/api/admin/announcements').then(r => r.json()),
        fetch('/api/admin/settings').then(r => r.json()),
      ])
      setUsers(u.users ?? [])
      setPosts(p.posts ?? [])
      setAnnouncements(a.announcements ?? [])
      if (s.settings?.headshot) setPhotoPreview(s.settings.headshot)
    } catch {
      setMsg('Failed to load data')
    }
    setLoading(false)
  }

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMsg('Photo must be under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function savePhoto() {
    if (!photoPreview) return
    setPhotoSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'headshot', value: photoPreview }),
    })
    setMsg('Profile photo saved! Reload the homepage to see it.')
    setPhotoSaving(false)
  }

  async function removePhoto() {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'headshot', value: '' }),
    })
    setPhotoPreview(null)
    setMsg('Photo removed.')
  }

  async function banUser(userId: string, ban: boolean) {
    await fetch('/api/admin/ban-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban }),
    })
    setMsg(`User ${ban ? 'banned' : 'unbanned'}.`)
    loadData()
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this post?')) return
    await fetch('/api/admin/delete-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    })
    setMsg('Post deleted.')
    loadData()
  }

  async function adjustXp() {
    if (!xpUser.trim()) return setMsg('Enter a username.')
    const user = users.find(u => u.username === xpUser.trim())
    if (!user) return setMsg('User not found.')
    await fetch('/api/admin/adjust-xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, skill: xpSkill, amount: Number(xpAmount) }),
    })
    setMsg(`+${xpAmount} XP to ${xpUser} (${xpSkill}).`)
  }

  async function createAnnouncement() {
    if (!aTitle.trim() || !aBody.trim()) return setMsg('Fill in title and body.')
    await fetch('/api/admin/announcement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: aTitle, body: aBody }),
    })
    setATitle(''); setABody('')
    setMsg('Announcement posted!')
    loadData()
  }

  async function deleteAnnouncement(id: string) {
    await fetch('/api/admin/announcement', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMsg('Announcement deleted.')
    loadData()
  }

  async function resetMyXp() {
    if (!confirm('Reset ALL your skill XP to 0 (level 1)? This cannot be undone.')) return
    const res = await fetch('/api/admin/reset-xp', { method: 'POST' })
    const data = await res.json()
    setMsg(data.message ?? data.error ?? 'Done.')
  }

  if (status === 'loading' || loading) {
    return <div className="osrs-panel-dark rounded-xl text-[8px] text-[#909090] text-center py-10">Loading...</div>
  }

  const SKILLS_LIST = ['HEALTH','PROJECTS','FISHING','BUSINESS','FOOD','COMMUNITY','GARDENING','FUN','TRAVEL']

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[13px] text-[#e0e0e0] font-bold">⚙️ Admin Dashboard</h1>
        <p className="text-[7px] text-[#707070] mt-0.5">
          {users.length} members · {posts.length} posts
        </p>
        {msg && (
          <div className="mt-2 bg-[#283828] border border-[#4a8a4a] rounded px-2 py-1 text-[7px] text-[#90c890]">
            {msg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['settings', 'users', 'posts', 'announce'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`osrs-btn text-[7px] capitalize ${tab === t ? 'brightness-125' : 'opacity-70'}`}
          >
            {t === 'announce' ? 'Announcements' : t === 'settings' ? '⚙ Settings' : t}
          </button>
        ))}
      </div>

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="osrs-panel-dark rounded-xl space-y-4">
          <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Profile Photo</h2>

          {/* Preview */}
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold"
              style={{ border: '2px solid var(--border-lit)', background: 'var(--bg-page)', color: 'var(--gold)' }}>
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                : 'GP'}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>
                Upload a photo under 2 MB (JPG or PNG). It will show on your homepage hero.
              </p>
              <label className="osrs-btn text-[7px] cursor-pointer inline-block">
                📁 Choose Photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoFile}
                />
              </label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={savePhoto}
                  disabled={!photoPreview || photoSaving}
                  className="osrs-btn text-[7px]"
                >
                  {photoSaving ? 'Saving…' : '✓ Save Photo'}
                </button>
                {photoPreview && (
                  <button onClick={removePhoto} className="osrs-btn text-[7px] opacity-60">
                    ✕ Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-[9px] font-bold mb-1" style={{ color: 'var(--text-1)' }}>Reset My XP</h2>
            <p className="text-[7px] mb-2" style={{ color: 'var(--text-2)' }}>
              Sets all your skill XP to 0 (level 1). Cannot be undone.
            </p>
            <button onClick={resetMyXp} className="osrs-btn text-[7px] opacity-80 hover:opacity-100">
              ⚠ Reset All My XP to Level 1
            </button>
          </div>
        </div>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <div className="space-y-3">
          {/* XP adjuster */}
          <div className="osrs-panel-dark rounded-xl">
            <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Adjust XP</h2>
            <div className="flex gap-2 flex-wrap">
              <input
                className="osrs-input text-[7px] flex-1 min-w-[80px]"
                placeholder="username"
                value={xpUser}
                onChange={e => setXpUser(e.target.value)}
              />
              <select
                className="osrs-input text-[7px]"
                value={xpSkill}
                onChange={e => setXpSkill(e.target.value)}
              >
                {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                type="number"
                className="osrs-input text-[7px] w-16"
                value={xpAmount}
                onChange={e => setXpAmount(e.target.value)}
              />
              <button onClick={adjustXp} className="osrs-btn text-[7px]">Grant XP</button>
            </div>
          </div>

          {/* User list */}
          <div className="osrs-panel-dark rounded-xl">
            <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Members ({users.length})</h2>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-2 bg-[#282828] rounded-lg px-3 py-2">
                  <span className="text-sm">{u.role === 'ADMIN' ? '👑' : '🧙'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] text-[#d0d0d0] font-bold truncate">{u.username}</div>
                    <div className="text-[6px] text-[#707070]">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                      {u.banned && <span className="ml-1 text-[#e07070]">BANNED</span>}
                    </div>
                  </div>
                  {u.username !== 'garret' && (
                    <button
                      onClick={() => banUser(u.id, !u.banned)}
                      className={`text-[6px] px-1.5 py-0.5 rounded border ${
                        u.banned
                          ? 'border-[#4a8a4a] text-[#90c890] hover:bg-[#1a3a1a]'
                          : 'border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]'
                      }`}
                    >
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Posts tab */}
      {tab === 'posts' && (
        <div className="osrs-panel-dark rounded-xl">
          <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Posts ({posts.length})</h2>
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {posts.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-[#282828] rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[8px] text-[#d0d0d0] truncate">{p.title}</div>
                  <div className="text-[6px] text-[#707070]">
                    by {p.user.username} · {p.skill} · {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => deletePost(p.id)}
                  className="text-[6px] px-1.5 py-0.5 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a] shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements tab */}
      {tab === 'announce' && (
        <div className="space-y-3">
          <div className="osrs-panel-dark rounded-xl">
            <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Post Announcement</h2>
            <div className="space-y-2">
              <input
                className="osrs-input text-[7px] w-full"
                placeholder="Title"
                value={aTitle}
                onChange={e => setATitle(e.target.value)}
              />
              <textarea
                className="osrs-input text-[7px] w-full h-20 resize-none"
                placeholder="Body"
                value={aBody}
                onChange={e => setABody(e.target.value)}
              />
              <button onClick={createAnnouncement} className="osrs-btn text-[7px]">Post</button>
            </div>
          </div>

          {announcements.length > 0 && (
            <div className="osrs-panel-dark rounded-xl">
              <h2 className="text-[9px] text-[#c0c0c0] font-bold mb-2">Active Announcements</h2>
              <div className="space-y-2">
                {announcements.map(a => (
                  <div key={a.id} className="bg-[#282828] rounded-lg px-3 py-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] text-[#d0d0d0] font-bold">{a.title}</div>
                      <div className="text-[7px] text-[#909090] mt-0.5 leading-relaxed">{a.body}</div>
                      <div className="text-[6px] text-[#606060] mt-1">{new Date(a.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(a.id)}
                      className="text-[6px] px-1.5 py-0.5 rounded border border-[#8a4a4a] text-[#e09090] shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
