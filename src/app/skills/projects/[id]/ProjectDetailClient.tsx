'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

interface ProjectTask {
  id: string
  text: string
  done: boolean
  priority: 1 | 2 | 3 | 4
  category: string
}

interface ProjectSpecs {
  year?: string
  make?: string
  model?: string
  engine?: string
  goal?: string
  currentStatus?: string[]
}

interface Props {
  project: {
    id: string
    icon: string
    title: string
    desc: string
    status: string
    progress: number
  }
  tasks: ProjectTask[]
  images: string[]
  specs: ProjectSpecs
  isAdmin: boolean
}

const PRIORITY_CATEGORIES: Array<{
  priority: 1 | 2 | 3 | 4
  label: string
  color: string
}> = [
  { priority: 1, label: 'Safety',       color: '#ef4444' },
  { priority: 2, label: 'Reliability',  color: '#f59e0b' },
  { priority: 3, label: 'Comfort',      color: '#60a5fa' },
  { priority: 4, label: 'Nice-to-Have', color: '#6b7280' },
]

function getStatusIndicator(item: string): { symbol: string; color: string } {
  const lower = item.toLowerCase()
  if (
    lower.includes('completed') ||
    lower.includes('installed') ||
    lower.includes('updated')
  ) {
    return { symbol: '✓', color: '#22c55e' }
  }
  if (lower.includes('issue') || lower.includes('suspected')) {
    return { symbol: '⚠', color: '#f97316' }
  }
  if (lower.startsWith('no ') || lower.startsWith('old ') || lower.includes('not installed')) {
    return { symbol: '✗', color: '#ef4444' }
  }
  return { symbol: '·', color: '#a09880' }
}

export default function ProjectDetailClient({
  project,
  tasks: initialTasks,
  images: initialImages,
  specs,
  isAdmin,
}: Props) {
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [images, setImages] = useState<string[]>(initialImages)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.done).length
  const computedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : project.progress

  const isCompleted = project.status === 'completed'

  async function handleToggleTask(taskId: string) {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, done: !t.done } : t
    )
    setTasks(updated)
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: JSON.stringify(updated) }),
      })
    } catch (err) {
      console.error('Failed to save task toggle:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPhoto() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const updated = [...images, base64]
      setImages(updated)
      setSaving(true)
      try {
        await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: JSON.stringify(updated) }),
        })
      } catch (err) {
        console.error('Failed to save image:', err)
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleDeleteImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    setImages(updated)
    setSaving(true)
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: JSON.stringify(updated) }),
      })
    } catch (err) {
      console.error('Failed to delete image:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Back + saving indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <Link
          href="/skills/projects"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            color: 'var(--text-3)',
            textDecoration: 'none',
          }}
        >
          ← Back to Projects
        </Link>
        {saving && (
          <span
            className="body-text"
            style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}
          >
            Saving…
          </span>
        )}
      </div>

      {/* Project header */}
      <div
        className="rp-card"
        style={{ padding: '24px 24px 20px', marginBottom: 20, borderRadius: 12 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 48, flexShrink: 0 }}>{project.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: 'var(--gold)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {project.title}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(13,13,20,0.85)',
                  border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.4)' : 'rgba(249,115,22,0.4)'}`,
                  borderRadius: 6,
                  padding: '4px 8px',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isCompleted ? '#22c55e' : '#f97316',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 6,
                    fontFamily: "'Press Start 2P', monospace",
                    color: isCompleted ? '#22c55e' : '#f97316',
                  }}
                >
                  {isCompleted ? 'Complete' : 'In Progress'}
                </span>
              </span>
            </div>
            <p
              className="body-text"
              style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}
            >
              {project.desc}
            </p>
          </div>
        </div>

        {/* Overall progress */}
        {totalTasks > 0 && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: 'var(--text-1)',
                marginBottom: 8,
              }}
            >
              {doneTasks} / {totalTasks} tasks complete
            </div>
            <div
              style={{
                height: 12,
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(200,155,60,0.25)',
                borderRadius: 6,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${computedProgress}%`,
                  background: 'linear-gradient(90deg, #9a7428, #c89b3c)',
                  borderRadius: 6,
                  transition: 'width 0.4s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '45%',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>
            <div
              className="body-text"
              style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, textAlign: 'right' }}
            >
              {computedProgress}% complete
            </div>
          </div>
        )}
      </div>

      {/* Image gallery */}
      <div
        className="rp-card"
        style={{ padding: '20px 20px 16px', marginBottom: 20, borderRadius: 12 }}
      >
        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            color: 'var(--text-1)',
            margin: '0 0 14px',
          }}
        >
          Photos
        </h2>

        {images.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={src}
                  alt={`${project.title} photo ${i + 1}`}
                  className="h-48 object-cover rounded-lg"
                  style={{ minWidth: 256, display: 'block' }}
                />
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteImage(i)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(239,68,68,0.5)',
                      color: '#ef4444',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              height: 120,
              background: 'radial-gradient(ellipse at center, #1a1a28 0%, #0d0d14 80%)',
              borderRadius: 8,
              border: '1px dashed var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>{project.icon}</span>
            <span
              className="body-text"
              style={{ fontSize: 11, color: 'var(--text-3)' }}
            >
              No photos yet
            </span>
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: 12 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              onClick={handleAddPhoto}
              className="osrs-btn"
              style={{
                fontSize: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              + Add Photo
            </button>
          </div>
        )}
      </div>

      {/* Specs card */}
      {(specs.year || specs.make || specs.model || specs.engine || specs.goal || (specs.currentStatus && specs.currentStatus.length > 0)) && (
        <div
          className="rp-card"
          style={{ padding: '20px 20px 16px', marginBottom: 20, borderRadius: 12 }}
        >
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: 'var(--text-1)',
              margin: '0 0 16px',
            }}
          >
            Build Specs
          </h2>

          {/* 2×2 spec grid */}
          {(specs.year || specs.make || specs.model || specs.engine) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                { label: 'Year',   value: specs.year   },
                { label: 'Make',   value: specs.make   },
                { label: 'Model',  value: specs.model  },
                { label: 'Engine', value: specs.engine },
              ].map(({ label, value }) =>
                value ? (
                  <div
                    key={label}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: 6,
                        color: 'var(--text-3)',
                        marginBottom: 5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      className="body-text"
                      style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}
                    >
                      {value}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Goal */}
          {specs.goal && (
            <div
              style={{
                background: 'rgba(200,155,60,0.07)',
                border: '1px solid rgba(200,155,60,0.2)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  color: '#c89b3c',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Goal
              </div>
              <p
                className="body-text"
                style={{ fontSize: 13, color: 'var(--text-1)', margin: 0, lineHeight: 1.6 }}
              >
                {specs.goal}
              </p>
            </div>
          )}

          {/* Current status list */}
          {specs.currentStatus && specs.currentStatus.length > 0 && (
            <div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 6,
                  color: 'var(--text-3)',
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Current Status
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {specs.currentStatus.map((item, i) => {
                  const { symbol, color } = getStatusIndicator(item)
                  return (
                    <li
                      key={i}
                      className="body-text"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-1)' }}
                    >
                      <span style={{ color, flexShrink: 0, fontWeight: 700, fontSize: 14, width: 16, textAlign: 'center' }}>
                        {symbol}
                      </span>
                      {item}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Checklist by priority */}
      {tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PRIORITY_CATEGORIES.map(({ priority, label, color }) => {
            const categoryTasks = tasks.filter((t) => t.priority === priority)
            if (categoryTasks.length === 0) return null
            const catDone = categoryTasks.filter((t) => t.done).length

            return (
              <div
                key={priority}
                className="rp-card"
                style={{ padding: '20px 20px 16px', borderRadius: 12 }}
              >
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      display: 'inline-block',
                      boxShadow: `0 0 6px ${color}88`,
                    }}
                  />
                  <h3
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 8,
                      color: color,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    Priority {priority} — {label}
                  </h3>
                  <span
                    className="body-text"
                    style={{
                      fontSize: 11,
                      background: 'rgba(0,0,0,0.4)',
                      border: `1px solid ${color}44`,
                      borderRadius: 10,
                      padding: '2px 8px',
                      color: color,
                    }}
                  >
                    {catDone}/{categoryTasks.length}
                  </span>
                </div>

                {/* Task rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        background: task.done ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
                        borderRadius: 6,
                        border: task.done
                          ? '1px solid rgba(34,197,94,0.15)'
                          : '1px solid var(--border-dim)',
                        transition: 'background 0.2s, border-color 0.2s',
                      }}
                    >
                      {isAdmin ? (
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => handleToggleTask(task.id)}
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            accentColor: color,
                            cursor: 'pointer',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                            borderRadius: 3,
                            border: task.done ? `2px solid ${color}` : '2px solid var(--border)',
                            background: task.done ? `${color}33` : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {task.done && (
                            <span style={{ color, fontSize: 10, lineHeight: 1 }}>✓</span>
                          )}
                        </div>
                      )}
                      <span
                        className="body-text"
                        style={{
                          fontSize: 13,
                          color: task.done ? 'var(--text-3)' : 'var(--text-1)',
                          textDecoration: task.done ? 'line-through' : 'none',
                          flex: 1,
                          lineHeight: 1.5,
                        }}
                      >
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
