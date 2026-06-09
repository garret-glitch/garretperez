'use client'
import { useEffect, useState } from 'react'

interface SectionConfig {
  id: string
  heading: string
  icon: string
  headingPx: number
  bodyPx: number
  padding: 'compact' | 'normal' | 'spacious' | 'tall'
  visible: boolean
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'about',    heading: 'About Me',       icon: '📜', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'projects', heading: 'My Projects',    icon: '⚒️', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'feed',     heading: 'Community Feed', icon: '💬', headingPx: 9,  bodyPx: 12, padding: 'normal',  visible: true },
  { id: 'achieve',  heading: 'Achievements',   icon: '🏆', headingPx: 7,  bodyPx: 10, padding: 'compact', visible: true },
  { id: 'xp',       heading: 'How to Earn XP', icon: '⚡', headingPx: 9,  bodyPx: 10, padding: 'normal',  visible: true },
]

const HEADING_SIZES = [7, 9, 11, 13, 16, 20, 24]
const BODY_SIZES    = [10, 12, 14, 16, 18]
const PADDING_OPTS  = [
  { value: 'compact',  label: 'Compact',  desc: 'Tight spacing' },
  { value: 'normal',   label: 'Normal',   desc: 'Default' },
  { value: 'spacious', label: 'Spacious', desc: 'More breathing room' },
  { value: 'tall',     label: 'Tall',     desc: 'Extra tall section' },
] as const

export default function LayoutEditorPage() {
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS)
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/layout')
      .then(r => r.json())
      .then(data => {
        if (data.sections) setSections(data.sections)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const sel = sections.find(s => s.id === selected)

  const update = (id: string, patch: Partial<SectionConfig>) =>
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const save = async () => {
    setSaving(true)
    await fetch('/api/admin/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return <div className="text-[8px] p-8" style={{ color: 'var(--text-3)' }}>Loading layout settings…</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[10px] mb-0.5" style={{ color: 'var(--gold)' }}>🖼️ Layout Editor</h1>
          <p className="text-[6.5px] body-text" style={{ color: 'var(--text-3)' }}>
            Click a section to edit its text size, heading, and height
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="osrs-btn text-[7px] px-5 py-2"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : '💾 Save Changes'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-5">

        {/* ── Left: Section Blocks ─────────────────────────────── */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <p className="text-[5.5px] mb-2 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            Sections — click to edit
          </p>
          <div className="space-y-2">
            {sections.map(section => (
              <div
                key={section.id}
                onClick={() => setSelected(section.id === selected ? null : section.id)}
                style={{
                  background: selected === section.id ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: selected === section.id
                    ? '2px solid var(--gold)'
                    : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  opacity: section.visible ? 1 : 0.4,
                  transition: 'all 0.15s',
                  userSelect: 'none',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{section.icon}</span>
                    <div className="min-w-0">
                      <div
                        className="truncate font-bold"
                        style={{
                          fontSize: 7,
                          color: selected === section.id ? 'var(--gold)' : 'var(--text-1)',
                        }}
                      >
                        {section.heading}
                      </div>
                      <div className="text-[5px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                        H:{section.headingPx}px · B:{section.bodyPx}px · {section.padding}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); update(section.id, { visible: !section.visible }) }}
                    title={section.visible ? 'Hide section' : 'Show section'}
                    style={{
                      fontSize: 14, background: 'none', border: 'none',
                      cursor: 'pointer', flexShrink: 0, lineHeight: 1,
                      opacity: 0.75,
                    }}
                  >
                    {section.visible ? '👁' : '🚫'}
                  </button>
                </div>

                {/* Mini preview bar */}
                <div style={{
                  marginTop: 8, height: 4, borderRadius: 2,
                  background: selected === section.id
                    ? 'rgba(200,155,60,0.4)'
                    : 'rgba(200,155,60,0.15)',
                }} />
              </div>
            ))}
          </div>
          <p className="text-[5.5px] mt-3 leading-relaxed" style={{ color: 'var(--text-3)' }}>
            👁 = visible on homepage<br />
            🚫 = hidden (click to toggle)
          </p>
        </div>

        {/* ── Right: Properties Panel ──────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!sel ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl"
              style={{
                background: 'var(--bg-card)',
                border: '2px dashed var(--border)',
                minHeight: 280,
                padding: 40,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>👆</div>
              <p className="text-[8px]" style={{ color: 'var(--text-3)' }}>
                Select a section on the left<br />to edit its properties
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <h2 className="text-[9px] mb-4 flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                {sel.icon} Editing: <span style={{ color: 'var(--text-1)' }}>{sel.heading}</span>
              </h2>

              <div className="space-y-5">

                {/* Section Heading Text */}
                <div>
                  <label className="block text-[6px] mb-1.5 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={sel.heading}
                    onChange={e => update(sel.id, { heading: e.target.value })}
                    className="osrs-input w-full px-3 py-2"
                    style={{ fontSize: 10 }}
                    placeholder="Section heading…"
                  />
                </div>

                {/* Heading Size */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[6px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                      Heading Size
                    </label>
                    <span
                      className="font-bold"
                      style={{ fontSize: sel.headingPx, color: 'var(--gold)', lineHeight: 1 }}
                    >
                      {sel.heading}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>A</span>
                    <input
                      type="range"
                      min={0}
                      max={HEADING_SIZES.length - 1}
                      value={Math.max(0, HEADING_SIZES.indexOf(sel.headingPx))}
                      onChange={e => update(sel.id, { headingPx: HEADING_SIZES[+e.target.value] })}
                      style={{ flex: 1, accentColor: 'var(--gold)', height: 4 }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>A</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    {HEADING_SIZES.map(s => (
                      <button
                        key={s}
                        onClick={() => update(sel.id, { headingPx: s })}
                        style={{
                          fontSize: 5.5, padding: '3px 5px', borderRadius: 4, cursor: 'pointer',
                          background: sel.headingPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                          color: sel.headingPx === s ? '#000' : 'var(--text-2)',
                          border: '1px solid var(--border)',
                          fontWeight: sel.headingPx === s ? 'bold' : 'normal',
                        }}
                      >
                        {s}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Text Size */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[6px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                      Body Text Size
                    </label>
                    <span
                      className="body-text"
                      style={{ fontSize: sel.bodyPx, color: 'var(--text-2)', lineHeight: 1 }}
                    >
                      Sample text at {sel.bodyPx}px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[6px]" style={{ color: 'var(--text-3)' }}>a</span>
                    <input
                      type="range"
                      min={0}
                      max={BODY_SIZES.length - 1}
                      value={Math.max(0, BODY_SIZES.indexOf(sel.bodyPx))}
                      onChange={e => update(sel.id, { bodyPx: BODY_SIZES[+e.target.value] })}
                      style={{ flex: 1, accentColor: 'var(--gold)', height: 4 }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>a</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    {BODY_SIZES.map(s => (
                      <button
                        key={s}
                        onClick={() => update(sel.id, { bodyPx: s })}
                        style={{
                          fontSize: 5.5, padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                          background: sel.bodyPx === s ? 'var(--gold)' : 'var(--bg-elevated)',
                          color: sel.bodyPx === s ? '#000' : 'var(--text-2)',
                          border: '1px solid var(--border)',
                          fontWeight: sel.bodyPx === s ? 'bold' : 'normal',
                        }}
                      >
                        {s}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Height / Padding */}
                <div>
                  <label className="block text-[6px] mb-2 uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                    Section Height
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PADDING_OPTS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => update(sel.id, { padding: opt.value })}
                        style={{
                          padding: '8px 4px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                          background: sel.padding === opt.value ? 'rgba(200,155,60,0.15)' : 'var(--bg-elevated)',
                          border: `2px solid ${sel.padding === opt.value ? 'var(--gold)' : 'var(--border)'}`,
                          color: sel.padding === opt.value ? 'var(--gold)' : 'var(--text-2)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ fontSize: 12, marginBottom: 3 }}>
                          {opt.value === 'compact' ? '▬' : opt.value === 'normal' ? '▭' : opt.value === 'spacious' ? '▯' : '▱'}
                        </div>
                        <div style={{ fontSize: 6, fontWeight: 600 }}>{opt.label}</div>
                        <div style={{ fontSize: 5, opacity: 0.7, marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visibility */}
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <div className="text-[7px] font-bold" style={{ color: 'var(--text-1)' }}>Visibility</div>
                    <div className="text-[5.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Hidden sections won&apos;t appear on the homepage
                    </div>
                  </div>
                  <button
                    onClick={() => update(sel.id, { visible: !sel.visible })}
                    style={{
                      fontSize: 7, padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
                      background: sel.visible ? 'rgba(0,200,100,0.15)' : 'rgba(200,50,50,0.15)',
                      color:      sel.visible ? '#5ddf8f'               : '#df5d5d',
                      border: `1px solid ${sel.visible ? 'rgba(0,200,100,0.35)' : 'rgba(200,50,50,0.35)'}`,
                    }}
                  >
                    {sel.visible ? '👁 Visible' : '🚫 Hidden'}
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Live preview hint */}
          <div
            className="mt-4 p-3 rounded-lg text-[6px] body-text"
            style={{ background: 'rgba(200,155,60,0.06)', border: '1px solid rgba(200,155,60,0.2)', color: 'var(--text-3)' }}
          >
            💡 Changes are previewed in the stats above. Hit <strong style={{ color: 'var(--gold)' }}>Save Changes</strong> then visit{' '}
            <a href="/" target="_blank" style={{ color: 'var(--gold)' }}>the homepage</a> to see them live.
          </div>
        </div>
      </div>
    </div>
  )
}
