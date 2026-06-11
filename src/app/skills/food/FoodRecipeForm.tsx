'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { emitXpGained } from '@/components/XpToast'

const S = {
  bg:       '#0e0a08',
  card:     '#16120e',
  elevated: '#1c1610',
  border:   'rgba(200,155,60,0.22)',
  gold:     '#c89b3c',
  text1:    '#f0e8d8',
  text2:    '#b8986c',
  text3:    '#7a5e3c',
  label:    '#6a4e28',
}

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%',
  background: S.elevated,
  border: `1px solid ${S.border}`,
  color: S.text1, padding: '14px 16px',
  fontFamily: 'Inter, sans-serif', fontSize: 15,
  lineHeight: 1.5,
}

export default function FoodRecipeForm() {
  const router = useRouter()
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [ingredients,  setIngredients]  = useState('')
  const [instructions, setInstructions] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [msg,    setMsg]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !ingredients.trim() || !instructions.trim()) return
    setStatus('submitting')
    const res = await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:        title.trim(),
        description:  description.trim(),
        ingredients:  ingredients.split('\n').filter(l => l.trim()),
        instructions: instructions.trim(),
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const xp = data.xpAwarded ?? 50
      emitXpGained(xp)
      setTitle(''); setDescription(''); setIngredients(''); setInstructions('')
      setStatus('success'); setMsg(`+${xp} Food & Wine XP earned!`)
      router.refresh()
      setTimeout(() => { setStatus('idle'); setMsg('') }, 5000)
    } else if (res.status === 401) {
      setStatus('error'); setMsg('You must be logged in to add recipes.')
    } else {
      setStatus('error'); setMsg('Something went wrong. Try again.')
    }
  }

  const canSubmit = title.trim() && ingredients.trim() && instructions.trim()
  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{
      display: 'block', fontFamily: 'Inter, sans-serif', fontSize: 11,
      fontWeight: 700, color: S.label, textTransform: 'uppercase',
      letterSpacing: '0.1em', marginBottom: 8,
    }}>
      {children}
    </label>
  )

  return (
    <div style={{ background: S.card, border: `1px solid ${S.border}`, padding: '28px 28px 24px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: S.gold, letterSpacing: '0.08em', marginBottom: 8 }}>
            ✨ SHARE A RECIPE
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: S.text3, lineHeight: 1.5 }}>
            Share your favorites with the community and earn XP
          </div>
        </div>
        <div style={{
          background: 'rgba(200,155,60,0.08)', border: `1px solid rgba(200,155,60,0.3)`,
          padding: '8px 14px', flexShrink: 0,
          fontFamily: "'Press Start 2P', monospace", fontSize: 9,
          color: S.gold, letterSpacing: '0.06em',
        }}>
          +50 XP
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Recipe Name */}
          <div>
            <Label>Recipe Name <span style={{ color: '#c84040' }}>*</span></Label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Garret's Famous BBQ Brisket"
              maxLength={120}
              disabled={status === 'submitting'}
              className="food-input"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <Label>
              Description{' '}
              <span style={{ fontWeight: 400, color: '#4a3820', textTransform: 'none', letterSpacing: 0 }}>
                (optional)
              </span>
            </Label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="A short description of the dish..."
              maxLength={200}
              disabled={status === 'submitting'}
              className="food-input"
              style={inputStyle}
            />
          </div>

          {/* Ingredients + Instructions side by side */}
          <div className="food-form-grid">
            <div>
              <Label>
                Ingredients <span style={{ color: '#c84040' }}>*</span>
                <span style={{ fontWeight: 400, color: '#4a3820', textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  one per line
                </span>
              </Label>
              <textarea
                value={ingredients}
                onChange={e => setIngredients(e.target.value)}
                placeholder={'2 cups flour\n1 tsp salt\n1 lb ground beef\n...'}
                rows={8}
                disabled={status === 'submitting'}
                className="food-input"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <div>
              <Label>Instructions <span style={{ color: '#c84040' }}>*</span></Label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="Step-by-step instructions..."
                rows={8}
                disabled={status === 'submitting'}
                className="food-input"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Submit row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              type="submit"
              disabled={status === 'submitting' || !canSubmit}
              style={{
                flex: 1, padding: '16px 24px',
                background: status === 'submitting' || !canSubmit
                  ? 'rgba(200,155,60,0.2)'
                  : 'linear-gradient(135deg, #c89b3c 0%, #a07828 100%)',
                border: 'none',
                color: status === 'submitting' || !canSubmit ? 'rgba(200,155,60,0.45)' : '#0a0600',
                fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700,
                cursor: status === 'submitting' || !canSubmit ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s', letterSpacing: '0.01em',
              }}
            >
              {status === 'submitting' ? 'Adding Recipe...' : '🍴 Add Recipe (+50 XP)'}
            </button>
            {msg && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: status === 'error' ? '#c04040' : '#60a060', whiteSpace: 'nowrap' }}>
                {msg}
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
