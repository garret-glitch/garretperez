'use client'
import { useState, useEffect } from 'react'
import { XP_LABELS, XP_DEFAULTS, type XpEventType } from '@/lib/xp'

type AdminTab = 'dashboard' | 'users' | 'posts' | 'settings'

// ── Shared mini-style helpers ────────────────────────────────────────────────
const LBL: React.CSSProperties = {
  fontSize: 5.5, color: 'var(--text-3)', textTransform: 'uppercase',
  letterSpacing: '0.08em', marginBottom: 3, display: 'block',
}
const SECTION: React.CSSProperties = {
  borderBottom: '1px solid var(--border-dim)', paddingBottom: 10, marginBottom: 10,
}
function inp(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '3px 6px', fontSize: 7, color: 'var(--text-1)', ...extra,
  }
}
function msg(ok: boolean): React.CSSProperties {
  return {
    background: ok ? '#1a3a1a' : '#3a1a1a',
    border: `1px solid ${ok ? '#4a8a4a' : '#8a4a4a'}`,
    color: ok ? '#90c890' : '#e09090',
    fontSize: 6.5, padding: '3px 6px', borderRadius: 4, marginBottom: 6,
  }
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ fontSize: 7, color: 'var(--text-2)' }}>Loading...</p>
  if (!data) return null

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 10 }}>
        {[
          { label: 'Members', value: data.totalUsers },
          { label: 'Posts', value: data.totalPosts },
          { label: 'Recipes', value: data.totalRecipes },
          { label: 'Total XP', value: (data.totalXp ?? 0).toLocaleString() },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '6px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
            <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={SECTION}>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5 }}>Top XP</div>
        {(data.topXpUsers ?? []).slice(0, 5).map((u: any, i: number) => (
          <div key={u.username} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6.5, padding: '2px 0', borderBottom: '1px solid var(--border-dim)' }}>
            <span style={{ color: 'var(--text-2)' }}>#{i + 1} {u.username}</span>
            <span style={{ color: 'var(--gold)' }}>{(u.totalXp ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 6.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5 }}>Recent Members</div>
        {(data.recentUsers ?? []).slice(0, 4).map((u: any) => (
          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6.5, padding: '2px 0', borderBottom: '1px solid var(--border-dim)' }}>
            <span style={{ color: 'var(--text-2)' }}>{u.username}</span>
            <span style={{ color: 'var(--text-3)' }}>{new Date(u.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Users ────────────────────────────────────────────────────────────────────
const SKILLS_LIST = ['HEALTH', 'PROJECTS', 'FISHING', 'BUSINESS', 'FOOD', 'COMMUNITY', 'GARDENING', 'FUN', 'TRAVEL']

interface AdminUser {
  id: string
  username: string
  createdAt: string
  role: string
  banned: boolean
  totalXp: number
  postCount: number
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeOk, setNoticeOk] = useState(true)
  const [pwUserId, setPwUserId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')
  const [xpUserId, setXpUserId] = useState('')
  const [xpSkill, setXpSkill] = useState('HEALTH')
  const [xpAmt, setXpAmt] = useState('50')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/users')
      const d = await r.json()
      setUsers(d.users ?? [])
    } catch { flash('Failed to load.', false) }
    setLoading(false)
  }

  function flash(text: string, ok = true) {
    setNotice(text); setNoticeOk(ok)
    setTimeout(() => setNotice(''), 4000)
  }

  async function banUser(id: string, ban: boolean) {
    await fetch('/api/admin/ban-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, ban }),
    })
    flash(`User ${ban ? 'banned' : 'unbanned'}.`)
    load()
  }

  async function changeRole(id: string, role: string) {
    await fetch('/api/admin/user', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, role }),
    })
    flash('Role updated.')
    load()
  }

  async function savePw(id: string) {
    if (!newPw.trim()) return flash('Enter a password.', false)
    await fetch('/api/admin/user', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id, newPassword: newPw }),
    })
    setPwUserId(null); setNewPw('')
    flash('Password updated.')
  }

  async function deleteUser(id: string, username: string) {
    if (!confirm(`Delete "${username}"? Cannot be undone.`)) return
    await fetch('/api/admin/user', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    flash('User deleted.')
    load()
  }

  async function adjustXp() {
    if (!xpUserId) return flash('Select a user.', false)
    await fetch('/api/admin/adjust-xp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: xpUserId, skill: xpSkill, amount: Number(xpAmt) }),
    })
    flash('XP adjusted.')
    load()
  }

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-1)', marginBottom: 7 }}>
        👥 Users ({users.length})
      </div>

      {notice && <div style={msg(noticeOk)}>{notice}</div>}

      <input
        style={inp({ width: '100%', marginBottom: 7 })}
        placeholder="Search username..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <p style={{ fontSize: 7, color: 'var(--text-2)' }}>Loading...</p>
      ) : (
        <div style={{ maxHeight: 270, overflowY: 'auto', marginBottom: 10 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '6px 8px', marginBottom: 4,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--text-1)' }}>{u.username}</span>
                  {u.role === 'ADMIN' && <span style={{ fontSize: 5, color: 'var(--gold)', marginLeft: 4 }}>ADMIN</span>}
                  {u.banned && <span style={{ fontSize: 5, color: '#e09090', marginLeft: 4 }}>BANNED</span>}
                </div>
                <span style={{ fontSize: 5.5, color: 'var(--text-3)' }}>{u.totalXp.toLocaleString()} XP</span>
              </div>

              {pwUserId === u.id && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input type="password" placeholder="New password" value={newPw}
                    onChange={e => setNewPw(e.target.value)} style={inp({ flex: 1 })} />
                  <button onClick={() => savePw(u.id)} style={{ fontSize: 6, padding: '2px 6px', background: 'none', border: '1px solid var(--border-lit)', color: 'var(--gold)', borderRadius: 3, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setPwUserId(null)} style={{ fontSize: 6, padding: '2px 6px', background: 'none', border: '1px solid #8a4a4a', color: '#e09090', borderRadius: 3, cursor: 'pointer' }}>✕</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <button onClick={() => banUser(u.id, !u.banned)} style={{ fontSize: 5.5, padding: '2px 5px', borderRadius: 3, border: `1px solid ${u.banned ? '#4a8a4a' : '#8a4a4a'}`, color: u.banned ? '#90c890' : '#e09090', background: 'none', cursor: 'pointer' }}>
                  {u.banned ? 'Unban' : 'Ban'}
                </button>
                <button
                  onClick={() => { const r = u.role === 'ADMIN' ? 'USER' : 'ADMIN'; if (confirm(`Set ${u.username} to ${r}?`)) changeRole(u.id, r) }}
                  style={{ fontSize: 5.5, padding: '2px 5px', borderRadius: 3, border: '1px solid var(--border-lit)', color: 'var(--gold)', background: 'none', cursor: 'pointer' }}
                >
                  {u.role === 'ADMIN' ? 'Demote' : 'Promote'}
                </button>
                <button onClick={() => { setPwUserId(u.id); setNewPw('') }} style={{ fontSize: 5.5, padding: '2px 5px', borderRadius: 3, border: '1px solid var(--border)', color: 'var(--text-2)', background: 'none', cursor: 'pointer' }}>
                  PW
                </button>
                {u.role !== 'ADMIN' && (
                  <button onClick={() => deleteUser(u.id, u.username)} style={{ fontSize: 5.5, padding: '2px 5px', borderRadius: 3, border: '1px solid #8a4a4a', color: '#e09090', background: 'none', cursor: 'pointer' }}>
                    Del
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adjust XP */}
      <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 8 }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5 }}>Adjust XP</div>
        <select value={xpUserId} onChange={e => setXpUserId(e.target.value)} style={inp({ width: '100%', marginBottom: 4 })}>
          <option value="">Select user...</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <select value={xpSkill} onChange={e => setXpSkill(e.target.value)} style={inp({ flex: 1 })}>
            {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" value={xpAmt} onChange={e => setXpAmt(e.target.value)} style={inp({ width: 48 })} />
        </div>
        <button onClick={adjustXp} style={{ fontSize: 6.5, padding: '4px 0', width: '100%', background: 'rgba(200,155,60,0.12)', border: '1px solid var(--border-lit)', color: 'var(--gold)', borderRadius: 4, cursor: 'pointer' }}>
          Adjust XP
        </button>
        <p style={{ fontSize: 5.5, color: 'var(--text-3)', marginTop: 4 }}>Negative values remove XP.</p>
      </div>
    </div>
  )
}

// ── Posts ─────────────────────────────────────────────────────────────────────
const SKILL_FILTERS = ['ALL', 'HEALTH', 'PROJECTS', 'FISHING', 'BUSINESS', 'FOOD', 'COMMUNITY', 'GARDENING', 'FUN', 'TRAVEL']

interface CPost { id: string; title: string; skill: string; createdAt: string; user: { username: string } }
interface Anno { id: string; title: string; body: string; createdAt: string }

function PostsTab() {
  const [posts, setPosts] = useState<CPost[]>([])
  const [annos, setAnnos] = useState<Anno[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<'posts' | 'announce'>('posts')
  const [skillFilter, setSkillFilter] = useState('ALL')
  const [notice, setNotice] = useState('')
  const [noticeOk, setNoticeOk] = useState(true)
  const [aTitle, setATitle] = useState('')
  const [aBody, setABody] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [pr, ar] = await Promise.all([fetch('/api/admin/posts'), fetch('/api/admin/announcements')])
      const pd = await pr.json(); const ad = await ar.json()
      setPosts(pd.posts ?? []); setAnnos(ad.announcements ?? [])
    } catch { flash('Failed to load.', false) }
    setLoading(false)
  }

  function flash(text: string, ok = true) { setNotice(text); setNoticeOk(ok); setTimeout(() => setNotice(''), 4000) }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await fetch('/api/admin/delete-post', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: id }),
    })
    flash('Post deleted.')
    loadAll()
  }

  async function createAnno() {
    if (!aTitle.trim() || !aBody.trim()) return flash('Fill title and body.', false)
    await fetch('/api/admin/announcement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: aTitle, body: aBody }),
    })
    setATitle(''); setABody('')
    flash('Announcement posted!')
    loadAll()
  }

  async function deleteAnno(id: string) {
    if (!confirm('Delete announcement?')) return
    await fetch('/api/admin/announcement', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    flash('Deleted.')
    loadAll()
  }

  const filtered = skillFilter === 'ALL' ? posts : posts.filter(p => p.skill === skillFilter)

  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-1)', marginBottom: 7 }}>
        💬 Community
      </div>

      {notice && <div style={msg(noticeOk)}>{notice}</div>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {(['posts', 'announce'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            flex: 1, padding: '4px 4px', fontSize: 6.5, borderRadius: 4, cursor: 'pointer',
            background: subTab === t ? 'rgba(200,155,60,0.15)' : 'var(--bg-elevated)',
            border: `1px solid ${subTab === t ? 'var(--border-lit)' : 'var(--border)'}`,
            color: subTab === t ? 'var(--gold)' : 'var(--text-2)',
          }}>
            {t === 'posts' ? '📋 Posts' : '📣 Announce'}
          </button>
        ))}
      </div>

      {loading ? <p style={{ fontSize: 7, color: 'var(--text-2)' }}>Loading...</p> : (
        <>
          {subTab === 'posts' && (
            <div>
              <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)} style={inp({ width: '100%', marginBottom: 6 })}>
                {SKILL_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p style={{ fontSize: 6.5, color: 'var(--text-3)' }}>No posts.</p>
                ) : filtered.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '5px 7px', marginBottom: 3 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 6.5, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                      <div style={{ fontSize: 5.5, color: 'var(--text-3)' }}>{p.user.username} · {p.skill}</div>
                    </div>
                    <button onClick={() => deletePost(p.id)} style={{ fontSize: 5.5, padding: '2px 5px', border: '1px solid #8a4a4a', color: '#e09090', background: 'none', borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}>
                      Del
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTab === 'announce' && (
            <div>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px', marginBottom: 8 }}>
                <label style={LBL}>New Announcement</label>
                <input placeholder="Title" value={aTitle} onChange={e => setATitle(e.target.value)}
                  style={inp({ width: '100%', marginBottom: 4 })} />
                <textarea placeholder="Body..." value={aBody} onChange={e => setABody(e.target.value)}
                  style={{ ...inp({ width: '100%', marginBottom: 5 }), height: 56, resize: 'none' }} />
                <button onClick={createAnno} style={{ fontSize: 6.5, padding: '4px 0', width: '100%', background: 'rgba(200,155,60,0.12)', border: '1px solid var(--border-lit)', color: 'var(--gold)', borderRadius: 4, cursor: 'pointer' }}>
                  📣 Post
                </button>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {annos.length === 0 ? (
                  <p style={{ fontSize: 6.5, color: 'var(--text-3)' }}>No announcements.</p>
                ) : annos.map(a => (
                  <div key={a.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '6px 8px', marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 7, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{a.title}</span>
                      <button onClick={() => deleteAnno(a.id)} style={{ fontSize: 5.5, padding: '2px 5px', border: '1px solid #8a4a4a', color: '#e09090', background: 'none', borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}>Del</button>
                    </div>
                    <div style={{ fontSize: 6.5, color: 'var(--text-2)', marginTop: 3 }}>{a.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [noticeOk, setNoticeOk] = useState(true)
  const [xpConfig, setXpConfig] = useState<Record<string, number>>(() =>
    Object.fromEntries(Object.entries(XP_DEFAULTS).map(([k, v]) => [k, v]))
  )
  const [xpSaving, setXpSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { if (d.settings?.headshot) setPhotoPreview(d.settings.headshot); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/admin/xp-config')
      .then(r => r.json())
      .then(d => { if (d.config) setXpConfig(d.config) })
      .catch(() => {})
  }, [])

  function flash(text: string, ok = true) { setNotice(text); setNoticeOk(ok); setTimeout(() => setNotice(''), 4000) }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { flash('Photo must be under 4 MB.', false); return }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function savePhoto() {
    if (!photoPreview) return
    setPhotoSaving(true)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'headshot', value: photoPreview }),
    })
    setPhotoSaving(false)
    flash('Photo saved!')
  }

  async function removePhoto() {
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'headshot', value: '' }),
    })
    setPhotoPreview(null)
    flash('Photo removed.')
  }

  async function saveXpConfig() {
    setXpSaving(true)
    const r = await fetch('/api/admin/xp-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: xpConfig }),
    })
    setXpSaving(false)
    flash(r.ok ? 'XP values saved!' : 'Failed to save XP values.', r.ok)
  }

  async function resetXp() {
    if (!confirm('Reset ALL your skill XP to 0? Cannot be undone.')) return
    const r = await fetch('/api/admin/reset-xp', { method: 'POST' })
    const d = await r.json()
    flash(d.message ?? d.error ?? 'XP reset.')
  }

  if (loading) return <p style={{ fontSize: 7, color: 'var(--text-2)' }}>Loading...</p>

  return (
    <div>
      <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-1)', marginBottom: 7 }}>⚙️ Settings</div>

      {notice && <div style={msg(noticeOk)}>{notice}</div>}

      {/* Profile photo */}
      <div style={SECTION}>
        <label style={LBL}>Profile Photo</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            border: '2px solid var(--border-lit)', background: 'var(--bg-page)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'var(--gold)',
          }}>
            {photoPreview
              ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : 'GP'}
          </div>
          <label style={{ fontSize: 7, padding: '4px 8px', background: 'rgba(200,155,60,0.12)', border: '1px solid var(--border-lit)', color: 'var(--gold)', borderRadius: 4, cursor: 'pointer' }}>
            📁 Choose
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={savePhoto} disabled={!photoPreview || photoSaving} style={{
            flex: 1, fontSize: 6.5, padding: '4px 0', background: 'rgba(200,155,60,0.12)',
            border: '1px solid var(--border-lit)', color: 'var(--gold)', borderRadius: 4,
            cursor: 'pointer', opacity: !photoPreview ? 0.5 : 1,
          }}>
            {photoSaving ? 'Saving…' : '✓ Save Photo'}
          </button>
          {photoPreview && (
            <button onClick={removePhoto} style={{ fontSize: 6.5, padding: '4px 8px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: 4, cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* XP Config */}
      <div style={SECTION}>
        <label style={LBL}>XP Values</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 6px', alignItems: 'center', marginBottom: 7 }}>
          {(Object.keys(XP_LABELS) as XpEventType[]).map(key => (
            <>
              <span key={`lbl-${key}`} style={{ fontSize: 6.5, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {XP_LABELS[key]}
              </span>
              <input
                key={`inp-${key}`}
                type="number"
                min={0}
                value={xpConfig[key] ?? XP_DEFAULTS[key]}
                onChange={e => setXpConfig(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                style={{ ...inp(), width: 42, textAlign: 'center' }}
              />
            </>
          ))}
        </div>
        <button onClick={saveXpConfig} disabled={xpSaving} style={{
          width: '100%', fontSize: 6.5, padding: '4px 0',
          background: 'rgba(200,155,60,0.12)', border: '1px solid var(--border-lit)',
          color: 'var(--gold)', borderRadius: 4, cursor: 'pointer',
        }}>
          {xpSaving ? 'Saving…' : '✓ Save XP Values'}
        </button>
      </div>

      {/* Danger zone */}
      <div style={{ border: '1px solid #8a4a4a', borderRadius: 6, padding: '8px' }}>
        <div style={{ fontSize: 7, fontWeight: 700, color: '#e09090', marginBottom: 4 }}>⚠️ Danger Zone</div>
        <p style={{ fontSize: 6.5, color: 'var(--text-2)', marginBottom: 6 }}>
          Reset all your skill XP to 0 (level 1). Affects only your account. Cannot be undone.
        </p>
        <button onClick={resetXp} style={{ fontSize: 6.5, padding: '4px 0', width: '100%', border: '1px solid #8a4a4a', color: '#e09090', background: 'none', borderRadius: 4, cursor: 'pointer' }}>
          ⚠️ Reset All XP
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
const TABS: { key: AdminTab; icon: string; label: string }[] = [
  { key: 'dashboard', icon: '📊', label: 'Dash' },
  { key: 'users',     icon: '👥', label: 'Users' },
  { key: 'posts',     icon: '💬', label: 'Posts' },
  { key: 'settings',  icon: '⚙️', label: 'Settings' },
]

export default function AdminSidePanel() {
  const [tab, setTab] = useState<AdminTab>('dashboard')

  return (
    // Outer: in document flow, stretches to match canvas height so the background covers the full page
    <div style={{
      width: 280, flexShrink: 0,
      background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
      boxShadow: '4px 0 16px rgba(0,0,0,0.3)',
    }}>
      {/* Inner: sticky so the UI stays visible while the page scrolls */}
      <div style={{
        position: 'sticky', top: 52,
        height: 'calc(100vh - 90px)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '7px 2px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid var(--gold)' : '2px solid transparent',
              color: tab === t.key ? 'var(--gold)' : 'var(--text-3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              <span style={{ fontSize: 5.5, fontWeight: 600, letterSpacing: '0.05em' }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'users'     && <UsersTab />}
          {tab === 'posts'     && <PostsTab />}
          {tab === 'settings'  && <SettingsTab />}
        </div>
      </div>
    </div>
  )
}
