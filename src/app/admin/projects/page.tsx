'use client'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  icon: string
  title: string
  desc: string
  progress: number
  href: string
  updated: string
  order: number
}

const EMPTY_FORM = {
  icon: '⚒️',
  title: '',
  desc: '',
  progress: '0',
  href: '/skills/projects',
  updated: '',
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/projects')
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch {
      showMsg('Failed to load projects.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function createProject() {
    if (!createForm.title.trim()) return showMsg('Title is required.', 'err')
    try {
      await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: createForm.icon,
          title: createForm.title,
          desc: createForm.desc,
          progress: Number(createForm.progress),
          href: createForm.href,
          updated: createForm.updated,
        }),
      })
      setCreateForm(EMPTY_FORM)
      setShowCreate(false)
      showMsg('Project created!')
      loadProjects()
    } catch {
      showMsg('Failed to create.', 'err')
    }
  }

  function startEdit(p: Project) {
    setEditId(p.id)
    setEditForm({
      icon: p.icon,
      title: p.title,
      desc: p.desc,
      progress: String(p.progress),
      href: p.href,
      updated: p.updated,
    })
  }

  async function saveEdit() {
    if (!editId) return
    if (!editForm.title.trim()) return showMsg('Title is required.', 'err')
    try {
      await fetch('/api/admin/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          icon: editForm.icon,
          title: editForm.title,
          desc: editForm.desc,
          progress: Number(editForm.progress),
          href: editForm.href,
          updated: editForm.updated,
        }),
      })
      setEditId(null)
      showMsg('Project updated!')
      loadProjects()
    } catch {
      showMsg('Failed to save.', 'err')
    }
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await fetch('/api/admin/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      showMsg('Project deleted.')
      loadProjects()
    } catch {
      showMsg('Failed to delete.', 'err')
    }
  }

  function ProjectFormFields({
    form,
    onChange,
  }: {
    form: typeof EMPTY_FORM
    onChange: (key: keyof typeof EMPTY_FORM, val: string) => void
  }) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Icon</label>
            <input
              className="osrs-input text-[7px] w-14 text-center"
              value={form.icon}
              onChange={e => onChange('icon', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Title *</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="Project title"
              value={form.title}
              onChange={e => onChange('title', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
          <textarea
            className="osrs-input text-[7px] w-full h-14 resize-none"
            placeholder="Short description"
            value={form.desc}
            onChange={e => onChange('desc', e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Progress %</label>
            <input
              type="number"
              min="0"
              max="100"
              className="osrs-input text-[7px] w-16"
              value={form.progress}
              onChange={e => onChange('progress', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Link</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="/skills/projects"
              value={form.href}
              onChange={e => onChange('href', e.target.value)}
            />
          </div>
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Updated</label>
            <input
              className="osrs-input text-[7px] w-28"
              placeholder="Jun 2026"
              value={form.updated}
              onChange={e => onChange('updated', e.target.value)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>⚒️ Projects</h1>
          <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>Manage homepage projects.</p>
        </div>
        <button
          onClick={() => setShowCreate(v => !v)}
          className="osrs-btn text-[7px]"
        >
          {showCreate ? '✕ Cancel' : '+ New Project'}
        </button>
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

      {/* Create form */}
      {showCreate && (
        <div className="osrs-panel-dark rounded-xl space-y-3">
          <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>New Project</h2>
          <ProjectFormFields
            form={createForm}
            onChange={(k, v) => setCreateForm(f => ({ ...f, [k]: v }))}
          />
          <div className="flex gap-2">
            <button onClick={createProject} className="osrs-btn text-[7px]">+ Create Project</button>
            <button onClick={() => setShowCreate(false)} className="text-[6px] px-2 py-1 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]">Cancel</button>
          </div>
        </div>
      )}

      {/* Projects list */}
      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>
          Projects ({projects.length})
        </h2>
        {loading ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No projects yet.</p>
        ) : (
          <div className="space-y-2">
            {projects.map(p => (
              <div key={p.id} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                {editId === p.id ? (
                  <div className="p-3 space-y-3">
                    <ProjectFormFields
                      form={editForm}
                      onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))}
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="osrs-btn text-[7px]">Save</button>
                      <button onClick={() => setEditId(null)} className="text-[6px] px-2 py-1 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-base shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-bold truncate" style={{ color: 'var(--text-1)' }}>
                        {p.title}
                      </div>
                      <div className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                        {p.progress}% · {p.updated}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-[6px] px-1.5 py-0.5 rounded border"
                        style={{ borderColor: 'var(--border-lit)', color: 'var(--gold)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProject(p.id)}
                        className="text-[6px] px-1.5 py-0.5 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
