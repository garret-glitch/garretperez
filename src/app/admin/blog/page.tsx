'use client'
import { useEffect, useState } from 'react'

interface BlogPost {
  id: string
  title: string
  slug: string
  body: string
  excerpt: string
  published: boolean
  publishedAt: string | null
  createdAt: string
}

type EditMode = null | 'create' | string

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  published: false,
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  const [editMode, setEditMode] = useState<EditMode>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/blog')
      const data = await res.json()
      setPosts(data.posts ?? [])
    } catch {
      showMsg('Failed to load posts.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setSlugManuallyEdited(false)
    setEditMode('create')
  }

  function openEdit(p: BlogPost) {
    setForm({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      body: p.body ?? '',
      published: p.published,
    })
    setSlugManuallyEdited(true)
    setEditMode(p.id)
  }

  function handleTitleChange(val: string) {
    setForm(f => {
      const updated = { ...f, title: val }
      if (!slugManuallyEdited) {
        updated.slug = slugify(val)
      }
      return updated
    })
  }

  function handleSlugChange(val: string) {
    setSlugManuallyEdited(true)
    setForm(f => ({ ...f, slug: val }))
  }

  async function savePost() {
    if (!form.title.trim()) return showMsg('Title is required.', 'err')
    try {
      if (editMode === 'create') {
        await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            slug: form.slug || slugify(form.title),
            body: form.body,
            excerpt: form.excerpt,
            published: form.published,
          }),
        })
        showMsg('Post created!')
      } else if (editMode) {
        await fetch('/api/admin/blog', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editMode,
            title: form.title,
            slug: form.slug,
            body: form.body,
            excerpt: form.excerpt,
            published: form.published,
          }),
        })
        showMsg('Post updated!')
      }
      setEditMode(null)
      loadPosts()
    } catch {
      showMsg('Failed to save.', 'err')
    }
  }

  async function togglePublish(p: BlogPost) {
    try {
      await fetch('/api/admin/blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, published: !p.published }),
      })
      loadPosts()
    } catch {
      showMsg('Failed to update.', 'err')
    }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this blog post? This cannot be undone.')) return
    try {
      await fetch('/api/admin/blog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      showMsg('Post deleted.')
      loadPosts()
    } catch {
      showMsg('Failed to delete.', 'err')
    }
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>📝 Blog</h1>
          <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>CMS blog posts — stored in the database.</p>
        </div>
        {editMode === null && (
          <button onClick={openCreate} className="osrs-btn text-[7px]">+ New Post</button>
        )}
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

      {/* Create / Edit form */}
      {editMode !== null && (
        <div className="osrs-panel-dark rounded-xl space-y-3">
          <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>
            {editMode === 'create' ? 'New Post' : 'Edit Post'}
          </h2>
          <div className="space-y-2">
            <div>
              <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Title *</label>
              <input
                className="osrs-input text-[7px] w-full"
                placeholder="Post title"
                value={form.title}
                onChange={e => handleTitleChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Slug</label>
              <input
                className="osrs-input text-[7px] w-full"
                placeholder="post-slug"
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Excerpt (1-2 sentences)</label>
              <textarea
                className="osrs-input text-[7px] w-full h-14 resize-none"
                placeholder="Short summary shown in the post list."
                value={form.excerpt}
                onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Body (Markdown / plain text)</label>
              <textarea
                className="osrs-input text-[7px] w-full h-48 resize-y"
                placeholder="Post content..."
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-[7px] cursor-pointer" style={{ color: 'var(--text-2)' }}>
              <input
                type="checkbox"
                checked={form.published}
                onChange={e => setForm(f => ({ ...f, published: e.target.checked }))}
              />
              Published (visible on site)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={savePost} className="osrs-btn text-[7px]">Save Post</button>
            <button onClick={() => setEditMode(null)} className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Post list */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>
          Posts ({posts.length})
        </h2>
        {loading ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No posts yet. Create one above.</p>
        ) : (
          <div className="space-y-1.5">
            {posts.map(p => (
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
                    /{p.slug} ·{' '}
                    <span style={{ color: p.published ? '#90c890' : '#e09090' }}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                    {' '}· {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => togglePublish(p)}
                    className="admin-action-btn rounded border"
                    style={{
                      borderColor: p.published ? '#8a4a4a' : '#4a8a4a',
                      color: p.published ? '#e09090' : '#90c890',
                    }}
                  >
                    {p.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    className="admin-action-btn rounded border"
                    style={{ borderColor: 'var(--border-lit)', color: 'var(--gold)' }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePost(p.id)}
                    className="admin-action-btn rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
