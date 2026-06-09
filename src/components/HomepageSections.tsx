'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSkillByEnum } from '@/lib/skills'
import { BADGE_META } from '@/lib/badges'

export type SectionConfig = {
  id: string; heading: string; icon: string
  headingPx: number; bodyPx: number
  padding: 'compact' | 'normal' | 'spacious' | 'tall'; visible: boolean
}

export type ProjectRow = { id: string; icon: string; title: string; desc: string; progress: number; href: string; updated: string }
export type PostRow = {
  id: string; title: string; body: string; skill: string; createdAt: string
  user: { username: string }
  upvotes: { userId: string }[]
  replies: { id: string }[]
}

interface Props {
  isAdmin: boolean
  bio1: string; bio2: string; bio3: string
  dbProjects: ProjectRow[]
  recentPosts: PostRow[]
  hasSession: boolean
  userBadges: string[]
  initialLayout: SectionConfig[]
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'about',    heading: 'About Me',       icon: '📜', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'projects', heading: 'My Projects',    icon: '⚒️', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'feed',     heading: 'Community Feed', icon: '💬', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'achieve',  heading: 'Achievements',   icon: '🏆', headingPx: 7,  bodyPx: 10, padding: 'compact', visible: true },
  { id: 'xp',       heading: 'How to Earn XP', icon: '⚡', headingPx: 9,  bodyPx: 10, padding: 'normal',  visible: true },
]

const PADDING_STYLE: Record<string, React.CSSProperties> = {
  compact:  { padding: '10px 16px' },
  normal:   { padding: '20px 24px' },
  spacious: { padding: '32px 28px', minHeight: 230 },
  tall:     { padding: '20px 24px', minHeight: 420 },
}

const HEADING_SIZES = [7, 9, 11, 13, 16, 20, 24]
const BODY_SIZES    = [10, 12, 14, 16, 18]
const PADDING_OPTS  = [
  { value: 'compact',  label: 'Compact' },
  { value: 'normal',   label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
  { value: 'tall',     label: 'Tall' },
] as const

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export default function HomepageSections({
  isAdmin, bio1, bio2, bio3, dbProjects, recentPosts, hasSession, userBadges, initialLayout,
}: Props) {
  const [layout, setLayout]     = useState<SectionConfig[]>(initialLayout)
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  // Sync with server on mount in case DB has newer settings
  useEffect(() => {
    fetch('/api/admin/layout')
      .then(r => r.json())
      .then(d => { if (d.sections) setLayout(d.sections) })
      .catch(() => {})
  }, [])

  const sec = (id: string): SectionConfig =>
    layout.find(s => s.id === id) ?? DEFAULT_SECTIONS.find(s => s.id === id)!

  const update = (id: string, patch: Partial<SectionConfig>) =>
    setLayout(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const parchStyle = (id: string): React.CSSProperties =>
    PADDING_STYLE[sec(id).padding] ?? PADDING_STYLE.normal

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: layout }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selSection = selected ? sec(selected) : null

  /* ── Section wrapper for edit mode ─────────────────────── */
  function EditWrap({ id, children }: { id: string; children: React.ReactNode }) {
    if (!editMode) return <>{children}</>
    const isSelected = selected === id
    return (
      <div
        onClick={() => setSelected(isSelected ? null : id)}
        style={{
          position: 'relative', cursor: 'pointer',
          outline: isSelected ? '2px solid var(--gold)' : '1px dashed rgba(200,155,60,0.45)',
          outlineOffset: 3, borderRadius: 6,
          transition: 'outline 0.15s',
        }}
      >
        {/* Edit badge */}
        <div style={{
          position: 'absolute', top: -10, left: 8, zIndex: 10,
          background: isSelected ? 'var(--gold)' : 'var(--bg-elevated)',
          color: isSelected ? '#000' : 'var(--gold)',
          border: '1px solid var(--gold)',
          borderRadius: 4, padding: '2px 7px',
          fontSize: 5.5, fontWeight: 700, letterSpacing: '0.06em',
          pointerEvents: 'none',
        }}>
          ✏ {sec(id).heading}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>

      {/* ── Admin edit mode toolbar ────────────────────────── */}
      {isAdmin && (
        <div style={{
          position: 'fixed', bottom: 20, right: editMode && selSection ? 308 : 20,
          zIndex: 100, display: 'flex', gap: 8,
          transition: 'right 0.25s',
        }}>
          {editMode && (
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: '9px 16px', borderRadius: 8, cursor: saving ? 'wait' : 'pointer',
                background: saved ? 'rgba(0,200,100,0.2)' : 'rgba(200,155,60,0.15)',
                border: `1px solid ${saved ? 'rgba(0,200,100,0.5)' : 'rgba(200,155,60,0.5)'}`,
                color: saved ? '#5ddf8f' : 'var(--gold)',
                fontSize: 7, fontWeight: 700,
              }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Save to Site'}
            </button>
          )}
          <button
            onClick={() => { setEditMode(e => !e); setSelected(null) }}
            style={{
              padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
              background: editMode ? 'rgba(200,155,60,0.2)' : 'var(--bg-elevated)',
              border: `1px solid ${editMode ? 'var(--gold)' : 'var(--border)'}`,
              color: editMode ? 'var(--gold)' : 'var(--text-2)',
              fontSize: 7, fontWeight: 700,
            }}
          >
            {editMode ? '✕ Exit Edit Mode' : '✏️ Edit Layout'}
          </button>
        </div>
      )}

      {/* ── Properties panel (slides in from right) ─────────── */}
      {editMode && selSection && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 99,
          width: 300, overflowY: 'auto',
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          padding: '16px 14px',
        }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 8, color: 'var(--gold)', fontWeight: 700 }}>
              {selSection.icon} {selSection.heading}
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
            >✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Section title */}
            <div>
              <label style={{ display: 'block', fontSize: 5.5, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Section Title
              </label>
              <input
                type="text"
                value={selSection.heading}
                onChange={e => update(selSection.id, { heading: e.target.value })}
                className="osrs-input w-full"
                style={{ fontSize: 9, padding: '7px 10px' }}
              />
            </div>

            {/* Heading size */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label style={{ fontSize: 5.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Heading Size
                </label>
                <span style={{ fontSize: selSection.headingPx, color: 'var(--gold)', lineHeight: 1, maxWidth: 140, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {selSection.heading}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 6, color: 'var(--text-3)' }}>A</span>
                <input
                  type="range" min={0} max={HEADING_SIZES.length - 1}
                  value={Math.max(0, HEADING_SIZES.indexOf(selSection.headingPx))}
                  onChange={e => update(selSection.id, { headingPx: HEADING_SIZES[+e.target.value] })}
                  style={{ flex: 1, accentColor: 'var(--gold)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>A</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {HEADING_SIZES.map(s => (
                  <button key={s} onClick={() => update(selSection.id, { headingPx: s })}
                    style={{
                      fontSize: 5.5, padding: '3px 4px', borderRadius: 4, cursor: 'pointer',
                      background: selSection.headingPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                      color: selSection.headingPx === s ? '#000' : 'var(--text-2)',
                      border: '1px solid var(--border)', fontWeight: selSection.headingPx === s ? 700 : 400,
                    }}>{s}px</button>
                ))}
              </div>
            </div>

            {/* Body text size */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <label style={{ fontSize: 5.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Body Text Size
                </label>
                <span className="body-text" style={{ fontSize: selSection.bodyPx, color: 'var(--text-2)', lineHeight: 1 }}>
                  {selSection.bodyPx}px preview
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 6, color: 'var(--text-3)' }}>a</span>
                <input
                  type="range" min={0} max={BODY_SIZES.length - 1}
                  value={Math.max(0, BODY_SIZES.indexOf(selSection.bodyPx))}
                  onChange={e => update(selSection.id, { bodyPx: BODY_SIZES[+e.target.value] })}
                  style={{ flex: 1, accentColor: 'var(--gold)' }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>a</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {BODY_SIZES.map(s => (
                  <button key={s} onClick={() => update(selSection.id, { bodyPx: s })}
                    style={{
                      fontSize: 5.5, padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                      background: selSection.bodyPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                      color: selSection.bodyPx === s ? '#000' : 'var(--text-2)',
                      border: '1px solid var(--border)', fontWeight: selSection.bodyPx === s ? 700 : 400,
                    }}>{s}px</button>
                ))}
              </div>
            </div>

            {/* Section height */}
            <div>
              <label style={{ display: 'block', fontSize: 5.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Section Height
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {PADDING_OPTS.map(opt => (
                  <button key={opt.value} onClick={() => update(selSection.id, { padding: opt.value })}
                    style={{
                      padding: '8px 6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      background: selSection.padding === opt.value ? 'rgba(200,155,60,0.15)' : 'var(--bg-elevated)',
                      border: `2px solid ${selSection.padding === opt.value ? 'var(--gold)' : 'var(--border)'}`,
                      color: selSection.padding === opt.value ? 'var(--gold)' : 'var(--text-2)',
                    }}>
                    <div style={{ fontSize: 14 }}>
                      {opt.value === 'compact' ? '▬' : opt.value === 'normal' ? '▭' : opt.value === 'spacious' ? '▯' : '▱'}
                    </div>
                    <div style={{ fontSize: 6, fontWeight: 600, marginTop: 3 }}>{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 7, color: 'var(--text-1)', fontWeight: 600 }}>Visibility</div>
                <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginTop: 2 }}>
                  Show or hide on homepage
                </div>
              </div>
              <button
                onClick={() => update(selSection.id, { visible: !selSection.visible })}
                style={{
                  fontSize: 7, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                  background: selSection.visible ? 'rgba(0,200,100,0.15)' : 'rgba(200,50,50,0.15)',
                  color:      selSection.visible ? '#5ddf8f'              : '#df5d5d',
                  border: `1px solid ${selSection.visible ? 'rgba(0,200,100,0.35)' : 'rgba(200,50,50,0.35)'}`,
                }}
              >
                {selSection.visible ? '👁 Visible' : '🚫 Hidden'}
              </button>
            </div>

            <div style={{ fontSize: 5.5, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Changes preview live on the page.<br />
              Hit <strong style={{ color: 'var(--gold)' }}>Save to Site</strong> to make them permanent.
            </div>
          </div>
        </div>
      )}

      {/* ── Sections Grid ────────────────────────────────────── */}
      <div className="content-grid">

        {/* About Me */}
        {sec('about').visible && (
          <div className="cg-about" style={{ overflow: 'visible' }}>
            <EditWrap id="about">
              <div className="scroll-roll" />
              <div className="scroll-parchment" style={parchStyle('about')}>
                <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: sec('about').headingPx, color: '#3a1e06' }}>
                  <span>{sec('about').icon}</span> {sec('about').heading}
                </h2>
                <div className="space-y-2 body-text" style={{ fontSize: sec('about').bodyPx, color: '#3a2810' }}>
                  {bio1 && <p>{bio1}</p>}
                  {bio2 && <p>{bio2}</p>}
                  {bio3 && <p>{bio3}</p>}
                </div>
              </div>
              <div className="scroll-roll" />
            </EditWrap>
          </div>
        )}

        {/* My Projects */}
        {sec('projects').visible && (
          <div className="cg-projects" style={{ overflow: 'visible' }}>
            <EditWrap id="projects">
              <div className="scroll-roll" />
              <div className="scroll-parchment" style={parchStyle('projects')}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2" style={{ fontSize: sec('projects').headingPx, color: '#3a1e06' }}>
                    <span>{sec('projects').icon}</span> {sec('projects').heading}
                  </h2>
                  <Link href="/skills/projects" className="text-[6px] hover:opacity-70 transition-opacity" style={{ color: '#6a3808' }}>
                    View All →
                  </Link>
                </div>
                {dbProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <span className="text-4xl opacity-30">⚒️</span>
                    <p className="text-[7px]" style={{ color: '#8a6030' }}>No projects logged yet.</p>
                    <Link href="/skills/projects" className="osrs-btn text-[6.5px] px-3 py-1.5">Start a Project</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dbProjects.map(p => (
                      <Link key={p.id} href={p.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80"
                        style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                        <span className="text-xl shrink-0">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-bold truncate" style={{ fontSize: sec('projects').bodyPx, color: '#2a1006' }}>{p.title}</span>
                            <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{p.progress}%</span>
                          </div>
                          <div className="prog-bar">
                            <div className="prog-bar-fill" style={{ width: `${p.progress}%` }} />
                          </div>
                          <div className="text-[5.5px] mt-1" style={{ color: '#8a6030' }}>Updated {p.updated}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="scroll-roll" />
            </EditWrap>
          </div>
        )}

        {/* Community Feed */}
        {sec('feed').visible && (
          <div className="cg-feed" style={{ overflow: 'visible' }}>
            <EditWrap id="feed">
              <div className="scroll-roll" />
              <div className="scroll-parchment" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
                <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: sec('feed').headingPx, color: '#3a1e06' }}>
                  <span>{sec('feed').icon}</span> {sec('feed').heading}
                  <span className="ml-auto text-[6px]" style={{ color: '#8a6030' }}>All Communities</span>
                </h2>
                {recentPosts.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="text-3xl mb-3">💬</div>
                    <p className="text-[8px] mb-4" style={{ color: '#5a3818' }}>The community feed is empty.</p>
                    {!hasSession ? (
                      <div className="flex justify-center gap-2">
                        <Link href="/register" className="osrs-btn text-[7px]">Join &amp; Post</Link>
                        <Link href="/login" className="osrs-btn text-[7px]">Login</Link>
                      </div>
                    ) : (
                      <p className="text-[7px]" style={{ color: '#8a6030' }}>Click any community in the sidebar to post!</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPosts.map(post => {
                      const skill = getSkillByEnum(post.skill)
                      const upvotes = post.upvotes.length
                      const replies = post.replies.length
                      return (
                        <Link key={post.id} href={skill?.href ?? '/'} className="block post-card">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-bold"
                              style={{ background: 'rgba(180,120,40,0.2)', border: '1px solid #a07840', color: '#6a3808' }}>
                              {post.user.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-[7px] font-bold" style={{ color: '#2a1006' }}>{post.user.username}</span>
                                <span className="text-[6px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(180,120,40,0.2)', color: '#5a3818', border: '1px solid #a07840' }}>
                                  {skill?.icon} {skill?.label}
                                </span>
                                <span className="text-[5.5px] ml-auto" style={{ color: '#8a6030' }}>{timeAgo(post.createdAt)}</span>
                              </div>
                              <div className="text-[8px] font-bold mb-1 truncate" style={{ color: '#2a1006' }}>{post.title}</div>
                              <p className="body-text mb-2 line-clamp-2" style={{ fontSize: sec('feed').bodyPx, color: '#3a2810' }}>
                                {post.body}
                              </p>
                              <div className="flex items-center gap-3">
                                {upvotes > 0 && <span className="text-[6px] flex items-center gap-1" style={{ color: '#6a3808' }}>▲ {upvotes}</span>}
                                {replies > 0 && <span className="text-[6px] flex items-center gap-1" style={{ color: '#8a6030' }}>💬 {replies}</span>}
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="scroll-roll" />
            </EditWrap>
          </div>
        )}

        {/* Achievements */}
        {sec('achieve').visible && (
          <div className="cg-achieve" style={{ overflow: 'visible' }}>
            <EditWrap id="achieve">
              <div className="scroll-roll" />
              <div className="scroll-parchment" style={parchStyle('achieve')}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: sec('achieve').headingPx }}>{sec('achieve').icon}</span>
                  <span style={{ fontSize: sec('achieve').headingPx, color: '#3a1e06' }}>{sec('achieve').heading}</span>
                </div>
                {userBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userBadges.map(key => {
                      const meta = BADGE_META[key]
                      return meta ? (
                        <span key={key} title={meta.label} className="cursor-default select-none" style={{ fontSize: 22, lineHeight: 1 }}>
                          {meta.icon}
                        </span>
                      ) : null
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 opacity-50">
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span className="text-[6px]" style={{ color: '#8a6030' }}>None yet — post &amp; play to earn</span>
                  </div>
                )}
              </div>
              <div className="scroll-roll" />
            </EditWrap>
          </div>
        )}

        {/* How to Earn XP */}
        {sec('xp').visible && (
          <div className="cg-xp" style={{ overflow: 'visible' }}>
            <EditWrap id="xp">
              <div className="scroll-roll" />
              <div className="scroll-parchment" style={parchStyle('xp')}>
                <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: sec('xp').headingPx, color: '#3a1e06' }}>
                  <span>{sec('xp').icon}</span> {sec('xp').heading}
                </h2>
                <div className="space-y-1.5">
                  {[
                    { icon: '📝', action: 'Post to a skill',  xp: '+50 XP' },
                    { icon: '🍳', action: 'Add a recipe',     xp: '+50 XP' },
                    { icon: '🎮', action: 'Win a mini-game',  xp: '+25 XP' },
                    { icon: '📅', action: 'Daily login',      xp: '+10 XP' },
                  ].map(row => (
                    <div key={row.action}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                      <span className="text-sm shrink-0">{row.icon}</span>
                      <span className="flex-1" style={{ fontSize: sec('xp').bodyPx, color: '#3a2810' }}>{row.action}</span>
                      <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{row.xp}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="scroll-roll" />
            </EditWrap>
          </div>
        )}

      </div>
    </div>
  )
}
