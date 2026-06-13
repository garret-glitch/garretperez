'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import YoutubeChannelCard, { type ChannelData } from './YoutubeChannelCard'

const ACCENT_COLORS = [
  { value: '#ef4444', label: 'YouTube Red' },
  { value: '#c89b3c', label: 'Gold' },
  { value: '#6b9edb', label: 'Sapphire' },
  { value: '#8b5cf6', label: 'Amethyst' },
  { value: '#22c55e', label: 'Emerald' },
  { value: '#f97316', label: 'Amber' },
]

const CATEGORIES = ['Gaming', 'Tech', 'Cooking', 'Music', 'Comedy', 'Education', 'Fitness', 'Travel', 'Business', 'Other']

interface FormState {
  channelName: string
  channelUrl: string
  description: string
  category: string
  accentColor: string
}

const blank: FormState = { channelName: '', channelUrl: '', description: '', category: '', accentColor: '#ef4444' }

const inputCss: React.CSSProperties = {
  width: '100%', background: '#0e0c0a', border: '1px solid #3a2a18',
  borderRadius: 4, padding: '9px 12px',
  fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#e8d8b0', outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#907848', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function YoutubeChannelsSection({
  channels,
  userId,
  isAdmin,
}: {
  channels: ChannelData[]
  userId: string | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(blank)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function openForm() { setForm(blank); setError(''); setShowForm(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.channelName.trim()) { setError('Channel name is required.'); return }
    if (!form.channelUrl.trim()) { setError('Channel URL is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/youtube-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error || 'Failed to save.') }
      else { setForm(blank); setShowForm(false); startTransition(() => router.refresh()) }
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this channel recommendation?')) return
    try {
      await fetch(`/api/youtube-channels/${id}`, { method: 'DELETE' })
      startTransition(() => router.refresh())
    } catch { /* ignore */ }
  }

  const ac = form.accentColor

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10, marginBottom: 16,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #12100e, #1c1812)',
        border: '1px solid rgba(200,155,60,0.22)',
        borderRadius: 6, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #ef444470, transparent)' }} />
        <div>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898' }}>
            ▶ YouTube Channels
          </span>
          <span style={{
            marginLeft: 10, fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
            color: '#ef4444', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: 2,
          }}>
            {channels.length} {channels.length === 1 ? 'CHANNEL' : 'CHANNELS'}
          </span>
        </div>
        <div>
          {userId ? (
            <button
              onClick={showForm ? () => setShowForm(false) : openForm}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                background: showForm ? 'transparent' : 'linear-gradient(135deg, #ef4444, #c82020)',
                color: showForm ? '#907848' : '#fff',
                border: showForm ? '1px solid #3a2a18' : 'none',
                padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
                boxShadow: showForm ? 'none' : '0 2px 10px rgba(239,68,68,0.3)',
              }}
            >
              {showForm ? '✕ Cancel' : '+ Recommend Channel'}
            </button>
          ) : (
            <a href="/login" style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7,
              background: 'linear-gradient(135deg, #ef4444, #c82020)',
              color: '#fff', padding: '8px 14px', borderRadius: 4,
              textDecoration: 'none',
            }}>
              Login to Recommend
            </a>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e, #1c1812)',
          border: `1px solid ${ac}40`, borderRadius: 6,
          padding: '20px 20px 18px', marginBottom: 16,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${ac}15`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${ac}, transparent)` }} />

          <div style={{ marginBottom: 18 }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898' }}>
              + Recommend a Channel
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
              <Field label="Channel Name *">
                <input value={form.channelName} onChange={set('channelName')} maxLength={80} placeholder="e.g. Linus Tech Tips" required style={inputCss} />
              </Field>
              <Field label="YouTube URL *">
                <input value={form.channelUrl} onChange={set('channelUrl')} maxLength={200} placeholder="youtube.com/@channel" required style={inputCss} />
              </Field>
              <Field label="Why you recommend it">
                <input value={form.description} onChange={set('description')} maxLength={200} placeholder="Short reason (optional)" style={inputCss} />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={set('category')}
                  style={{ ...inputCss, appearance: 'none' as any }}
                >
                  <option value="">— Pick a category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#907848', display: 'block', marginBottom: 8 }}>Card Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value} type="button" title={c.label}
                    onClick={() => setForm(f => ({ ...f, accentColor: c.value }))}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                      background: c.value,
                      border: form.accentColor === c.value ? '3px solid #f0d898' : '3px solid transparent',
                      boxShadow: form.accentColor === c.value ? `0 0 0 2px ${c.value}` : '0 2px 6px rgba(0,0,0,0.3)',
                      transform: form.accentColor === c.value ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#907848', display: 'block', marginBottom: 8 }}>Preview</label>
              <div style={{ maxWidth: 320 }}>
                <YoutubeChannelCard
                  channel={{
                    id: 'preview',
                    channelName: form.channelName || 'Channel Name',
                    channelUrl: form.channelUrl || '#',
                    description: form.description || null,
                    category: form.category || null,
                    accentColor: form.accentColor,
                    createdAt: new Date().toISOString(),
                    user: { id: '', username: 'you' },
                  }}
                />
              </div>
            </div>

            {error && <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#ef4444', marginBottom: 12 }}>⚠ {error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit" disabled={saving}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  background: `linear-gradient(135deg, ${ac}, ${ac}bb)`,
                  color: '#0e0c08', border: 'none', padding: '9px 18px',
                  borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, boxShadow: `0 2px 10px ${ac}40`,
                }}
              >
                {saving ? 'Saving…' : 'Add Channel'}
              </button>
              <button
                type="button" onClick={() => setShowForm(false)}
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, background: 'transparent', color: '#907848', border: '1px solid #3a2a18', padding: '9px 14px', borderRadius: 4, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && !showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e, #1c1812)',
          border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6,
          padding: '36px 20px', textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>▶</div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898', marginBottom: 8 }}>No channels yet</p>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#907848', marginBottom: 20 }}>
            Share a YouTube channel the community should check out.
          </p>
          {userId && (
            <button onClick={openForm} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7.5, background: 'linear-gradient(135deg, #ef4444, #c82020)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 4, cursor: 'pointer' }}>
              + Be the First
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {channels.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20, marginBottom: 8 }}>
          {channels.map(ch => (
            <YoutubeChannelCard
              key={ch.id}
              channel={ch}
              isAdmin={isAdmin}
              isOwn={ch.user.id === userId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
