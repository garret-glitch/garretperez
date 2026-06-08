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
  const [tab, setTab] = useState<'users' | 'posts' | 'announce'>('users')

  // XP form
  const [xpUser, setXpUser] = useState('')
  const [xpSkill, setXpSkill] = useState('HEALTH')
  const [xpAmount, setXpAmount] = useState('50')

  // Announcement form
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')

  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    loadData()
  }, [session, status])

  async function loadData() {
    setLoading(true)
    try {
      const [u, p, a] = await Promise.all([
        fetch('/api/admin/users').then(r => r.json()),
        fetch('/api/admin/posts').then(r => r.json()),
        fetch('/api/admin/announcements').then(r => r.json()),
      ])
      setUsers(u.users ?? [])
      setPosts(p.posts ?? [])
      setAnnouncements(a.announcements ?? [])
    } catch {
      setMsg('Failed to load data')
    }
    setLoading(false)
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
        {(['users', 'posts', 'announce'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`osrs-btn text-[7px] capitalize ${tab === t ? 'brightness-125' : 'opacity-70'}`}
          >
            {t === 'announce' ? 'Announcements' : t}
          </button>
        ))}
      </div>

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
