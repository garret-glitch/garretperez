'use client'
import { useEffect, useState } from 'react'

interface CommunityPost {
  id: string
  title: string
  skill: string
  createdAt: string
  user: { username: string }
}

interface Announcement {
  id: string
  title: string
  body: string
  createdAt: string
}

const SKILLS_LIST = ['ALL', 'HEALTH', 'PROJECTS', 'FISHING', 'BUSINESS', 'FOOD', 'COMMUNITY', 'GARDENING', 'FUN', 'TRAVEL']

type Tab = 'posts' | 'announce'

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('posts')
  const [skillFilter, setSkillFilter] = useState('ALL')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // Announcement form
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [postsRes, annoRes] = await Promise.all([
        fetch('/api/admin/posts'),
        fetch('/api/admin/announcements'),
      ])
      const postsData = await postsRes.json()
      const annoData = await annoRes.json()
      setPosts(postsData.posts ?? [])
      setAnnouncements(annoData.announcements ?? [])
    } catch {
      showMsg('Failed to load data.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    try {
      await fetch('/api/admin/delete-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      showMsg('Post deleted.')
      loadAll()
    } catch {
      showMsg('Failed to delete.', 'err')
    }
  }

  async function createAnnouncement() {
    if (!aTitle.trim() || !aBody.trim()) return showMsg('Fill in title and body.', 'err')
    try {
      await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: aTitle, body: aBody }),
      })
      setATitle(''); setABody('')
      showMsg('Announcement posted!')
      loadAll()
    } catch {
      showMsg('Failed to post.', 'err')
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Delete this announcement?')) return
    try {
      await fetch('/api/admin/announcement', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      showMsg('Announcement deleted.')
      loadAll()
    } catch {
      showMsg('Failed to delete.', 'err')
    }
  }

  const filteredPosts = skillFilter === 'ALL'
    ? posts
    : posts.filter(p => p.skill === skillFilter)

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl">
        <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>💬 Community</h1>
        <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>
          {posts.length} posts · {announcements.length} announcements
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

      {/* Tabs */}
      <div className="flex gap-1">
        {(['posts', 'announce'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="osrs-btn text-[7px]"
            style={{ opacity: tab === t ? 1 : 0.6 }}
          >
            {t === 'posts' ? '📋 Posts' : '📣 Announcements'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
      ) : (
        <>
          {/* Posts tab */}
          {tab === 'posts' && (
            <div className="osrs-panel-dark rounded-xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[9px] font-bold flex-1" style={{ color: 'var(--text-1)' }}>
                  Posts ({filteredPosts.length})
                </h2>
                <select
                  className="osrs-input text-[7px] w-full sm:w-28"
                  value={skillFilter}
                  onChange={e => setSkillFilter(e.target.value)}
                >
                  {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {filteredPosts.length === 0 ? (
                <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No posts found.</p>
              ) : (
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
                  {filteredPosts.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[7px] font-bold truncate" style={{ color: 'var(--text-1)' }}>
                          {p.title}
                        </div>
                        <div className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                          by {p.user.username} · {p.skill} · {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => deletePost(p.id)}
                        className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a] shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcements tab */}
          {tab === 'announce' && (
            <div className="space-y-3">
              {/* Create form */}
              <div className="osrs-panel-dark rounded-xl space-y-3">
                <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>Post Announcement</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Title</label>
                    <input
                      className="osrs-input text-[7px] w-full"
                      placeholder="Announcement title"
                      value={aTitle}
                      onChange={e => setATitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Body</label>
                    <textarea
                      className="osrs-input text-[7px] w-full h-20 resize-none"
                      placeholder="Announcement body text..."
                      value={aBody}
                      onChange={e => setABody(e.target.value)}
                    />
                  </div>
                  <button onClick={createAnnouncement} className="osrs-btn text-[7px]">📣 Post</button>
                </div>
              </div>

              {/* List */}
              <div className="osrs-panel-dark rounded-xl">
                <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>
                  Active Announcements ({announcements.length})
                </h2>
                {announcements.length === 0 ? (
                  <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No announcements yet.</p>
                ) : (
                  <div className="space-y-2">
                    {announcements.map(a => (
                      <div
                        key={a.id}
                        className="rounded-lg px-3 py-2 flex items-start gap-2"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[8px] font-bold" style={{ color: 'var(--text-1)' }}>
                            {a.title}
                          </div>
                          <div className="text-[7px] mt-0.5 leading-relaxed body-text" style={{ color: 'var(--text-2)', fontSize: '11px' }}>
                            {a.body}
                          </div>
                          <div className="text-[6px] mt-1" style={{ color: 'var(--text-3)' }}>
                            {new Date(a.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteAnnouncement(a.id)}
                          className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a] shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
