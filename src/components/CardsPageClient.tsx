'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import BusinessCardDisplay, { type CardData } from './BusinessCardDisplay'

const ACCENT_COLORS = [
  { value: '#c89b3c', label: 'Gold' },
  { value: '#6b9edb', label: 'Sapphire' },
  { value: '#8b5cf6', label: 'Amethyst' },
  { value: '#22c55e', label: 'Emerald' },
  { value: '#ef4444', label: 'Ruby' },
  { value: '#f97316', label: 'Amber' },
]

interface FormState {
  name: string
  title: string
  company: string
  email: string
  phone: string
  linkedin: string
  website: string
  tagline: string
  accentColor: string
}

function blankForm(card?: CardData | null): FormState {
  return {
    name: card?.name ?? '',
    title: card?.title ?? '',
    company: card?.company ?? '',
    email: card?.email ?? '',
    phone: card?.phone ?? '',
    linkedin: card?.linkedin ?? '',
    website: card?.website ?? '',
    tagline: card?.tagline ?? '',
    accentColor: card?.accentColor ?? '#c89b3c',
  }
}

function inputStyle() {
  return {
    width: '100%',
    background: '#0e0c0a',
    border: `1px solid #3a2a18`,
    borderRadius: 4,
    padding: '9px 12px',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    color: '#e8d8b0',
    outline: 'none',
    transition: 'border-color 0.15s',
  } as React.CSSProperties
}

function labelStyle() {
  return {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6.5,
    color: '#907848',
    display: 'block',
    marginBottom: 6,
    letterSpacing: '0.04em',
  } as React.CSSProperties
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <label style={labelStyle()}>{label}</label>
      {children}
    </div>
  )
}

export default function CardsPageClient({
  cards,
  myCard,
  userId,
  isAdmin,
}: {
  cards: CardData[]
  myCard: CardData | null
  userId: string | null
  isAdmin: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(() => blankForm(myCard))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [, setDeletingId] = useState<string | null>(null)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  function openForm() {
    setForm(blankForm(myCard))
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error || 'Failed to save.')
      } else {
        setShowForm(false)
        startTransition(() => router.refresh())
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteOwn() {
    if (!confirm('Remove your card from the directory?')) return
    setSaving(true)
    try {
      await fetch('/api/business-cards', { method: 'DELETE' })
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
    }
  }

  async function handleAdminDelete(id: string) {
    if (!confirm('Remove this card?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/admin/business-cards/${id}`, { method: 'DELETE' })
      startTransition(() => router.refresh())
    } finally {
      setDeletingId(null)
    }
  }

  const ac = form.accentColor

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Page header ── */}
      <div style={{
        background: 'linear-gradient(140deg, #12100e 0%, #1c1812 60%, #161210 100%)',
        border: '1px solid rgba(200,155,60,0.25)',
        borderRadius: 8,
        padding: '28px 28px 24px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        {/* Subtle grid bg */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.018, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(#c89b3c 1px, transparent 1px), linear-gradient(90deg, #c89b3c 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, transparent 0%, #c89b3c 30%, #c89b3c 70%, transparent 100%)',
        }} />

        <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 20, justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 14,
              color: '#f0d898', margin: '0 0 10px', lineHeight: 1.4,
            }}>
              ⚜ Guild Directory
            </h1>
            <p style={{
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14,
              color: '#907848', margin: 0, lineHeight: 1.7,
            }}>
              The people behind the community — one card each, built to impress.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <span style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                color: '#c89b3c', background: 'rgba(200,155,60,0.1)',
                border: '1px solid rgba(200,155,60,0.3)', padding: '4px 10px', borderRadius: 3,
              }}>
                {cards.length} {cards.length === 1 ? 'MEMBER' : 'MEMBERS'}
              </span>
              {myCard && (
                <span style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 6,
                  color: '#22c55e', background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.3)', padding: '4px 10px', borderRadius: 3,
                }}>
                  ★ IN DIRECTORY
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          {userId && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!myCard ? (
                <button
                  onClick={openForm}
                  style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
                    background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                    color: '#0e0c08', border: 'none', padding: '10px 18px',
                    borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: '0 2px 12px rgba(200,155,60,0.35)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = '' }}
                >
                  + Add My Card
                </button>
              ) : (
                <>
                  <button
                    onClick={openForm}
                    style={{
                      fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                      background: 'rgba(200,155,60,0.12)', color: '#c89b3c',
                      border: '1px solid rgba(200,155,60,0.4)', padding: '9px 14px',
                      borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,155,60,0.2)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,155,60,0.12)' }}
                  >
                    ✏ Edit Card
                  </button>
                  <button
                    onClick={handleDeleteOwn}
                    disabled={saving}
                    style={{
                      fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                      background: 'rgba(122,32,32,0.15)', color: '#7a3030',
                      border: '1px solid rgba(122,32,32,0.35)', padding: '9px 12px',
                      borderRadius: 4, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#7a3030' }}
                  >
                    🗑 Remove
                  </button>
                </>
              )}
            </div>
          )}

          {!userId && (
            <a
              href="/login"
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
                background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                color: '#0e0c08', padding: '10px 18px', borderRadius: 4,
                textDecoration: 'none', boxShadow: '0 2px 12px rgba(200,155,60,0.35)',
                transition: 'all 0.15s', display: 'inline-block',
              }}
            >
              Join to Add Your Card
            </a>
          )}
        </div>
      </div>

      {/* ── Form ── */}
      {showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e 0%, #1c1812 100%)',
          border: `1px solid ${ac}40`,
          borderRadius: 8,
          padding: '28px 28px 24px',
          marginBottom: 32,
          boxShadow: `0 4px 28px rgba(0,0,0,0.6), 0 0 0 1px ${ac}18`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${ac}, transparent)`,
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f0d898', margin: 0 }}>
              {myCard ? '✏ Edit Your Card' : '+ Create Your Card'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                color: '#907848', background: 'transparent',
                border: '1px solid #3a2a18', padding: '5px 10px',
                borderRadius: 3, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
              <FieldRow label="Name *">
                <input value={form.name} onChange={set('name')} maxLength={60} placeholder="Your full name" required style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Job Title">
                <input value={form.title} onChange={set('title')} maxLength={80} placeholder="Sales Director, Developer…" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Company">
                <input value={form.company} onChange={set('company')} maxLength={80} placeholder="Company or Organization" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Email">
                <input value={form.email} onChange={set('email')} maxLength={120} placeholder="you@example.com" type="email" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Phone">
                <input value={form.phone} onChange={set('phone')} maxLength={30} placeholder="(555) 123-4567" type="tel" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="LinkedIn">
                <input value={form.linkedin} onChange={set('linkedin')} maxLength={100} placeholder="linkedin.com/in/yourname" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Website">
                <input value={form.website} onChange={set('website')} maxLength={120} placeholder="yoursite.com" style={inputStyle()} />
              </FieldRow>
              <FieldRow label="Tagline">
                <input value={form.tagline} onChange={set('tagline')} maxLength={100} placeholder="One sentence that defines you" style={inputStyle()} />
              </FieldRow>
            </div>

            {/* Accent color picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle()}>Card Accent Color</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm(f => ({ ...f, accentColor: c.value }))}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                      background: c.value,
                      border: form.accentColor === c.value
                        ? `3px solid #f0d898`
                        : '3px solid transparent',
                      boxShadow: form.accentColor === c.value
                        ? `0 0 0 2px ${c.value}, 0 2px 8px rgba(0,0,0,0.4)`
                        : '0 2px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.15s',
                      transform: form.accentColor === c.value ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle()}>Preview</label>
              <div style={{ maxWidth: 340 }}>
                <BusinessCardDisplay
                  card={{
                    id: 'preview',
                    ...form,
                    title: form.title || null,
                    company: form.company || null,
                    email: form.email || null,
                    phone: form.phone || null,
                    linkedin: form.linkedin || null,
                    website: form.website || null,
                    tagline: form.tagline || null,
                    createdAt: new Date().toISOString(),
                    user: { id: '', username: 'you', level: 1 },
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                color: '#ef4444', marginBottom: 14,
              }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
                  background: `linear-gradient(135deg, ${ac}, ${ac}bb)`,
                  color: '#0e0c08', border: 'none', padding: '10px 20px',
                  borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, transition: 'all 0.15s',
                  boxShadow: `0 2px 12px ${ac}40`,
                }}
              >
                {saving ? 'Saving…' : myCard ? 'Save Changes' : 'Add to Directory'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
                  background: 'transparent', color: '#907848',
                  border: '1px solid #3a2a18', padding: '10px 16px',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── No cards yet ── */}
      {cards.length === 0 && !showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e, #1c1812)',
          border: '1px solid rgba(200,155,60,0.2)',
          borderRadius: 8, padding: '48px 28px', textAlign: 'center',
          marginBottom: 32,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚜</div>
          <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#f0d898', marginBottom: 12 }}>
            No cards yet
          </h2>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#907848', maxWidth: 400, margin: '0 auto 24px' }}>
            Be the first to add your card to the Guild Directory. Show the community who you are.
          </p>
          {userId && (
            <button
              onClick={openForm}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                color: '#0e0c08', border: 'none', padding: '12px 22px',
                borderRadius: 4, cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(200,155,60,0.35)',
              }}
            >
              + Be the First
            </button>
          )}
        </div>
      )}

      {/* ── Cards grid ── */}
      {cards.length > 0 && (
        <>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 6.5,
            color: '#504030', marginBottom: 16, letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            ⚔ {cards.length} Guild {cards.length === 1 ? 'Member' : 'Members'}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {cards.map((card, idx) => (
              <BusinessCardDisplay
                key={card.id}
                card={card}
                memberNum={idx + 1}
                isAdmin={isAdmin}
                isOwnCard={card.user.id === userId}
                onDelete={isAdmin ? handleAdminDelete : undefined}
              />
            ))}
          </div>
        </>
      )}

      {/* Pending overlay */}
      {isPending && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#c89b3c',
        }}>
          Updating…
        </div>
      )}
    </div>
  )
}
