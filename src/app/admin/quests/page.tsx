'use client'
import { useEffect, useState } from 'react'

interface Quest {
  id: string
  icon: string
  title: string
  description: string
  xp: number
  skill: string
  href: string
  active: boolean
  order: number
}

const DEFAULT_QUESTS = [
  { icon: '📝', title: 'Share a Project', description: 'Post an update in the Projects skill — what are you building?', xp: 10, skill: 'Projects', href: '/skills/projects' },
  { icon: '🌱', title: 'Garden Update', description: 'Post a garden update, photo description, or tip in Farming.', xp: 10, skill: 'Farming', href: '/skills/gardening' },
  { icon: '💬', title: 'Help Someone Out', description: 'Reply to an open post and help another community member.', xp: 5, skill: 'Community', href: '/skills/community' },
  { icon: '🌅', title: 'Daily Check-In', description: 'Log in every day to keep your XP streak going.', xp: 3, skill: 'All skills', href: '/' },
  { icon: '🍷', title: 'Wine Expert', description: 'Score 7 or higher on the Wine Trivia quiz.', xp: 20, skill: 'Fun', href: '/skills/fun/wine-trivia' },
  { icon: '🃏', title: 'Memory Master', description: 'Complete the Matching Card Game.', xp: 20, skill: 'Fun', href: '/skills/fun/matching' },
  { icon: '🍳', title: 'Home Cook', description: 'Share a recipe you love in the Cooking section.', xp: 10, skill: 'Cooking', href: '/skills/food' },
  { icon: '💼', title: 'Business Mind', description: 'Share a sales tip, business insight, or work win.', xp: 10, skill: 'Business', href: '/skills/business' },
  { icon: '🎣', title: "Gone Fishin'", description: 'Post a fishing trip report, tip, or photo description.', xp: 10, skill: 'Fishing', href: '/skills/fishing' },
  { icon: '🗺️', title: 'Road Warrior', description: 'Share a travel story, destination review, or trip highlight.', xp: 10, skill: 'Travel', href: '/skills/travel' },
  { icon: '❤️', title: 'Health Check', description: 'Share a wellness tip, workout update, or health goal.', xp: 10, skill: 'Health', href: '/skills/health' },
]

const EMPTY_FORM = {
  icon: '⚔️',
  title: '',
  description: '',
  xp: '10',
  skill: '',
  href: '/',
  active: true,
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  useEffect(() => { loadQuests() }, [])

  async function loadQuests() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/quests')
      const data = await res.json()
      setQuests(data.quests ?? [])
    } catch {
      showMsg('Failed to load quests.', 'err')
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'ok' | 'err' = 'ok') {
    setMsg(text)
    setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function seedDefaults() {
    setSeeding(true)
    try {
      for (const q of DEFAULT_QUESTS) {
        await fetch('/api/admin/quests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...q, active: true }),
        })
      }
      showMsg('Default quests seeded!')
      loadQuests()
    } catch {
      showMsg('Seeding failed.', 'err')
    }
    setSeeding(false)
  }

  async function createQuest() {
    if (!createForm.title.trim()) return showMsg('Title is required.', 'err')
    try {
      await fetch('/api/admin/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: createForm.icon,
          title: createForm.title,
          description: createForm.description,
          xp: Number(createForm.xp),
          skill: createForm.skill,
          href: createForm.href,
          active: createForm.active,
        }),
      })
      setCreateForm(EMPTY_FORM)
      setShowCreate(false)
      showMsg('Quest created!')
      loadQuests()
    } catch {
      showMsg('Failed to create.', 'err')
    }
  }

  async function toggleActive(q: Quest) {
    try {
      await fetch('/api/admin/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: q.id, active: !q.active }),
      })
      loadQuests()
    } catch {
      showMsg('Failed to update.', 'err')
    }
  }

  function startEdit(q: Quest) {
    setEditId(q.id)
    setEditForm({
      icon: q.icon,
      title: q.title,
      description: q.description,
      xp: String(q.xp),
      skill: q.skill,
      href: q.href,
      active: q.active,
    })
  }

  async function saveEdit() {
    if (!editId) return
    if (!editForm.title.trim()) return showMsg('Title is required.', 'err')
    try {
      await fetch('/api/admin/quests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          icon: editForm.icon,
          title: editForm.title,
          description: editForm.description,
          xp: Number(editForm.xp),
          skill: editForm.skill,
          href: editForm.href,
          active: editForm.active,
        }),
      })
      setEditId(null)
      showMsg('Quest updated!')
      loadQuests()
    } catch {
      showMsg('Failed to save.', 'err')
    }
  }

  async function deleteQuest(id: string) {
    if (!confirm('Delete this quest? This cannot be undone.')) return
    try {
      await fetch('/api/admin/quests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      showMsg('Quest deleted.')
      loadQuests()
    } catch {
      showMsg('Failed to delete.', 'err')
    }
  }

  function QuestFormFields({
    form,
    onChange,
  }: {
    form: typeof EMPTY_FORM
    onChange: (key: keyof typeof EMPTY_FORM, val: string | boolean) => void
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
              placeholder="Quest title"
              value={form.title}
              onChange={e => onChange('title', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
          <textarea
            className="osrs-input text-[7px] w-full h-14 resize-none"
            placeholder="Quest description"
            value={form.description}
            onChange={e => onChange('description', e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div>
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>XP Reward</label>
            <input
              type="number"
              min="0"
              className="osrs-input text-[7px] w-16"
              value={form.xp}
              onChange={e => onChange('xp', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Skill</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="e.g. Projects"
              value={form.skill}
              onChange={e => onChange('skill', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[80px]">
            <label className="text-[6px] block mb-1" style={{ color: 'var(--text-3)' }}>Link</label>
            <input
              className="osrs-input text-[7px] w-full"
              placeholder="/"
              value={form.href}
              onChange={e => onChange('href', e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[7px] cursor-pointer" style={{ color: 'var(--text-2)' }}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={e => onChange('active', e.target.checked)}
          />
          Active
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="osrs-panel-dark rounded-xl flex items-center justify-between">
        <div>
          <h1 className="text-[11px] font-bold" style={{ color: 'var(--text-1)' }}>⚔️ Quests</h1>
          <p className="text-[6px] mt-0.5" style={{ color: 'var(--text-3)' }}>Manage quest board entries.</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="osrs-btn text-[7px]">
          {showCreate ? '✕ Cancel' : '+ New Quest'}
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

      {showCreate && (
        <div className="osrs-panel-dark rounded-xl space-y-3">
          <h2 className="text-[9px] font-bold" style={{ color: 'var(--text-1)' }}>New Quest</h2>
          <QuestFormFields
            form={createForm}
            onChange={(k, v) => setCreateForm(f => ({ ...f, [k]: v }))}
          />
          <div className="flex gap-2">
            <button onClick={createQuest} className="osrs-btn text-[7px]">+ Create Quest</button>
            <button onClick={() => setShowCreate(false)} className="text-[6px] px-2 py-1 rounded border border-[#8a4a4a] text-[#e09090] hover:bg-[#3a1a1a]">Cancel</button>
          </div>
        </div>
      )}

      <div className="osrs-panel-dark rounded-xl">
        <h2 className="text-[9px] font-bold mb-3" style={{ color: 'var(--text-1)' }}>
          Quests ({quests.length})
        </h2>
        {loading ? (
          <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>Loading...</p>
        ) : quests.length === 0 ? (
          <div className="space-y-3">
            <p className="text-[7px]" style={{ color: 'var(--text-2)' }}>No quests yet.</p>
            <button
              onClick={seedDefaults}
              disabled={seeding}
              className="osrs-btn text-[7px]"
            >
              {seeding ? 'Seeding...' : '🌱 Seed Default Quests'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {quests.map(q => (
              <div key={q.id} className="rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                {editId === q.id ? (
                  <div className="p-3 space-y-3">
                    <QuestFormFields
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
                    <span className="text-base shrink-0">{q.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[7px] font-bold truncate" style={{ color: 'var(--text-1)' }}>
                        {q.title}
                      </div>
                      <div className="text-[6px]" style={{ color: 'var(--text-3)' }}>
                        {q.skill} · {q.xp} XP ·{' '}
                        <span style={{ color: q.active ? '#90c890' : '#e09090' }}>
                          {q.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleActive(q)}
                        className="text-[6px] px-1.5 py-0.5 rounded border"
                        style={{
                          borderColor: q.active ? '#8a4a4a' : '#4a8a4a',
                          color: q.active ? '#e09090' : '#90c890',
                        }}
                      >
                        {q.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => startEdit(q)}
                        className="text-[6px] px-1.5 py-0.5 rounded border"
                        style={{ borderColor: 'var(--border-lit)', color: 'var(--gold)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteQuest(q.id)}
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
