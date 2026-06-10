'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getSkillByEnum } from '@/lib/skills'
import { BADGE_META } from '@/lib/badges'

export type SectionConfig = {
  id: string; heading: string; icon: string
  headingPx: number; bodyPx: number
  padding: 'compact' | 'normal' | 'spacious' | 'tall'
  minHeight: number
  visible: boolean
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
  initialCols: [number, number, number]
  initialOrder: string[]
}

const DEFAULT_ORDER = ['about', 'projects', 'feed', 'achieve', 'xp']
const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'about',    heading: 'About Me',       icon: '📜', headingPx: 9,  bodyPx: 12, padding: 'normal',  minHeight: 0, visible: true },
  { id: 'projects', heading: 'My Projects',    icon: '⚒️', headingPx: 9,  bodyPx: 12, padding: 'normal',  minHeight: 0, visible: true },
  { id: 'feed',     heading: 'Community Feed', icon: '💬', headingPx: 9,  bodyPx: 12, padding: 'normal',  minHeight: 0, visible: true },
  { id: 'achieve',  heading: 'Achievements',   icon: '🏆', headingPx: 7,  bodyPx: 10, padding: 'compact', minHeight: 0, visible: true },
  { id: 'xp',       heading: 'How to Earn XP', icon: '⚡', headingPx: 9,  bodyPx: 10, padding: 'normal',  minHeight: 0, visible: true },
]
const PADDING_PAD: Record<string, string> = {
  compact: '10px 16px', normal: '20px 24px',
  spacious: '32px 28px', tall: '20px 24px',
}
const HEADING_SIZES = [7, 9, 11, 13, 16, 20, 24]
const BODY_SIZES    = [10, 12, 14, 16, 18]

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

/* ─── Section wrapper — module scope (prevents remount on state changes) ─── */
interface WrapProps {
  id: string; heading: string; editMode: boolean
  selected: string | null; onSelect: (id: string) => void
  onResize: (id: string, h: number) => void
  minHeight: number
  colIdx: 0 | 1 | 2
  cols: [number, number, number]
  onColChange: (colIdx: 0 | 1 | 2, fr: number) => void
  children: React.ReactNode
}
function SectionWrap({ id, heading, editMode, selected, onSelect, onResize, minHeight, colIdx, cols, onColChange, children }: WrapProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editMode,
  })

  // In view mode: just a ref-holder with no extra chrome
  if (!editMode) {
    return <div ref={setNodeRef}>{children}</div>
  }

  const active = selected === id
  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform) ?? undefined,
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={e => { e.stopPropagation(); onSelect(id) }}
      style={{
        ...dragStyle,
        position: 'relative',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: 6,
        outline: active ? '3px solid #c89b3c' : '2px dashed #c89b3c',
        outlineOffset: 4,
      }}
    >
      {/* Panel label — pointerEvents none so it doesn&apos;t block drag */}
      <div style={{
        position: 'absolute', top: -11, left: 8, zIndex: 10, pointerEvents: 'none',
        background: active ? 'var(--gold)' : '#1a1a28',
        color: active ? '#000' : 'var(--gold)',
        border: '1px solid var(--gold)', borderRadius: 4,
        padding: '2px 8px', fontSize: 5.5, fontWeight: 700, letterSpacing: '0.07em',
        userSelect: 'none',
      }}>
        ⠿ {heading}
      </div>

      {children}

      {/* Resize sliders */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'rgba(13,13,20,0.93)',
          borderTop: '1px solid rgba(200,155,60,0.35)',
          padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: 7,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 5.5, color: '#a07848', width: 44, flexShrink: 0 }}>↕ Height</span>
          <input type="range" min={0} max={800} step={10}
            value={minHeight}
            onChange={e => onResize(id, +e.target.value)}
            style={{ flex: 1, accentColor: '#c89b3c', cursor: 'pointer', height: 4 }} />
          <span style={{ fontSize: 5.5, color: 'var(--gold)', width: 34, textAlign: 'right', flexShrink: 0 }}>
            {minHeight > 0 ? `${minHeight}px` : 'Auto'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 5.5, color: '#a07848', width: 44, flexShrink: 0 }}>↔ Width</span>
          <input type="range" min={0.3} max={4} step={0.05}
            value={cols[colIdx]}
            onChange={e => onColChange(colIdx, +e.target.value)}
            style={{ flex: 1, accentColor: '#c89b3c', cursor: 'pointer', height: 4 }} />
          <span style={{ fontSize: 5.5, color: 'var(--gold)', width: 34, textAlign: 'right', flexShrink: 0 }}>
            {cols[colIdx].toFixed(1)}fr
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Column drag handle ─────────────────────────────────────── */
interface ColHandleProps { leftPct: number; onDragStart: (e: React.MouseEvent) => void }
function ColHandle({ leftPct, onDragStart }: ColHandleProps) {
  return (
    <div onMouseDown={onDragStart} onClick={e => e.stopPropagation()} title="Drag to resize columns"
      style={{
        position: 'absolute', left: `calc(${leftPct}% - 8px)`,
        top: '4%', bottom: '4%', width: 16, zIndex: 30,
        cursor: 'ew-resize', borderRadius: 8, border: '1px solid var(--gold)',
        background: 'rgba(200,155,60,0.38)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 8, color: 'var(--gold)', writingMode: 'vertical-lr', letterSpacing: 1 }}>⋮⋮</span>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
export default function HomepageSections({
  isAdmin, bio1: initBio1, bio2: initBio2, bio3: initBio3,
  dbProjects, recentPosts, hasSession, userBadges, initialLayout, initialCols, initialOrder,
}: Props) {
  const [layout,     setLayout]     = useState<SectionConfig[]>(initialLayout.length ? initialLayout : DEFAULT_SECTIONS)
  const [editMode,   setEditMode]   = useState(false)
  const [selected,   setSelected]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [cols,       setCols]       = useState<[number, number, number]>(initialCols)
  const [panelOrder, setPanelOrder] = useState<string[]>(
    initialOrder.length === 5 ? initialOrder : [...DEFAULT_ORDER]
  )
  const gridRef = useRef<HTMLDivElement>(null)

  const [bio1, setBio1] = useState(initBio1)
  const [bio2, setBio2] = useState(initBio2)
  const [bio3, setBio3] = useState(initBio3)

  // DnD sensors — 8px distance prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const sec = (id: string): SectionConfig => {
    const base = DEFAULT_SECTIONS.find(s => s.id === id)!
    const saved = layout.find(s => s.id === id)
    return saved ? ({ ...base, ...saved } as SectionConfig) : base
  }
  const pSty = (id: string): React.CSSProperties => {
    const s = sec(id)
    const pad = PADDING_PAD[s.padding] ?? '20px 24px'
    return s.minHeight > 0 ? { padding: pad, minHeight: s.minHeight } : { padding: pad }
  }
  const update = (id: string, patch: Partial<SectionConfig>) =>
    setLayout(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const handleSelect   = (id: string) => setSelected(prev => prev === id ? null : id)
  const handleResize   = (id: string, h: number) => update(id, { minHeight: h })
  const handleColChange = (colIdx: 0 | 1 | 2, fr: number) =>
    setCols(prev => { const n: [number, number, number] = [...prev]; n[colIdx] = fr; return n })

  const startColDrag = (e: React.MouseEvent, boundary: 0 | 1) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const containerW = gridRef.current?.offsetWidth ?? 600
    const [c0, c1, c2] = cols
    const total = c0 + c1 + c2
    const onMove = (ev: MouseEvent) => {
      const d = ((ev.clientX - startX) / containerW) * total
      if (boundary === 0) setCols([Math.max(0.3, c0 + d), Math.max(0.3, c1 - d), c2])
      else                setCols([c0, Math.max(0.3, c1 + d), Math.max(0.3, c2 - d)])
    }
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const colTotal = cols[0] + cols[1] + cols[2]
  const b0Pct = (cols[0] / colTotal) * 100
  const b1Pct = ((cols[0] + cols[1]) / colTotal) * 100

  useEffect(() => {
    if (!gridRef.current) return
    gridRef.current.style.setProperty('--cg-c1', `${cols[0]}fr`)
    gridRef.current.style.setProperty('--cg-c2', `${cols[1]}fr`)
    gridRef.current.style.setProperty('--cg-c3', `${cols[2]}fr`)
  }, [cols])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPanelOrder(prev => {
      const from = prev.indexOf(active.id as string)
      const to   = prev.indexOf(over.id as string)
      return arrayMove(prev, from, to)
    })
  }

  const save = async () => {
    setSaving(true)
    await Promise.all([
      fetch('/api/admin/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: layout, cols, order: panelOrder }),
      }),
      fetch('/api/admin/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio_1: bio1, bio_2: bio2, bio_3: bio3 }),
      }),
    ])
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const selSec = selected ? sec(selected) : null
  const visibleOrder = panelOrder.filter(id => sec(id).visible)

  // Render the inner JSX for each section (children of SectionWrap)
  const renderContent = (secId: string) => {
    const s = sec(secId)
    switch (secId) {
      case 'about': return (
        <>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={pSty('about')}>
            <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: s.headingPx, color: '#3a1e06' }}>
              <span>{s.icon}</span> {s.heading}
            </h2>
            <div className="space-y-2 body-text" style={{ color: '#3a2810' }}>
              {editMode ? (
                <>
                  <textarea value={bio1} onChange={e => setBio1(e.target.value)} onClick={e => e.stopPropagation()}
                    style={{ width: '100%', background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.35)',
                      borderRadius: 4, padding: '6px 8px', color: '#3a2810', fontSize: s.bodyPx,
                      fontFamily: 'Inter, system-ui', resize: 'vertical', minHeight: 60 }} />
                  <textarea value={bio2} onChange={e => setBio2(e.target.value)} onClick={e => e.stopPropagation()}
                    style={{ width: '100%', background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.35)',
                      borderRadius: 4, padding: '6px 8px', color: '#3a2810', fontSize: s.bodyPx,
                      fontFamily: 'Inter, system-ui', resize: 'vertical', minHeight: 60 }} />
                  <textarea value={bio3} onChange={e => setBio3(e.target.value)} onClick={e => e.stopPropagation()}
                    style={{ width: '100%', background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.35)',
                      borderRadius: 4, padding: '6px 8px', color: '#3a2810', fontSize: s.bodyPx,
                      fontFamily: 'Inter, system-ui', resize: 'vertical', minHeight: 60 }} />
                </>
              ) : (
                <>
                  {bio1 && <p style={{ fontSize: s.bodyPx }}>{bio1}</p>}
                  {bio2 && <p style={{ fontSize: s.bodyPx }}>{bio2}</p>}
                  {bio3 && <p style={{ fontSize: s.bodyPx }}>{bio3}</p>}
                </>
              )}
            </div>
          </div>
          <div className="scroll-roll" />
        </>
      )

      case 'projects': return (
        <>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={pSty('projects')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2" style={{ fontSize: s.headingPx, color: '#3a1e06' }}>
                <span>{s.icon}</span> {s.heading}
              </h2>
              <Link href="/skills/projects" onClick={e => editMode && e.preventDefault()}
                className="text-[6px] hover:opacity-70 transition-opacity" style={{ color: '#6a3808' }}>
                View All →
              </Link>
            </div>
            {editMode && selected === 'projects' && (
              <div style={{ marginBottom: 10, padding: '7px 10px', borderRadius: 6, background: 'rgba(200,155,60,0.08)', border: '1px solid rgba(200,155,60,0.25)', fontSize: 6, color: '#8a6030' }}>
                ⚒️ Edit projects in <a href="/admin/projects" target="_blank" style={{ color: 'var(--gold)' }}>Admin → Projects</a>
              </div>
            )}
            {dbProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <span className="text-4xl opacity-30">⚒️</span>
                <p className="text-[7px]" style={{ color: '#8a6030' }}>No projects logged yet.</p>
                <Link href="/skills/projects" className="osrs-btn text-[6.5px] px-3 py-1.5">Start a Project</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {dbProjects.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                    <span className="text-xl shrink-0">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold truncate" style={{ fontSize: s.bodyPx, color: '#2a1006' }}>{p.title}</span>
                        <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{p.progress}%</span>
                      </div>
                      <div className="prog-bar"><div className="prog-bar-fill" style={{ width: `${p.progress}%` }} /></div>
                      <div className="text-[5.5px] mt-1" style={{ color: '#8a6030' }}>Updated {p.updated}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="scroll-roll" />
        </>
      )

      case 'feed': return (
        <>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
            <h2 className="mb-4 flex items-center gap-2" style={{ fontSize: s.headingPx, color: '#3a1e06' }}>
              <span>{s.icon}</span> {s.heading}
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
                  return (
                    <Link key={post.id} href={editMode ? '#' : (skill?.href ?? '/')} className="block post-card">
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
                          <p className="body-text mb-2 line-clamp-2" style={{ fontSize: s.bodyPx, color: '#3a2810' }}>{post.body}</p>
                          <div className="flex items-center gap-3">
                            {post.upvotes.length > 0 && <span className="text-[6px]" style={{ color: '#6a3808' }}>▲ {post.upvotes.length}</span>}
                            {post.replies.length > 0 && <span className="text-[6px]" style={{ color: '#8a6030' }}>💬 {post.replies.length}</span>}
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
        </>
      )

      case 'achieve': return (
        <>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={pSty('achieve')}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: s.headingPx }}>{s.icon}</span>
              <span style={{ fontSize: s.headingPx, color: '#3a1e06' }}>{s.heading}</span>
            </div>
            {userBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userBadges.map(key => {
                  const meta = BADGE_META[key]
                  return meta ? <span key={key} title={meta.label} style={{ fontSize: 22, lineHeight: 1, cursor: 'default' }}>{meta.icon}</span> : null
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
        </>
      )

      case 'xp': return (
        <>
          <div className="scroll-roll" />
          <div className="scroll-parchment" style={pSty('xp')}>
            <h2 className="mb-3 flex items-center gap-2" style={{ fontSize: s.headingPx, color: '#3a1e06' }}>
              <span>{s.icon}</span> {s.heading}
            </h2>
            <div className="space-y-1.5">
              {[
                { icon: '📝', action: 'Post to a skill', xp: '+50 XP' },
                { icon: '🍳', action: 'Add a recipe',    xp: '+50 XP' },
                { icon: '🎮', action: 'Win a mini-game', xp: '+25 XP' },
                { icon: '📅', action: 'Daily login',     xp: '+10 XP' },
              ].map(row => (
                <div key={row.action} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                  style={{ background: 'rgba(180,120,40,0.18)', border: '1px solid #a07840' }}>
                  <span className="text-sm shrink-0">{row.icon}</span>
                  <span className="flex-1" style={{ fontSize: s.bodyPx, color: '#3a2810' }}>{row.action}</span>
                  <span className="text-[6px] font-bold shrink-0" style={{ color: '#6a3808' }}>{row.xp}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="scroll-roll" />
        </>
      )

      default: return null
    }
  }

  return (
    <div>

      {/* ── Admin toolbar ────────────────────────────────────── */}
      {isAdmin && !editMode && (
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setEditMode(true)} style={{
            padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(200,155,60,0.12)', border: '1px solid var(--gold)',
            color: 'var(--gold)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
          }}>
            ✏️ Edit Panels
          </button>
        </div>
      )}

      {/* ── Edit mode banner ─────────────────────────────────── */}
      {editMode && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: '#c89b3c', padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, borderRadius: 8,
          boxShadow: '0 4px 20px rgba(200,155,60,0.4)',
        }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#000' }}>
            ✏️ EDIT MODE — Drag panels to reorder · Sliders to resize · ↩ Cols to reset
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCols([1, 1, 1.5])} style={{
              padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(0,0,0,0.25)', color: '#000', fontSize: 7, fontWeight: 700, border: 'none',
            }}>
              ↩ Cols
            </button>
            <button onClick={save} disabled={saving} style={{
              padding: '7px 14px', borderRadius: 6, cursor: saving ? 'wait' : 'pointer',
              background: saved ? '#2a7a4a' : '#000',
              color: saved ? '#fff' : '#c89b3c', fontSize: 7, fontWeight: 700, border: 'none',
            }}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Save'}
            </button>
            <button onClick={() => { setEditMode(false); setSelected(null) }} style={{
              padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(0,0,0,0.3)', color: '#000', fontSize: 7, fontWeight: 700, border: 'none',
            }}>
              ✕ Done
            </button>
          </div>
        </div>
      )}

      {/* ── Properties side panel ───────────────────────────── */}
      {editMode && selSec && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 99,
          width: 300, overflowY: 'auto',
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          boxShadow: '-6px 0 28px rgba(0,0,0,0.5)', padding: '14px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 8, color: 'var(--gold)', fontWeight: 700 }}>
              {selSec.icon} {selSec.heading}
            </span>
            <button onClick={() => setSelected(null)}
              style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={LBL}>Section Title</label>
              <input type="text" value={selSec.heading}
                onChange={e => update(selSec.id, { heading: e.target.value })}
                className="osrs-input w-full" style={{ fontSize: 9, padding: '7px 10px' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <label style={LBL}>Heading Size</label>
                <span style={{ fontSize: selSec.headingPx, color: 'var(--gold)', lineHeight: 1, maxWidth: 130, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {selSec.heading}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 6, color: 'var(--text-3)' }}>A</span>
                <input type="range" min={0} max={HEADING_SIZES.length - 1}
                  value={Math.max(0, HEADING_SIZES.indexOf(selSec.headingPx))}
                  onChange={e => update(selSec.id, { headingPx: HEADING_SIZES[+e.target.value] })}
                  style={{ flex: 1, accentColor: 'var(--gold)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>A</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                {HEADING_SIZES.map(s => (
                  <button key={s} onClick={() => update(selSec.id, { headingPx: s })}
                    style={{ fontSize: 5, padding: '3px 4px', borderRadius: 4, cursor: 'pointer',
                      background: selSec.headingPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                      color: selSec.headingPx === s ? '#000' : 'var(--text-2)',
                      border: '1px solid var(--border)', fontWeight: selSec.headingPx === s ? 700 : 400 }}>
                    {s}px</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                <label style={LBL}>Body Text Size</label>
                <span className="body-text" style={{ fontSize: selSec.bodyPx, color: 'var(--text-2)', lineHeight: 1 }}>
                  {selSec.bodyPx}px
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 6, color: 'var(--text-3)' }}>a</span>
                <input type="range" min={0} max={BODY_SIZES.length - 1}
                  value={Math.max(0, BODY_SIZES.indexOf(selSec.bodyPx))}
                  onChange={e => update(selSec.id, { bodyPx: BODY_SIZES[+e.target.value] })}
                  style={{ flex: 1, accentColor: 'var(--gold)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>a</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                {BODY_SIZES.map(s => (
                  <button key={s} onClick={() => update(selSec.id, { bodyPx: s })}
                    style={{ fontSize: 5, padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                      background: selSec.bodyPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                      color: selSec.bodyPx === s ? '#000' : 'var(--text-2)',
                      border: '1px solid var(--border)', fontWeight: selSec.bodyPx === s ? 700 : 400 }}>
                    {s}px</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 7, color: 'var(--text-1)', fontWeight: 600 }}>Visibility</div>
                <div style={{ fontSize: 5.5, color: 'var(--text-3)', marginTop: 2 }}>Show or hide on homepage</div>
              </div>
              <button onClick={() => update(selSec.id, { visible: !selSec.visible })}
                style={{ fontSize: 7, padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                  background: selSec.visible ? 'rgba(0,200,100,0.15)' : 'rgba(200,50,50,0.15)',
                  color:      selSec.visible ? '#5ddf8f'              : '#df5d5d',
                  border: `1px solid ${selSec.visible ? 'rgba(0,200,100,0.35)' : 'rgba(200,50,50,0.35)'}` }}>
                {selSec.visible ? '👁 Visible' : '🚫 Hidden'}
              </button>
            </div>

            <div style={{ fontSize: 5.5, color: 'var(--text-3)', lineHeight: 1.7 }}>
              Changes preview live. Hit <strong style={{ color: 'var(--gold)' }}>Save</strong> to keep them.
            </div>
          </div>
        </div>
      )}

      {/* ── Sections grid ────────────────────────────────────── */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
          <div className="content-grid" ref={gridRef} style={{ position: 'relative' }}>

            {visibleOrder.map((secId, idx) => {
              const s = sec(secId)
              const colIdx = (idx % 3) as 0 | 1 | 2
              return (
                <div key={secId} style={{ overflow: 'visible' }}>
                  <SectionWrap
                    id={secId}
                    heading={s.heading}
                    editMode={editMode}
                    selected={selected}
                    onSelect={handleSelect}
                    onResize={handleResize}
                    minHeight={s.minHeight}
                    colIdx={colIdx}
                    cols={cols}
                    onColChange={handleColChange}
                  >
                    {renderContent(secId)}
                  </SectionWrap>
                </div>
              )
            })}

            {/* Column width drag handles */}
            {editMode && (
              <>
                <ColHandle leftPct={b0Pct} onDragStart={e => startColDrag(e, 0)} />
                <ColHandle leftPct={b1Pct} onDragStart={e => startColDrag(e, 1)} />
              </>
            )}

          </div>
        </SortableContext>
      </DndContext>

    </div>
  )
}

const LBL: React.CSSProperties = {
  fontSize: 5.5, color: 'var(--text-3)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  display: 'block', marginBottom: 5,
}
