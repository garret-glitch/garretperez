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

const inputCss: React.CSSProperties = {
  width: '100%',
  background: '#0e0c0a',
  border: '1px solid #3a2a18',
  borderRadius: 4,
  padding: '9px 12px',
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: 13,
  color: '#e8d8b0',
  outline: 'none',
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

export default function BusinessCardsSection({
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
  const [, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(() => blankForm(myCard))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function openForm() { setForm(blankForm(myCard)); setError(''); setShowForm(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/business-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error || 'Failed to save.') }
      else { setShowForm(false); startTransition(() => router.refresh()) }
    } catch { setError('Network error.') }
    finally { setSaving(false) }
  }

  async function handleDeleteOwn() {
    if (!confirm('Remove your card from the directory?')) return
    setSaving(true)
    try { await fetch('/api/business-cards', { method: 'DELETE' }); startTransition(() => router.refresh()) }
    finally { setSaving(false) }
  }

  async function handleAdminDelete(id: string) {
    if (!confirm('Remove this card?')) return
    try { await fetch(`/api/admin/business-cards/${id}`, { method: 'DELETE' }); startTransition(() => router.refresh()) }
    catch { /* ignore */ }
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
        borderRadius: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #c89b3c70, transparent)' }} />
        <div>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898' }}>
            ⚜ Guild Directory
          </span>
          <span style={{
            marginLeft: 10, fontFamily: "'Press Start 2P', monospace", fontSize: 5.5,
            color: '#c89b3c', background: 'rgba(200,155,60,0.1)',
            border: '1px solid rgba(200,155,60,0.3)', padding: '2px 8px', borderRadius: 2,
          }}>
            {cards.length} {cards.length === 1 ? 'MEMBER' : 'MEMBERS'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {userId && !myCard && (
            <button
              onClick={openForm}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                color: '#0e0c08', border: 'none', padding: '8px 14px',
                borderRadius: 4, cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(200,155,60,0.3)',
              }}
            >
              + Add My Card
            </button>
          )}
          {userId && myCard && !showForm && (
            <>
              <button
                onClick={openForm}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  background: 'rgba(200,155,60,0.1)', color: '#c89b3c',
                  border: '1px solid rgba(200,155,60,0.35)', padding: '7px 12px',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                ✏ Edit
              </button>
              <button
                onClick={handleDeleteOwn}
                disabled={saving}
                style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                  background: 'rgba(90,20,20,0.15)', color: '#7a3030',
                  border: '1px solid rgba(90,20,20,0.3)', padding: '7px 10px',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                🗑
              </button>
            </>
          )}
          {!userId && (
            <a
              href="/login"
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                color: '#0e0c08', padding: '8px 14px', borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              Login to Add Card
            </a>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e, #1c1812)',
          border: `1px solid ${ac}40`,
          borderRadius: 6, padding: '20px 20px 18px', marginBottom: 16,
          boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${ac}15`,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${ac}, transparent)` }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898' }}>
              {myCard ? '✏ Edit Card' : '+ Create Card'}
            </span>
            <button onClick={() => setShowForm(false)} style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#907848', background: 'transparent', border: '1px solid #3a2a18', padding: '4px 9px', borderRadius: 3, cursor: 'pointer' }}>✕</button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
              <Field label="Name *">
                <input value={form.name} onChange={set('name')} maxLength={60} placeholder="Your full name" required style={inputCss} />
              </Field>
              <Field label="Job Title">
                <input value={form.title} onChange={set('title')} maxLength={80} placeholder="Sales Director, Developer…" style={inputCss} />
              </Field>
              <Field label="Company">
                <input value={form.company} onChange={set('company')} maxLength={80} placeholder="Company or Organization" style={inputCss} />
              </Field>
              <Field label="Email">
                <input value={form.email} onChange={set('email')} maxLength={120} placeholder="you@example.com" type="email" style={inputCss} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={set('phone')} maxLength={30} placeholder="(555) 123-4567" type="tel" style={inputCss} />
              </Field>
              <Field label="LinkedIn">
                <input value={form.linkedin} onChange={set('linkedin')} maxLength={100} placeholder="linkedin.com/in/yourname" style={inputCss} />
              </Field>
              <Field label="Website">
                <input value={form.website} onChange={set('website')} maxLength={120} placeholder="yoursite.com" style={inputCss} />
              </Field>
              <Field label="Tagline">
                <input value={form.tagline} onChange={set('tagline')} maxLength={100} placeholder="One sentence that defines you" style={inputCss} />
              </Field>
            </div>

            {/* Color picker */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: '#907848', display: 'block', marginBottom: 8 }}>Accent Color</label>
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
                <BusinessCardDisplay
                  card={{
                    id: 'preview', ...form,
                    title: form.title || null, company: form.company || null,
                    email: form.email || null, phone: form.phone || null,
                    linkedin: form.linkedin || null, website: form.website || null,
                    tagline: form.tagline || null,
                    createdAt: new Date().toISOString(),
                    user: { id: '', username: 'you', level: 1 },
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
                  opacity: saving ? 0.6 : 1,
                  boxShadow: `0 2px 10px ${ac}40`,
                }}
              >
                {saving ? 'Saving…' : myCard ? 'Save Changes' : 'Add to Directory'}
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
      {cards.length === 0 && !showForm && (
        <div style={{
          background: 'linear-gradient(140deg, #12100e, #1c1812)',
          border: '1px solid rgba(200,155,60,0.15)', borderRadius: 6,
          padding: '36px 20px', textAlign: 'center', marginBottom: 16,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚜</div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: '#f0d898', marginBottom: 8 }}>No cards yet</p>
          <p style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, color: '#907848', marginBottom: 20 }}>
            Be the first to add your card to the Cool People directory.
          </p>
          {userId && (
            <button
              onClick={openForm}
              style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7.5,
                background: 'linear-gradient(135deg, #c89b3c, #a07828)',
                color: '#0e0c08', border: 'none', padding: '10px 18px',
                borderRadius: 4, cursor: 'pointer',
              }}
            >
              + Be the First
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {cards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20, marginBottom: 8 }}>
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
      )}
    </div>
  )
}
